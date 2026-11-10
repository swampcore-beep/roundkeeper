// Roundkeeper. Copyright (C) 2026 swampcore-beep. Licensed under the GNU AGPL v3 or later; see LICENSE.
// Source: https://github.com/swampcore-beep/roundkeeper
//
// 5e.tools bestiary for the DM's monster search.
//
// The DM puts a 5etools folder next to the app with
//   - the 5etools zip from GitHub (official monsters, read straight from the zip), and/or
//   - the backup the site exports (5etools.json: the homebrew loaded in the browser), and/or
//   - homebrew .json files saved from the Homebrew Builder.
//
// Nothing here is part of the app: the files are only read on the laptop, and only the
// laptop (127.0.0.1) can search them. The tablet and the phones never see this data.
package main

import (
	"archive/zip"
	"bytes"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
)

type fetMon struct {
	raw    json.RawMessage
	name   string
	source string
	label  string // what the DM sees: XMM, or the homebrew's full name
	group  string // off, own, hb
	cr     string
	typ    string
}

type fetDB struct {
	mons      []fetMon
	byKey     map[string]int
	templates map[string]json.RawMessage
	index     []byte
	files     []string
	counts    map[string]int
	refs      map[string]json.RawMessage // spells, conditions, items… by "type|name|source"
	refLabel  map[string]string
	refSrc    map[string][]string // "type|name" -> sources, in the order they were read
	refNames  map[string]map[string]bool
	refGroup  map[string]string          // off, own, hb
	spellCls  map[string]string          // "name|source" -> class letters (B C D P R S K W A)
	spellOld  map[string]string          // the same by the 2014 class lists
	lgroups   map[string]json.RawMessage // legendary groups: lair actions and regional effects
	spells    []byte                     // the spell list the phones get
	refIndex  []byte                     // every rule, spell, item… by name, for Ctrl+K
	pcCls     map[string]map[string]any  // classes: only their tables, for a phone's own trackers
	pcSub     map[string]map[string]any  // subclasses: the same
	pcData    []byte
	fluff     map[string]json.RawMessage // a monster's lore and pictures
	imgs      map[string][2]string       // a picture's path → [zip, member] or ["", file]
	imgSrc    []string
	srdAlias  map[string]bool // "type|name" the SRD uses for something the DM's files call differently
}

// what a statblock can point at, and the books to prefer when it doesn't say which
var fetRefTypes = []string{"spell", "condition", "disease", "status", "item", "baseitem", "action", "variantrule", "sense", "skill",
	"feat", "optionalfeature", "background", "race", "trap", "hazard", "name"}
var fetRefFiles = []string{"conditionsdiseases.json", "actions.json", "items.json", "items-base.json", "variantrules.json", "senses.json", "skills.json",
	"feats.json", "optionalfeatures.json", "backgrounds.json", "races.json", "trapshazards.json", "names.json"}
var fetSpellClass = map[string]string{"bard": "B", "cleric": "C", "druid": "D", "paladin": "P", "ranger": "R", "sorcerer": "S", "warlock": "K", "wizard": "W", "artificer": "A"}
var fetAreaTags = map[string]bool{"S": true, "C": true, "N": true, "Y": true, "L": true, "W": true, "H": true, "R": true, "Q": true}
var fetRefPref = map[string][]string{
	"spell": {"xphb", "phb"}, "condition": {"xphb", "phb"}, "status": {"xphb", "phb"}, "disease": {"xdmg", "dmg"},
	"item": {"xdmg", "dmg", "xphb", "phb"}, "baseitem": {"xphb", "phb"}, "action": {"xphb", "phb"},
	"variantrule": {"xphb", "phb", "xdmg", "dmg"}, "sense": {"xphb", "phb"}, "skill": {"xphb", "phb"},
	"feat": {"xphb", "phb"}, "optionalfeature": {"xphb", "phb"}, "background": {"xphb", "phb"}, "race": {"xphb", "phb"},
	"trap": {"xdmg", "dmg"}, "hazard": {"xphb", "xdmg", "dmg"},
}

func fetAddRefs(db *fetDB, b []byte, label func(string) string, group string) {
	var f map[string]json.RawMessage
	if json.Unmarshal(b, &f) != nil {
		return
	}
	for _, t := range fetRefTypes {
		var arr []json.RawMessage
		if raw, ok := f[t]; !ok || json.Unmarshal(raw, &arr) != nil {
			continue
		}
		for _, it := range arr {
			var x struct {
				Name, Source string
				Classes      json.RawMessage `json:"classes"`
				Srd52        json.RawMessage `json:"srd52"`
				Srd          json.RawMessage `json:"srd"`
			}
			if json.Unmarshal(it, &x) != nil || x.Name == "" {
				continue
			}
			k := t + "|" + fetKey(x.Name, x.Source)
			db.refGroup[k] = group
			if t == "spell" && len(x.Classes) > 0 { // homebrew names its classes in the spell itself
				var c struct {
					From []struct{ Name string } `json:"fromClassList"`
				}
				if json.Unmarshal(x.Classes, &c) == nil {
					l := ""
					for _, cl := range c.From {
						l += fetSpellClass[strings.ToLower(cl.Name)]
					}
					if l != "" {
						db.spellCls[fetKey(x.Name, x.Source)] = l
					}
				}
			}
			if _, seen := db.refs[k]; !seen {
				nk := t + "|" + strings.ToLower(strings.TrimSpace(x.Name))
				db.refSrc[nk] = append(db.refSrc[nk], strings.ToLower(x.Source))
			}
			db.refs[k] = it
			db.refLabel[k] = label(x.Source)
			if group != "hb" && (t == "spell" || t == "condition") {
				db.refNames[t][x.Name] = true
			}
			var alias string // the name the SRD gives it: Melf's Acid Arrow is Acid Arrow there
			if json.Unmarshal(x.Srd52, &alias) != nil || alias == "" {
				json.Unmarshal(x.Srd, &alias)
			}
			if group == "off" && alias != "" {
				tt := t
				if t == "baseitem" {
					tt = "item"
				}
				if db.srdAlias == nil {
					db.srdAlias = map[string]bool{}
				}
				db.srdAlias[tt+"|"+strings.ToLower(strings.TrimSpace(alias))] = true
			}
		}
	}
}

// classes and subclasses: only their tables (slots, Rages, Focus Points…), for a phone's own trackers
func fetPCTables(raw json.RawMessage) []map[string]any {
	var groups []struct {
		Title string            `json:"title"`
		Cols  []json.RawMessage `json:"colLabels"`
		Rows  json.RawMessage   `json:"rows"`
		RowsS json.RawMessage   `json:"rowsSpellProgression"`
	}
	out := []map[string]any{}
	if json.Unmarshal(raw, &groups) != nil {
		return out
	}
	for _, g := range groups {
		rows, sp := g.Rows, 0
		if len(g.RowsS) > 0 && string(g.RowsS) != "null" {
			rows, sp = g.RowsS, 1
		}
		var arr []json.RawMessage
		if g.Cols == nil || json.Unmarshal(rows, &arr) != nil || arr == nil {
			continue
		}
		out = append(out, map[string]any{"t": g.Title, "c": g.Cols, "r": json.RawMessage(rows), "sp": sp})
	}
	return out
}

func fetAddPC(db *fetDB, b []byte, label func(string) string, group string) {
	var f struct {
		Class    []json.RawMessage `json:"class"`
		Subclass []json.RawMessage `json:"subclass"`
	}
	if json.Unmarshal(b, &f) != nil {
		return
	}
	for _, raw := range f.Class {
		var c struct {
			Name, Source string
			Sidekick     bool                 `json:"isSidekick"`
			HD           *struct{ Faces int } `json:"hd"`
			CP           any                  `json:"casterProgression"`
			TG           json.RawMessage      `json:"classTableGroups"`
		}
		if json.Unmarshal(raw, &c) != nil || c.Name == "" || c.Sidekick {
			continue
		}
		var hd any
		if c.HD != nil && c.HD.Faces > 0 {
			hd = c.HD.Faces
		}
		cp := c.CP
		if cp == nil {
			cp = ""
		}
		var re any
		if n, s, ok := fetReprintOf(raw); ok {
			re = []string{n, s}
		}
		db.pcCls[fetKey(c.Name, c.Source)] = map[string]any{"n": c.Name, "s": c.Source, "l": label(c.Source), "g": group, "hd": hd, "cp": cp, "tb": fetPCTables(c.TG), "re": re}
	}
	for _, raw := range f.Subclass {
		var c struct {
			Name, Source, ShortName, ClassName, ClassSource string
			CP                                              any             `json:"casterProgression"`
			TG                                              json.RawMessage `json:"subclassTableGroups"`
			AS                                              json.RawMessage `json:"additionalSpells"`
		}
		if json.Unmarshal(raw, &c) != nil || c.Name == "" {
			continue
		}
		sn := c.ShortName
		if sn == "" {
			sn = c.Name
		}
		cp := c.CP
		if cp == nil {
			cp = ""
		}
		db.pcSub[fetKey(c.ClassName+"|"+c.ClassSource+"|"+c.Name, c.Source)] = map[string]any{"n": c.Name, "sn": sn, "s": c.Source, "l": label(c.Source), "g": group,
			"cn": c.ClassName, "cs": c.ClassSource, "cp": cp, "tb": fetPCTables(c.TG), "as": fetAlwaysSpells(c.AS)}
	}
}

// 81: the spells a subclass or feat keeps always prepared, as [level, name, source]; "_" means from the start.
// Spell lists a player only may choose from ("expanded") are not these.
func fetAlwaysSpells(raw json.RawMessage) [][]any {
	out := [][]any{}
	var list []map[string]json.RawMessage
	if len(raw) == 0 || json.Unmarshal(raw, &list) != nil || len(list) == 0 {
		return out
	}
	seen := map[string]bool{}
	var walk func(lvl int, v any)
	walk = func(lvl int, v any) {
		switch x := v.(type) {
		case string:
			n, src := x, ""
			if i := strings.Index(n, "#"); i >= 0 {
				n = n[:i]
			}
			if i := strings.Index(n, "|"); i >= 0 {
				n, src = n[:i], n[i+1:]
			}
			n = strings.TrimSpace(n)
			if n != "" && !seen[strings.ToLower(n)] {
				seen[strings.ToLower(n)] = true
				out = append(out, []any{lvl, n, strings.ToUpper(src)})
			}
		case []any:
			for _, y := range x {
				walk(lvl, y)
			}
		case map[string]any:
			if _, ch := x["choose"]; ch {
				return
			}
			for _, y := range x {
				walk(lvl, y)
			}
		}
	}
	for _, key := range []string{"prepared", "innate"} {
		var m map[string]any
		if json.Unmarshal(list[0][key], &m) != nil {
			continue
		}
		for k, v := range m {
			lvl := 1
			if n, err := strconv.Atoi(strings.TrimPrefix(k, "s")); err == nil && n > 0 {
				lvl = n
			}
			walk(lvl, v)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i][0].(int) != out[j][0].(int) {
			return out[i][0].(int) < out[j][0].(int)
		}
		return out[i][1].(string) < out[j][1].(string)
	})
	return out
}

// what a phone may read to build its trackers: class tables, and the names of feats and class options
func fetBuildPC(db *fetDB, sig string) {
	feats := [][]any{}
	for k, raw := range db.refs {
		t := k[:strings.Index(k, "|")]
		if t != "feat" && t != "optionalfeature" {
			continue
		}
		var x struct {
			Name, Source, Category string
			FT                     []any           `json:"featureType"`
			AS                     json.RawMessage `json:"additionalSpells"`
		}
		json.Unmarshal(raw, &x)
		ft := x.Category
		if t == "optionalfeature" {
			p := []string{}
			for _, v := range x.FT {
				p = append(p, fmt.Sprint(v))
			}
			ft = strings.Join(p, ",")
		}
		old := 0
		if n, s, ok := fetReprintOf(raw); ok {
			if _, ok := db.refs[t+"|"+fetKey(n, s)]; ok {
				old = 1
			}
		}
		g := db.refGroup[k]
		if g == "" {
			g = "off"
		}
		var as any
		if t == "feat" {
			if a := fetAlwaysSpells(x.AS); len(a) > 0 {
				as = a
			}
		}
		feats = append(feats, []any{t, x.Name, x.Source, db.refLabel[k], ft, g, old, as})
	}
	sort.Slice(feats, func(i, j int) bool {
		a, b := strings.ToLower(feats[i][1].(string)), strings.ToLower(feats[j][1].(string))
		if a != b {
			return a < b
		}
		return feats[i][6].(int) < feats[j][6].(int)
	})
	cls := []map[string]any{}
	for _, c := range db.pcCls {
		cls = append(cls, c)
	}
	sort.Slice(cls, func(i, j int) bool {
		a, b := strings.ToLower(cls[i]["n"].(string)), strings.ToLower(cls[j]["n"].(string))
		if a != b {
			return a < b
		}
		return cls[i]["s"].(string) < cls[j]["s"].(string)
	})
	sub := []map[string]any{}
	for _, c := range db.pcSub {
		sub = append(sub, c)
	}
	sort.Slice(sub, func(i, j int) bool {
		a, b := strings.ToLower(sub[i]["cn"].(string)), strings.ToLower(sub[j]["cn"].(string))
		if a != b {
			return a < b
		}
		a, b = strings.ToLower(sub[i]["n"].(string)), strings.ToLower(sub[j]["n"].(string))
		if a != b {
			return a < b
		}
		return sub[i]["s"].(string) < sub[j]["s"].(string)
	})
	db.pcData = encode(map[string]any{"sig": sig, "cls": cls, "sub": sub, "feats": feats})
}

// legendary groups: a boss's lair actions and regional effects
func fetAddLGroups(db *fetDB, b []byte) {
	var f struct {
		G []json.RawMessage `json:"legendaryGroup"`
	}
	if json.Unmarshal(b, &f) != nil {
		return
	}
	for _, g := range f.G {
		var x struct{ Name, Source string }
		if json.Unmarshal(g, &x) == nil && x.Name != "" {
			db.lgroups[fetKey(x.Name, x.Source)] = g
		}
	}
}

// spells/sources.json: which classes have each spell on their list
func fetAddSpellSources(db *fetDB, b []byte) {
	var f map[string]map[string]struct {
		Class   []struct{ Name, Source string } `json:"class"`
		Variant []struct{ Name, Source string } `json:"classVariant"` // Tasha's expanded lists
	}
	if json.Unmarshal(b, &f) != nil {
		return
	}
	for src, spells := range f {
		for name, v := range spells {
			set, old := map[string]bool{}, map[string]bool{}
			for _, c := range append(v.Class, v.Variant...) {
				if l := fetSpellClass[strings.ToLower(c.Name)]; l != "" {
					set[l] = true
					if !strings.EqualFold(c.Source, "xphb") { // the 2014 class lists: all but the 2024 Player's Handbook classes
						old[l] = true
					}
				}
			}
			ol := []string{}
			for l := range old {
				ol = append(ol, l)
			}
			sort.Strings(ol)
			db.spellOld[fetKey(name, src)] = strings.Join(ol, "")
			ls := []string{}
			for l := range set {
				ls = append(ls, l)
			}
			sort.Strings(ls)
			if len(ls) > 0 {
				db.spellCls[fetKey(name, src)] = strings.Join(ls, "")
			}
		}
	}
}

func plural(n int, w string) string {
	if n == 1 {
		return strconv.Itoa(n) + " " + w
	}
	return strconv.Itoa(n) + " " + w + "s"
}

// "1 min" and concentration, the way the app writes durations
func fetSpellDur(raw json.RawMessage) (string, bool, []string, bool, int) {
	var sp struct {
		Level    json.RawMessage `json:"level"`
		Duration []struct {
			Type     string `json:"type"`
			Conc     bool   `json:"concentration"`
			Duration struct {
				Type   string `json:"type"`
				Amount *int   `json:"amount"`
			} `json:"duration"`
		} `json:"duration"`
		Area []string `json:"areaTags"`
		Meta struct {
			Ritual bool `json:"ritual"`
		} `json:"meta"`
	}
	json.Unmarshal(raw, &sp)
	conc := false
	for _, d := range sp.Duration {
		conc = conc || d.Conc
	}
	lvl := 0
	json.Unmarshal(sp.Level, &lvl)
	txt := "Instant"
	if len(sp.Duration) > 0 {
		d := sp.Duration[0]
		switch d.Type {
		case "timed":
			n := 1
			if d.Duration.Amount != nil {
				n = *d.Duration.Amount
			}
			switch d.Duration.Type {
			case "minute":
				txt = strconv.Itoa(n) + " min"
			case "hour":
				txt = strconv.Itoa(n) + " h"
			case "round", "day", "turn", "week", "year":
				txt = plural(n, d.Duration.Type)
			default:
				txt = strconv.Itoa(n) + " " + d.Duration.Type
			}
		case "permanent":
			txt = "Until dispelled"
		case "special":
			txt = "Special"
		}
	}
	return txt, conc, sp.Area, sp.Meta.Ritual, lvl
}

func b01(b bool) int {
	if b {
		return 1
	}
	return 0
}

// the spell list the phones get: name, level, concentration, battlefield, duration, classes, book. Nothing else.
func fetBuildSpells(db *fetDB, sig string) {
	rows := [][]any{}
	for k, raw := range db.refs {
		if !strings.HasPrefix(k, "spell|") {
			continue
		}
		var x struct{ Name, Source string }
		json.Unmarshal(raw, &x)
		dur, conc, area, ritual, lvl := fetSpellDur(raw)
		ar := false
		if dur != "Instant" {
			for _, a := range area {
				ar = ar || fetAreaTags[a]
			}
		}
		old := 0
		if n, s, ok := fetReprintOf(raw); ok {
			if _, ok := db.refs["spell|"+fetKey(n, s)]; ok {
				old = 1
			}
		}
		g := db.refGroup[k]
		if g == "" {
			g = "off"
		}
		cls := db.spellCls[fetKey(x.Name, x.Source)]
		cls14, ok := db.spellOld[fetKey(x.Name, x.Source)]
		if !ok {
			cls14 = cls
		}
		rows = append(rows, []any{x.Name, lvl, b01(conc), b01(ar), dur, cls, db.refLabel[k], x.Source, g, old, b01(ritual), cls14})
	}
	sort.Slice(rows, func(i, j int) bool {
		a, b := rows[i], rows[j]
		if a[1].(int) != b[1].(int) {
			return a[1].(int) < b[1].(int)
		}
		an, bn := strings.ToLower(a[0].(string)), strings.ToLower(b[0].(string))
		if an != bn {
			return an < bn
		}
		if a[9].(int) != b[9].(int) {
			return a[9].(int) < b[9].(int)
		}
		return a[7].(string) < b[7].(string)
	})
	db.spells = encode(map[string]any{"sig": sig, "list": rows})
}

// every rule, spell, item… by name, for the DM's Ctrl+K search
func fetBuildRefIndex(db *fetDB, sig string) {
	rows := [][]any{}
	for k, raw := range db.refs {
		t := k[:strings.Index(k, "|")]
		var x struct{ Name, Source string }
		json.Unmarshal(raw, &x)
		old := 0
		if n, s, ok := fetReprintOf(raw); ok {
			types := []string{t}
			if t == "item" || t == "baseitem" {
				types = []string{t, "item", "baseitem"}
			}
			for _, tt := range types {
				if _, ok := db.refs[tt+"|"+fetKey(n, s)]; ok {
					old = 1
				}
			}
		}
		g := db.refGroup[k]
		if g == "" {
			g = "off"
		}
		rows = append(rows, []any{t, x.Name, x.Source, db.refLabel[k], old, g})
	}
	sort.Slice(rows, func(i, j int) bool { return rows[i][1].(string) < rows[j][1].(string) })
	db.refIndex = encode(map[string]any{"sig": sig, "list": rows})
}

// "Name|SOURCE" from 5e.tools' reprintedAs, which points at the newest printing (the 2024 books)
func fetReprintOf(raw json.RawMessage) (string, string, bool) {
	var x struct {
		Reprinted []json.RawMessage `json:"reprintedAs"`
	}
	if json.Unmarshal(raw, &x) != nil || len(x.Reprinted) == 0 {
		return "", "", false
	}
	var s string
	if json.Unmarshal(x.Reprinted[0], &s) != nil {
		var o struct {
			UID string `json:"uid"`
		}
		if json.Unmarshal(x.Reprinted[0], &o) != nil {
			return "", "", false
		}
		s = o.UID
	}
	parts := strings.Split(s, "|")
	if len(parts) < 2 {
		return "", "", false
	}
	return parts[0], parts[1], true
}

// we play the 2024 rules: a 2014 spell, condition or item opens as its reprint
func fetNewest(db *fetDB, raw json.RawMessage, ty string) (json.RawMessage, string) {
	for hop := 0; hop < 4; hop++ {
		n, s, ok := fetReprintOf(raw)
		if !ok {
			break
		}
		found := false
		for _, t := range []string{ty, "item", "baseitem"} {
			if r, ok := db.refs[t+"|"+fetKey(n, s)]; ok {
				raw, ty, found = r, t, true
				break
			}
			if ty != "item" && ty != "baseitem" {
				break
			}
		}
		if !found {
			break
		}
	}
	return raw, ty
}

// one spell, condition, item… The tag may name a book; if not, or if it isn't there, the core book wins
func fetRef(t, name, source string) ([]byte, string) {
	raw, ty := fetRefExact(t, name, source)
	if raw == nil {
		return nil, ""
	}
	fetMu.Lock()
	db := fetData
	fetMu.Unlock()
	return fetNewest(db, raw, ty)
}

func fetRefExact(t, name, source string) ([]byte, string) {
	fetMu.Lock()
	db := fetData
	fetMu.Unlock()
	if db == nil {
		return nil, ""
	}
	types := []string{t}
	switch t {
	case "item":
		types = []string{"item", "baseitem"}
	case "condition", "status":
		types = []string{t, "condition", "status", "disease"}
	}
	for _, ty := range types {
		if source != "" {
			k := ty + "|" + fetKey(name, source)
			if raw, ok := db.refs[k]; ok {
				return raw, ty
			}
		}
		srcs := db.refSrc[ty+"|"+strings.ToLower(strings.TrimSpace(name))]
		for _, pref := range fetRefPref[ty] {
			for _, s := range srcs {
				if s == pref {
					return db.refs[ty+"|"+fetKey(name, s)], ty
				}
			}
		}
		if len(srcs) > 0 {
			return db.refs[ty+"|"+fetKey(name, srcs[0])], ty
		}
	}
	return nil, ""
}

var (
	fetMu    sync.Mutex
	fetData  *fetDB
	fetState = "none" // none, loading, ready, error
	fetErr   string
	fetSig   string
)

func fetKey(name, source string) string {
	return strings.ToLower(strings.TrimSpace(name)) + "|" + strings.ToLower(strings.TrimSpace(source))
}

// 84: the SRD 5.2.1 the app comes with (CC BY 4.0), built into the program
const srdLabel = "SRD 5.2.1"
const srdPath = "<srd>"

func srdData() []byte {
	b, err := assets.ReadFile("assets/srd-5.2.1.json")
	if err != nil {
		return nil
	}
	return b
}

// 86: homebrew files added with Settings → Import JSON
func importDir() string { return filepath.Join(here, "5etools", "imported") }

func fetImported() []string {
	out := []string{}
	es, err := os.ReadDir(importDir())
	if err != nil {
		return out
	}
	for _, e := range es {
		if !e.IsDir() && strings.HasSuffix(strings.ToLower(e.Name()), ".json") {
			out = append(out, e.Name())
		}
	}
	sort.Strings(out)
	return out
}

// the files that count, and a signature that changes when any of them does
func fetFiles() ([]string, string) {
	var out []string
	var sig strings.Builder
	if b := srdData(); b != nil {
		out = append(out, srdPath)
		fmt.Fprintf(&sig, "srd:%d;", len(b))
	}
	for _, dir := range []string{filepath.Join(here, "5etools"), importDir(), here} {
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, e := range entries {
			n := strings.ToLower(e.Name())
			if e.IsDir() || !(strings.HasSuffix(n, ".zip") || strings.HasSuffix(n, ".json")) {
				continue
			}
			if dir == here && !strings.HasPrefix(n, "5etools") { // next to the app only 5etools* files count
				continue
			}
			if dir == importDir() && !strings.HasSuffix(n, ".json") {
				continue
			}
			if n == "state.json" || n == "library.json" || n == "stanje.json" {
				continue
			}
			p := filepath.Join(dir, e.Name())
			info, err := os.Stat(p) // follows links
			if err != nil {
				continue
			}
			out = append(out, p)
			fmt.Fprintf(&sig, "%s:%d:%d;", p, info.Size(), info.ModTime().UnixNano())
		}
		// 5e.tools pictures you put there: a new book folder or new files change the signature
		if img := filepath.Join(dir, "img", "bestiary"); dir == filepath.Join(here, "5etools") {
			if info, err := os.Stat(img); err == nil && info.IsDir() {
				fmt.Fprintf(&sig, "img:%d:", info.ModTime().UnixNano())
				if fs, err := os.ReadDir(img); err == nil {
					for _, e := range fs {
						if i2, err := e.Info(); err == nil && e.IsDir() {
							fmt.Fprintf(&sig, "%s:%d,", e.Name(), i2.ModTime().UnixNano())
						}
					}
				}
				sig.WriteString(";")
			}
		}
		// an unpacked copy: 5etools/data/bestiary
		if d := filepath.Join(dir, "data", "bestiary"); dir == filepath.Join(here, "5etools") {
			if fs, err := os.ReadDir(d); err == nil {
				for _, e := range fs {
					if info, err := e.Info(); err == nil && strings.HasPrefix(e.Name(), "bestiary-") {
						fmt.Fprintf(&sig, "%s:%d:%d;", e.Name(), info.Size(), info.ModTime().UnixNano())
					}
				}
				out = append(out, d)
			}
		}
	}
	return out, sig.String()
}

func fetStatus() map[string]any {
	fetMu.Lock()
	defer fetMu.Unlock()
	files, sig := fetFiles()
	if len(files) == 0 {
		fetState, fetData, fetSig = "none", nil, ""
	} else if sig != fetSig && fetState != "loading" {
		fetState, fetSig = "loading", sig
		go fetLoad(sig)
	}
	st := map[string]any{"state": fetState, "error": fetErr, "sig": fetSig}
	if fetData != nil {
		st["counts"] = fetData.counts
		names := []string{}
		for _, f := range fetData.files {
			names = append(names, filepath.Base(f))
		}
		st["files"] = names
	}
	st["imported"] = fetImported()
	return st
}

func fetLoad(sig string) {
	db := &fetDB{byKey: map[string]int{}, templates: map[string]json.RawMessage{}, counts: map[string]int{},
		refs: map[string]json.RawMessage{}, refLabel: map[string]string{}, refSrc: map[string][]string{},
		refNames: map[string]map[string]bool{"spell": {}, "condition": {}},
		refGroup: map[string]string{}, spellCls: map[string]string{}, spellOld: map[string]string{}, lgroups: map[string]json.RawMessage{},
		pcCls: map[string]map[string]any{}, pcSub: map[string]map[string]any{}, fluff: map[string]json.RawMessage{}, imgs: map[string][2]string{}}
	files, _ := fetFiles()
	var errs []string
	for _, f := range files {
		if f == srdPath {
			continue
		}
		var err error
		info, _ := os.Stat(f)
		switch {
		case info != nil && info.IsDir():
			err = fetReadBestiaryDir(db, f)
		case strings.HasSuffix(strings.ToLower(f), ".zip"):
			err = fetReadZip(db, f)
		default:
			err = fetReadJSON(db, f)
		}
		if err != nil {
			errs = append(errs, filepath.Base(f)+": "+err.Error())
		} else {
			db.files = append(db.files, f)
		}
	}
	srdN, srdSpells := 0, 0
	if b := srdData(); b != nil {
		srdN, srdSpells = fetAddSRD(db, b)
		db.files = append(db.files, srdLabel+" (built in)")
	}
	// copies keep their original's CR and type for the search
	for i := range db.mons {
		m := &db.mons[i]
		if m.cr != "" && m.typ != "" {
			continue
		}
		cur := m.raw
		for depth := 0; depth < 6 && (m.cr == "" || m.typ == ""); depth++ {
			var c struct {
				Copy *struct{ Name, Source string } `json:"_copy"`
			}
			if json.Unmarshal(cur, &c) != nil || c.Copy == nil {
				break
			}
			j, ok := db.byKey[fetKey(c.Copy.Name, c.Copy.Source)]
			if !ok {
				break
			}
			if m.cr == "" {
				m.cr = db.mons[j].cr
			}
			if m.typ == "" {
				m.typ = db.mons[j].typ
			}
			cur = db.mons[j].raw
		}
	}
	list := make([][]any, 0, len(db.mons))
	for i, m := range db.mons {
		newer := 0 // 1 when a newer printing of this monster is among the files (the MM14 Lich next to the MM24 one)
		if n, src, ok := fetReprintOf(m.raw); ok {
			if _, ok := db.byKey[fetKey(n, src)]; ok {
				newer = 1
			}
		}
		list = append(list, []any{i, m.name, m.label, m.group, m.cr, m.typ, newer})
		db.counts[m.group]++
	}
	db.counts["srd"], db.counts["srd_spells"] = srdN, srdSpells
	db.index = encode(map[string]any{"sig": sig, "list": list})
	fetBuildSpells(db, sig)
	fetBuildRefIndex(db, sig)
	fetReadImgDir(db, filepath.Join(here, "5etools", "img", "bestiary")) // pictures in the 5etools folder, whatever form the data has
	fetBuildPC(db, sig)
	fetMu.Lock()
	defer fetMu.Unlock()
	if fetSig != sig { // the files changed again while reading: a newer load is on its way
		return
	}
	fetData = db
	if len(db.mons) == 0 && len(errs) > 0 {
		fetState, fetErr = "error", strings.Join(errs, "; ")
	} else {
		fetState, fetErr = "ready", strings.Join(errs, "; ")
	}
	fmt.Printf("  Game data: %d SRD monsters built in, %d official and %d homebrew from your files\n", db.counts["srd"], db.counts["off"]-db.counts["srd"], db.counts["own"]+db.counts["hb"])
}

// the fields the search needs, from one monster
func fetAdd(db *fetDB, raw json.RawMessage, label, group string) {
	var m struct {
		Name   string          `json:"name"`
		Source string          `json:"source"`
		Cr     json.RawMessage `json:"cr"`
		Type   json.RawMessage `json:"type"`
	}
	if json.Unmarshal(raw, &m) != nil || m.Name == "" {
		return
	}
	cr := ""
	var s string
	var o struct {
		Cr string `json:"cr"`
	}
	if json.Unmarshal(m.Cr, &s) == nil {
		cr = s
	} else if json.Unmarshal(m.Cr, &o) == nil {
		cr = o.Cr
	}
	typ := ""
	var t struct {
		Type json.RawMessage `json:"type"`
	}
	if json.Unmarshal(m.Type, &s) == nil {
		typ = s
	} else if json.Unmarshal(m.Type, &t) == nil {
		var s2 string
		var ch struct {
			Choose []string `json:"choose"`
		}
		if json.Unmarshal(t.Type, &s2) == nil {
			typ = s2
		} else if json.Unmarshal(t.Type, &ch) == nil && len(ch.Choose) > 0 {
			typ = strings.Join(ch.Choose, "/")
		}
	}
	if label == "" {
		label = m.Source
	}
	k := fetKey(m.Name, m.Source)
	if j, ok := db.byKey[k]; ok && db.mons[j].group == "off" && group != "off" {
		// homebrew that reuses an official name and source keeps both; the official one stays the copy target
		k = k + "|" + group + strconv.Itoa(len(db.mons))
	}
	db.byKey[k] = len(db.mons)
	db.mons = append(db.mons, fetMon{raw: raw, name: m.Name, source: m.Source, label: label, group: group, cr: cr, typ: strings.ToLower(typ)})
}

func fetAddFile(db *fetDB, b []byte, label func(string) string, group string) {
	var f struct {
		Monster []json.RawMessage `json:"monster"`
		Tmpl    []json.RawMessage `json:"monsterTemplate"`
	}
	if json.Unmarshal(b, &f) != nil {
		return
	}
	for _, m := range f.Monster {
		var s struct{ Source string }
		json.Unmarshal(m, &s)
		fetAdd(db, m, label(s.Source), group)
	}
	for _, t := range f.Tmpl {
		var s struct{ Name, Source string }
		if json.Unmarshal(t, &s) == nil {
			db.templates[fetKey(s.Name, s.Source)] = t
		}
	}
	fetAddLGroups(db, b)
}

func same(s string) string { return s }

// fetAddSRD puts the built-in SRD under everything else: a monster, spell, item or rule the DM's own files already have is left out
func fetAddSRD(db *fetDB, b []byte) (int, int) {
	var f map[string]json.RawMessage
	if json.Unmarshal(b, &f) != nil {
		return 0, 0
	}
	have := map[string]bool{}
	for _, m := range db.mons {
		if m.group == "off" {
			have[strings.ToLower(strings.TrimSpace(m.name))] = true
		}
	}
	n := 0
	var mons []json.RawMessage
	json.Unmarshal(f["monster"], &mons)
	for _, m := range mons {
		var x struct{ Name string }
		if json.Unmarshal(m, &x) != nil || x.Name == "" || have[strings.ToLower(strings.TrimSpace(x.Name))] {
			continue
		}
		fetAdd(db, m, srdLabel, "off")
		n++
	}
	hasOff := false
	for _, g := range db.refGroup {
		if g == "off" {
			hasOff = true
			break
		}
	}
	known := func(t, nm string, it json.RawMessage) bool {
		if db.srdAlias[t+"|"+nm] {
			return true
		}
		if hasOff && t == "item" { // Flame Tongue Longsword…: the DM's files make these themselves
			var w struct{ Weapon, Armor bool }
			if json.Unmarshal(it, &w) == nil && (w.Weapon || w.Armor) {
				return true
			}
		}
		tys := []string{t}
		if t == "item" {
			tys = append(tys, "baseitem")
		}
		for _, ty := range tys {
			for _, s := range db.refSrc[ty+"|"+nm] {
				if db.refGroup[ty+"|"+fetKey(nm, s)] == "off" {
					return true
				}
			}
		}
		return false
	}
	keep := map[string][]json.RawMessage{}
	for _, t := range fetRefTypes {
		var arr []json.RawMessage
		if raw, ok := f[t]; !ok || json.Unmarshal(raw, &arr) != nil {
			continue
		}
		for _, it := range arr {
			var x struct{ Name string }
			if json.Unmarshal(it, &x) == nil && x.Name != "" && !known(t, strings.ToLower(strings.TrimSpace(x.Name)), it) {
				keep[t] = append(keep[t], it)
			}
		}
	}
	fetAddRefs(db, encode(keep), func(string) string { return srdLabel }, "off")
	return n, len(keep["spell"])
}

var importName = regexp.MustCompile(`[^A-Za-z0-9 ._()-]`)

// fetImport checks one homebrew file and keeps it in 5etools/imported
func fetImport(name string, body []byte) (string, map[string]int, string) {
	base := strings.TrimSpace(importName.ReplaceAllString(filepath.Base(strings.ReplaceAll(name, "\\", "/")), ""))
	if len(base) > 80 {
		base = base[:80]
	}
	if base == "." || base == "/" {
		base = ""
	}
	if !strings.HasSuffix(strings.ToLower(base), ".json") {
		if base == "" {
			base = "homebrew"
		}
		base += ".json"
	}
	var data map[string]json.RawMessage
	if json.Unmarshal(bytes.TrimPrefix(body, []byte("\xef\xbb\xbf")), &data) != nil {
		var any0 any
		if json.Unmarshal(bytes.TrimPrefix(body, []byte("\xef\xbb\xbf")), &any0) != nil {
			return "", nil, "That isn't a JSON file the app can read."
		}
		return "", nil, "That file doesn't hold monsters, spells or rules."
	}
	kinds := map[string]int{}
	for _, k := range append([]string{"monster"}, fetRefTypes...) {
		var arr []json.RawMessage
		if raw, ok := data[k]; ok && json.Unmarshal(raw, &arr) == nil && len(arr) > 0 {
			kinds[k] = len(arr)
		}
	}
	if len(kinds) == 0 {
		return "", nil, "That file has no monsters, spells, items or rules in the homebrew format."
	}
	os.MkdirAll(importDir(), 0o755)
	if err := os.WriteFile(filepath.Join(importDir(), base), body, 0o644); err != nil {
		return "", nil, "Couldn't save the file next to the app."
	}
	return base, kinds, ""
}

func fetReadZip(db *fetDB, p string) error {
	z, err := zip.OpenReader(p)
	if err != nil {
		return err
	}
	defer z.Close()
	n, pics := 0, 0
	for _, f := range z.File {
		name := f.Name
		low := strings.ToLower(name)
		if fetIsImg(low) && strings.Contains(low, "bestiary/") { // the 5e.tools pictures, if you have them
			db.imgs[low[strings.Index(low, "bestiary/"):]] = [2]string{p, f.Name}
			pics++
			continue
		}
		if i := strings.Index(name, "data/bestiary/"); i >= 0 {
			name = name[i+len("data/bestiary/"):]
		} else {
			continue
		}
		lg := name == "legendarygroups.json"
		fl := strings.HasPrefix(name, "fluff-bestiary-") && strings.HasSuffix(name, ".json")
		if strings.Contains(name, "/") || !(strings.HasPrefix(name, "bestiary-") || name == "template.json" || lg || fl) {
			continue
		}
		r, err := f.Open()
		if err != nil {
			continue
		}
		b, err := io.ReadAll(r)
		r.Close()
		if err != nil {
			continue
		}
		if lg {
			fetAddLGroups(db, b)
			continue
		}
		if fl {
			fetAddFluff(db, b)
			continue
		}
		fetAddFile(db, b, same, "off")
		n++
	}
	// spells, conditions, items and rules the statblocks point at
	for _, f := range z.File {
		i := strings.Index(f.Name, "data/")
		if i < 0 {
			continue
		}
		rest := f.Name[i+5:]
		cl := strings.HasPrefix(rest, "class/class-") && strings.HasSuffix(rest, ".json")
		ok := (strings.HasPrefix(rest, "spells/spells-") && strings.HasSuffix(rest, ".json")) || rest == "spells/sources.json" || cl
		for _, n := range fetRefFiles {
			ok = ok || rest == n
		}
		if !ok {
			continue
		}
		r, err := f.Open()
		if err != nil {
			continue
		}
		b, err := io.ReadAll(r)
		r.Close()
		if err == nil && cl {
			fetAddPC(db, b, same, "off")
		} else if err == nil && rest == "spells/sources.json" {
			fetAddSpellSources(db, b)
		} else if err == nil {
			fetAddRefs(db, b, same, "off")
		}
	}
	if pics > 0 {
		db.imgSrc = append(db.imgSrc, filepath.Base(p))
	}
	if n == 0 && pics == 0 {
		return fmt.Errorf("no bestiary in this zip")
	}
	return nil
}

func fetReadImgDir(db *fetDB, imgDir string) {
	before := len(db.imgs)
	filepath.WalkDir(imgDir, func(p string, e fs.DirEntry, err error) error {
		if err == nil && !e.IsDir() && fetIsImg(strings.ToLower(p)) {
			rel, _ := filepath.Rel(filepath.Dir(imgDir), p)
			db.imgs[strings.ToLower(filepath.ToSlash(rel))] = [2]string{"", p}
		}
		return nil
	})
	rel, _ := filepath.Rel(here, imgDir)
	rel = filepath.ToSlash(rel)
	if len(db.imgs) > before {
		for _, x := range db.imgSrc {
			if x == rel {
				return
			}
		}
		db.imgSrc = append(db.imgSrc, rel)
	}
}

func fetIsImg(low string) bool {
	return strings.HasSuffix(low, ".webp") || strings.HasSuffix(low, ".png") || strings.HasSuffix(low, ".jpg") || strings.HasSuffix(low, ".jpeg")
}

func fetAddFluff(db *fetDB, b []byte) {
	var f struct {
		MF []json.RawMessage `json:"monsterFluff"`
	}
	if json.Unmarshal(b, &f) != nil {
		return
	}
	for _, raw := range f.MF {
		var x struct{ Name, Source string }
		if json.Unmarshal(raw, &x) == nil && x.Name != "" {
			db.fluff[fetKey(x.Name, x.Source)] = raw
		}
	}
}

// a monster's lore and pictures, with what it copies from (Young Red Dragon → Red Dragons)
func fetFluff(db *fetDB, name, src string, depth int) ([]any, []any) {
	raw, ok := db.fluff[fetKey(name, src)]
	if !ok || depth > 4 {
		return []any{}, []any{}
	}
	var it struct {
		Entries []any `json:"entries"`
		Images  []any `json:"images"`
		Copy    *struct {
			Name, Source string
			Mod          map[string]json.RawMessage `json:"_mod"`
		} `json:"_copy"`
	}
	json.Unmarshal(raw, &it)
	ents, imgs := it.Entries, it.Images
	if ents == nil {
		ents = []any{}
	}
	if imgs == nil {
		imgs = []any{}
	}
	if it.Copy != nil {
		be, bi := fetFluff(db, it.Copy.Name, it.Copy.Source, depth+1)
		ents = append(append([]any{}, be...), ents...)
		if len(imgs) == 0 {
			imgs = bi
		}
		for _, k := range []string{"entries", "images"} {
			mr, ok := it.Copy.Mod[k]
			if !ok {
				continue
			}
			var mods []map[string]any
			if json.Unmarshal(mr, &mods) != nil {
				var one map[string]any
				if json.Unmarshal(mr, &one) == nil {
					mods = []map[string]any{one}
				}
			}
			for _, m := range mods {
				items, ok := m["items"].([]any)
				if !ok && m["items"] != nil {
					items = []any{m["items"]}
				}
				cur := &ents
				if k == "images" {
					cur = &imgs
				}
				switch m["mode"] {
				case "prependArr":
					*cur = append(append([]any{}, items...), *cur...)
				case "appendArr":
					*cur = append(*cur, items...)
				case "replaceArr":
					*cur = items
				}
			}
		}
	}
	return ents, imgs
}

func fetImgPath(im any) string {
	m, _ := im.(map[string]any)
	h, _ := m["href"].(map[string]any)
	if p, ok := h["path"].(string); ok && h["type"] == "internal" {
		return strings.ToLower(p)
	}
	return ""
}

func fetImgRead(db *fetDB, p string) []byte {
	hit, ok := db.imgs[strings.ToLower(p)]
	if !ok {
		return nil
	}
	if hit[0] == "" {
		b, _ := os.ReadFile(hit[1])
		return b
	}
	z, err := zip.OpenReader(hit[0])
	if err != nil {
		return nil
	}
	defer z.Close()
	for _, f := range z.File {
		if f.Name == hit[1] {
			r, err := f.Open()
			if err != nil {
				return nil
			}
			defer r.Close()
			b, _ := io.ReadAll(r)
			return b
		}
	}
	return nil
}

func fetReadBestiaryDir(db *fetDB, d string) error {
	entries, err := os.ReadDir(d)
	if err != nil {
		return err
	}
	for _, e := range entries {
		n := e.Name()
		if strings.HasPrefix(n, "bestiary-") || n == "template.json" {
			if b, err := os.ReadFile(filepath.Join(d, n)); err == nil {
				fetAddFile(db, b, same, "off")
			}
		} else if n == "legendarygroups.json" {
			if b, err := os.ReadFile(filepath.Join(d, n)); err == nil {
				fetAddLGroups(db, b)
			}
		} else if strings.HasPrefix(n, "fluff-bestiary-") && strings.HasSuffix(n, ".json") {
			if b, err := os.ReadFile(filepath.Join(d, n)); err == nil {
				fetAddFluff(db, b)
			}
		}
	}
	fetReadImgDir(db, filepath.Join(filepath.Dir(filepath.Dir(d)), "img", "bestiary"))
	// spells, conditions, items and rules next to an unpacked bestiary
	data := filepath.Dir(d)
	files, _ := filepath.Glob(filepath.Join(data, "spells", "spells-*.json"))
	for _, n := range fetRefFiles {
		files = append(files, filepath.Join(data, n))
	}
	if b, err := os.ReadFile(filepath.Join(data, "spells", "sources.json")); err == nil {
		fetAddSpellSources(db, b)
	}
	for _, f := range files {
		if b, err := os.ReadFile(f); err == nil {
			fetAddRefs(db, b, same, "off")
		}
	}
	cfiles, _ := filepath.Glob(filepath.Join(data, "class", "class-*.json"))
	sort.Strings(cfiles)
	for _, f := range cfiles {
		if b, err := os.ReadFile(f); err == nil {
			fetAddPC(db, b, same, "off")
		}
	}
	return nil
}

// a .json is either the site's backup (homebrew stored in the browser) or a homebrew file
func fetReadJSON(db *fetDB, p string) error {
	f, err := os.Open(p)
	if err != nil {
		return err
	}
	defer f.Close()
	head := make([]byte, 400)
	n, _ := io.ReadFull(f, head)
	if bytes.Contains(head[:n], []byte(`"fileType"`)) {
		f.Seek(0, 0)
		return fetReadBackup(db, f)
	}
	f.Seek(0, 0)
	b, err := io.ReadAll(io.LimitReader(f, 200<<20))
	if err != nil {
		return err
	}
	var meta struct {
		Meta struct {
			Sources []struct{ JSON, Full string } `json:"sources"`
		} `json:"_meta"`
	}
	json.Unmarshal(b, &meta)
	full := map[string]string{}
	for _, s := range meta.Meta.Sources {
		full[strings.ToLower(s.JSON)] = s.Full
	}
	lab := func(src string) string {
		if v := full[strings.ToLower(src)]; v != "" {
			return v
		}
		return src
	}
	fetAddFile(db, b, lab, "own")
	fetAddRefs(db, b, lab, "own")
	fetAddPC(db, b, lab, "own")
	return nil
}

// walk the backup without loading all of it: only async.HOMEBREW_2_STORAGE is read
func fetReadBackup(db *fetDB, r io.Reader) error {
	dec := json.NewDecoder(r)
	skip := func() error { var x json.RawMessage; return dec.Decode(&x) }
	expect := func(want json.Delim) error {
		t, err := dec.Token()
		if err != nil {
			return err
		}
		if d, ok := t.(json.Delim); !ok || d != want {
			return fmt.Errorf("not a 5e.tools backup")
		}
		return nil
	}
	if err := expect('{'); err != nil {
		return err
	}
	found := false
	for dec.More() {
		t, err := dec.Token()
		if err != nil {
			return err
		}
		if t != "async" {
			if err := skip(); err != nil {
				return err
			}
			continue
		}
		if err := expect('{'); err != nil {
			return err
		}
		for dec.More() {
			k, err := dec.Token()
			if err != nil {
				return err
			}
			if k != "HOMEBREW_2_STORAGE" {
				if err := skip(); err != nil {
					return err
				}
				continue
			}
			found = true
			if err := expect('['); err != nil {
				return err
			}
			for dec.More() {
				var doc struct {
					Head struct {
						IsEditable bool `json:"isEditable"`
					} `json:"head"`
					Body struct {
						Meta struct {
							Sources []struct{ JSON, Full string } `json:"sources"`
						} `json:"_meta"`
						Monster []json.RawMessage `json:"monster"`
						Tmpl    []json.RawMessage `json:"monsterTemplate"`
						Spell   json.RawMessage   `json:"spell"`
						Cond    json.RawMessage   `json:"condition"`
						Disease json.RawMessage   `json:"disease"`
						Status  json.RawMessage   `json:"status"`
						Item    json.RawMessage   `json:"item"`
						Base    json.RawMessage   `json:"baseitem"`
						Action  json.RawMessage   `json:"action"`
						Rule    json.RawMessage   `json:"variantrule"`
						Feat    json.RawMessage   `json:"feat"`
						OptFeat json.RawMessage   `json:"optionalfeature"`
						Backgr  json.RawMessage   `json:"background"`
						Race    json.RawMessage   `json:"race"`
						Trap    json.RawMessage   `json:"trap"`
						Hazard  json.RawMessage   `json:"hazard"`
						LGroup  json.RawMessage   `json:"legendaryGroup"`
						Sense   json.RawMessage   `json:"sense"`
						Skill   json.RawMessage   `json:"skill"`
						Class   json.RawMessage   `json:"class"`
						Sub     json.RawMessage   `json:"subclass"`
					} `json:"body"`
				}
				if err := dec.Decode(&doc); err != nil {
					return err
				}
				full := map[string]string{}
				for _, s := range doc.Body.Meta.Sources {
					full[strings.ToLower(s.JSON)] = s.Full
				}
				group := "hb"
				if doc.Head.IsEditable {
					group = "own"
				}
				for _, m := range doc.Body.Monster {
					var s struct{ Source string }
					json.Unmarshal(m, &s)
					label := full[strings.ToLower(s.Source)]
					if label == "" {
						label = s.Source
					}
					fetAdd(db, m, label, group)
				}
				for _, t := range doc.Body.Tmpl {
					var s struct{ Name, Source string }
					if json.Unmarshal(t, &s) == nil {
						db.templates[fetKey(s.Name, s.Source)] = t
					}
				}
				parts := map[string]json.RawMessage{"spell": doc.Body.Spell, "condition": doc.Body.Cond, "disease": doc.Body.Disease, "status": doc.Body.Status,
					"item": doc.Body.Item, "baseitem": doc.Body.Base, "action": doc.Body.Action, "variantrule": doc.Body.Rule,
					"feat": doc.Body.Feat, "optionalfeature": doc.Body.OptFeat, "background": doc.Body.Backgr, "race": doc.Body.Race,
					"trap": doc.Body.Trap, "hazard": doc.Body.Hazard, "sense": doc.Body.Sense, "skill": doc.Body.Skill}
				if len(doc.Body.LGroup) > 0 {
					fetAddLGroups(db, encode(map[string]json.RawMessage{"legendaryGroup": doc.Body.LGroup}))
				}
				for k, v := range parts {
					if len(v) == 0 {
						delete(parts, k)
					}
				}
				lab := func(src string) string {
					if v := full[strings.ToLower(src)]; v != "" {
						return v
					}
					return src
				}
				if len(parts) > 0 {
					fetAddRefs(db, encode(parts), lab, group)
				}
				if len(doc.Body.Class) > 0 || len(doc.Body.Sub) > 0 {
					pc := map[string]json.RawMessage{}
					if len(doc.Body.Class) > 0 {
						pc["class"] = doc.Body.Class
					}
					if len(doc.Body.Sub) > 0 {
						pc["subclass"] = doc.Body.Sub
					}
					fetAddPC(db, encode(pc), lab, group)
				}
			}
			dec.Token() // ]
		}
		dec.Token() // }
	}
	if !found {
		return fmt.Errorf("no homebrew in this backup")
	}
	return nil
}

// a monster with everything it copies from, and the templates it uses, for the page to put together
func fetMonster(id int) []byte {
	fetMu.Lock()
	db := fetData
	fetMu.Unlock()
	if db == nil || id < 0 || id >= len(db.mons) {
		return nil
	}
	chain := []json.RawMessage{db.mons[id].raw}
	tmpl := []json.RawMessage{}
	cur := db.mons[id].raw
	for depth := 0; depth < 8; depth++ {
		var c struct {
			Copy *struct {
				Name      string                          `json:"name"`
				Source    string                          `json:"source"`
				Templates []struct{ Name, Source string } `json:"_templates"`
			} `json:"_copy"`
		}
		if json.Unmarshal(cur, &c) != nil || c.Copy == nil {
			break
		}
		for _, t := range c.Copy.Templates {
			if raw, ok := db.templates[fetKey(t.Name, t.Source)]; ok {
				tmpl = append(tmpl, raw)
			}
		}
		j, ok := db.byKey[fetKey(c.Copy.Name, c.Copy.Source)]
		if !ok {
			break
		}
		cur = db.mons[j].raw
		chain = append(chain, cur)
	}
	out := map[string]any{"chain": chain, "templates": tmpl, "label": db.mons[id].label, "group": db.mons[id].group}
	for _, raw := range chain { // the boss's lair actions and regional effects
		var g struct {
			LG *struct{ Name, Source string } `json:"legendaryGroup"`
		}
		if json.Unmarshal(raw, &g) == nil && g.LG != nil {
			if lg, ok := db.lgroups[fetKey(g.LG.Name, g.LG.Source)]; ok {
				out["lgroup"] = lg
			}
			break
		}
	}
	return encode(out)
}

func fetFindMonster(name, source string) int {
	fetMu.Lock()
	db := fetData
	fetMu.Unlock()
	if db == nil {
		return -1
	}
	newest := func(j int) int {
		for hop := 0; hop < 4; hop++ {
			n, s, ok := fetReprintOf(db.mons[j].raw)
			if !ok {
				break
			}
			k, ok := db.byKey[fetKey(n, s)]
			if !ok {
				break
			}
			j = k
		}
		return j
	}
	if source != "" {
		if j, ok := db.byKey[fetKey(name, source)]; ok {
			return newest(j)
		}
	}
	for _, s := range []string{"xmm", "mm", "mpmm"} {
		if j, ok := db.byKey[fetKey(name, s)]; ok {
			return newest(j)
		}
	}
	for i, m := range db.mons {
		if strings.EqualFold(m.name, name) {
			return newest(i)
		}
	}
	return -1
}

// the one thing phones may read from the 5e.tools files: spells, for their spell list
func fetPublic(w http.ResponseWriter, r *http.Request, path string) bool {
	if path != "/spells" && path != "/spell" && path != "/pc" && path != "/pcref" {
		return false
	}
	fetStatus()
	fetMu.Lock()
	db, state := fetData, fetState
	fetMu.Unlock()
	if db == nil || state != "ready" {
		reply(w, 503, []byte(`{"state":"`+state+`"}`), "")
		return true
	}
	if path == "/spells" {
		reply(w, 200, db.spells, "")
		return true
	}
	if path == "/pc" { // phones may also read classes, feats and class options, to build their own trackers
		reply(w, 200, db.pcData, "")
		return true
	}
	if path == "/pcref" {
		q := r.URL.Query()
		t := q.Get("t")
		if t != "feat" && t != "optionalfeature" {
			reply(w, 404, []byte("{}"), "")
			return true
		}
		raw, ty := fetRefExact(t, q.Get("n"), q.Get("s"))
		if raw == nil || ty != t {
			reply(w, 404, []byte("{}"), "")
			return true
		}
		var x struct{ Name, Source string }
		json.Unmarshal(raw, &x)
		reply(w, 200, encode(map[string]any{"t": t, "item": json.RawMessage(raw), "label": db.refLabel[t+"|"+fetKey(x.Name, x.Source)]}), "")
		return true
	}
	q := r.URL.Query()
	raw, ty := fetRefExact("spell", q.Get("n"), q.Get("s"))
	if raw == nil || ty != "spell" {
		reply(w, 404, []byte("{}"), "")
		return true
	}
	var x struct{ Name, Source string }
	json.Unmarshal(raw, &x)
	reply(w, 200, encode(map[string]any{"t": "spell", "item": json.RawMessage(raw), "label": db.refLabel["spell|"+fetKey(x.Name, x.Source)]}), "")
	return true
}

func fetHandle(w http.ResponseWriter, r *http.Request, path string) bool {
	if !strings.HasPrefix(path, "/5et/") {
		return false
	}
	if !isLocal(r) {
		reply(w, 403, []byte("{}"), "")
		return true
	}
	switch path {
	case "/5et/status":
		reply(w, 200, encode(fetStatus()), "")
	case "/5et/index":
		fetStatus()
		fetMu.Lock()
		db, state := fetData, fetState
		fetMu.Unlock()
		if db == nil || state != "ready" {
			reply(w, 503, []byte(`{"state":"`+state+`"}`), "")
			return true
		}
		reply(w, 200, db.index, "")
	case "/5et/ref":
		q := r.URL.Query()
		find := fetRef
		if q.Get("x") != "" { // exactly this printing, not its 2024 reprint
			find = fetRefExact
		}
		raw, ty := find(strings.ToLower(q.Get("t")), q.Get("n"), q.Get("s"))
		if raw == nil {
			reply(w, 404, []byte("{}"), "")
			return true
		}
		var x struct{ Name, Source string }
		json.Unmarshal(raw, &x)
		fetMu.Lock()
		label := fetData.refLabel[ty+"|"+fetKey(x.Name, x.Source)]
		fetMu.Unlock()
		reply(w, 200, encode(map[string]any{"t": ty, "item": json.RawMessage(raw), "label": label}), "")
	case "/5et/pics": // where the pictures come from, for Settings → Pictures
		fetMu.Lock()
		db, st := fetData, fetState
		fetMu.Unlock()
		out := map[string]any{"count": 0, "from": []string{}, "folder": filepath.Join(here, "5etools", "img", "bestiary"), "state": st}
		if db != nil {
			out["count"] = len(db.imgs)
			if db.imgSrc != nil {
				out["from"] = db.imgSrc
			}
		}
		reply(w, 200, encode(out), "")
	case "/5et/fluff":
		q := r.URL.Query()
		fetMu.Lock()
		db := fetData
		fetMu.Unlock()
		if db == nil {
			reply(w, 503, []byte("{}"), "")
			return true
		}
		ents, ims := fetFluff(db, q.Get("n"), q.Get("s"), 0)
		out := []any{}
		for _, im := range ims {
			if p := fetImgPath(im); p != "" {
				_, ok := db.imgs[p]
				out = append(out, map[string]any{"p": p, "ok": ok})
			}
		}
		reply(w, 200, encode(map[string]any{"entries": ents, "images": out}), "")
	case "/5et/img":
		fetMu.Lock()
		db := fetData
		fetMu.Unlock()
		p := r.URL.Query().Get("p")
		var b []byte
		if db != nil {
			b = fetImgRead(db, p)
		}
		if b == nil {
			reply(w, 404, []byte("{}"), "")
			return true
		}
		ct := "image/jpeg"
		if strings.HasSuffix(strings.ToLower(p), ".webp") {
			ct = "image/webp"
		} else if strings.HasSuffix(strings.ToLower(p), ".png") {
			ct = "image/png"
		}
		reply(w, 200, b, ct)
	case "/5et/import", "/5et/unimport": // 86: Settings → Import JSON, and removing such a file
		if r.Method != http.MethodPost {
			reply(w, 405, []byte("{}"), "")
			return true
		}
		name := r.URL.Query().Get("name")
		if path == "/5et/unimport" {
			ok := false
			for _, n := range fetImported() {
				if n == name {
					ok = true
				}
			}
			if !ok {
				reply(w, 404, []byte("{}"), "")
				return true
			}
			os.Remove(filepath.Join(importDir(), name))
			fetStatus()
			reply(w, 200, []byte(`{"ok":true}`), "")
			return true
		}
		body, err := io.ReadAll(io.LimitReader(r.Body, 60<<20+1))
		if err != nil || len(body) > 60<<20 {
			reply(w, 413, []byte(`{"error":"That file is larger than 60 MB."}`), "")
			return true
		}
		base, kinds, msg := fetImport(name, body)
		if msg != "" {
			reply(w, 400, encode(map[string]any{"error": msg}), "")
			return true
		}
		fetStatus()
		reply(w, 200, encode(map[string]any{"ok": true, "file": base, "kinds": kinds}), "")
	case "/5et/imgbg": // a 5e.tools picture becomes a background the tablet may show (for a boss intro)
		var data map[string]any
		json.NewDecoder(io.LimitReader(r.Body, 4096)).Decode(&data)
		p, _ := data["p"].(string)
		fetMu.Lock()
		db := fetData
		fetMu.Unlock()
		var b []byte
		if db != nil && r.Method == http.MethodPost {
			b = fetImgRead(db, p)
		}
		if b == nil {
			reply(w, 404, []byte("{}"), "")
			return true
		}
		ext := strings.ToLower(filepath.Ext(p))
		ext = strings.TrimPrefix(strings.Replace(ext, "jpeg", "jpg", 1), ".")
		if ext != "jpg" && ext != "png" && ext != "webp" {
			ext = "jpg"
		}
		h := sha1.Sum([]byte(strings.ToLower(p)))
		name := hex.EncodeToString(h[:])[:12] + "." + ext
		os.MkdirAll(bgDir, 0o755)
		os.WriteFile(filepath.Join(bgDir, name), b, 0o644)
		reply(w, 200, encode(map[string]any{"file": name}), "")
	case "/5et/refindex":
		fetStatus()
		fetMu.Lock()
		db, state := fetData, fetState
		fetMu.Unlock()
		if db == nil || state != "ready" {
			reply(w, 503, []byte(`{"state":"`+state+`"}`), "")
			return true
		}
		reply(w, 200, db.refIndex, "")
	case "/5et/refnames":
		fetMu.Lock()
		db := fetData
		fetMu.Unlock()
		out := map[string][]string{"spell": {}, "condition": {}}
		if db != nil {
			for t, set := range db.refNames {
				for n := range set {
					out[t] = append(out[t], n)
				}
			}
		}
		reply(w, 200, encode(out), "")
	case "/5et/monster":
		q := r.URL.Query()
		id, err := strconv.Atoi(q.Get("id"))
		if n := q.Get("n"); n != "" { // a creature named in a statblock
			id, err = fetFindMonster(n, q.Get("s")), nil
		}
		b := fetMonster(id)
		if err != nil || b == nil {
			reply(w, 404, []byte("{}"), "")
			return true
		}
		reply(w, 200, b, "")
	default:
		reply(w, 404, []byte("{}"), "")
	}
	return true
}
