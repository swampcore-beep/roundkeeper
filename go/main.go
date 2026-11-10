// Roundkeeper - local server, as a single Windows program.
// Copyright (C) 2026 swampcore-beep. Licensed under the GNU AGPL v3 or later; see LICENSE.
// Source: https://github.com/swampcore-beep/roundkeeper
//
// Double-click Roundkeeper.exe. The DM screen opens in the browser on this
// laptop; the tablet and the players' phones open the address printed in the
// window (also shown as a QR code). Everything the app needs is built in.
// state.json, backups/ and backgrounds/ are kept next to the .exe.
// If an initiative.html sits next to the .exe, it is used instead of the
// built-in one, so the app can be updated without a new .exe.
//
// Only the laptop (127.0.0.1) can change the state. Phones may only send the
// small set of player actions validated below. Hidden enemies and monster HP
// never leave the laptop.
package main

import (
	"bufio"
	"bytes"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"embed"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"io/fs"
	"log"
	"math/big"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strings"
	"sync"
	"time"
)

const (
	port      = 8765
	httpsPort = 8766
)

//go:embed assets
var assets embed.FS

var (
	here       string
	saveFile   string
	bgDir      string
	libFile    string // statblocks the DM imported, kept for next time
	backupDir  string
	bgName     = regexp.MustCompile(`^[a-f0-9]{12}\.(jpg|png|webp)$`)
	tags       = map[string]bool{"reaction": true, "readied": true, "dodge": true}
	covers     = map[string]bool{"": true, "half": true, "tq": true, "total": true}
	playerCond = map[string]bool{"Blinded": true, "Charmed": true, "Deafened": true, "Frightened": true, "Grappled": true,
		"Burning": true, "Incapacitated": true, "Invisible": true, "Paralyzed": true, "Petrified": true, "Poisoned": true, "Prone": true,
		"Restrained": true, "Stunned": true, "Unconscious": true, "Concentrating": true, "Exhaustion": true}

	mu         sync.Mutex
	state      map[string]any
	lastPlayer time.Time
	lastTV     time.Time // when the TV last asked for the state
	pending    []map[string]any
	hasTLS     bool
)

var manifest = []byte(`{"name":"Roundkeeper","short_name":"Roundkeeper","start_url":"/players","display":"fullscreen","orientation":"any","background_color":"#14161f","theme_color":"#14161f","icons":[{"src":"/icon-192.png","sizes":"192x192","type":"image/png"},{"src":"/icon-512.png","sizes":"512x512","type":"image/png"}]}`)

// ---------- helpers ----------

func decode(r io.Reader, v any) error {
	d := json.NewDecoder(r)
	d.UseNumber() // keeps numbers (like rev) exactly as the page sent them
	return d.Decode(v)
}

func encode(v any) []byte {
	var b bytes.Buffer
	e := json.NewEncoder(&b)
	e.SetEscapeHTML(false)
	e.Encode(v)
	return bytes.TrimRight(b.Bytes(), "\n")
}

func reply(w http.ResponseWriter, code int, body []byte, ctype string) {
	if ctype == "" {
		ctype = "application/json; charset=utf-8"
	}
	w.Header().Set("Content-Type", ctype)
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Now", fmt.Sprint(time.Now().UnixMilli())) // the laptop's clock, so other devices can line theirs up
	w.Header().Set("Content-Length", fmt.Sprint(len(body)))
	w.WriteHeader(code)
	if len(body) > 0 {
		w.Write(body)
	}
}

// the computer the server runs on
func isHost(r *http.Request) bool {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return false
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}

// the DM: the host, or a device paired from it (e.g. the laptop, when the server runs on the desktop)
func isLocal(r *http.Request) bool {
	if isHost(r) {
		return true
	}
	c, err := r.Cookie("ti_dm")
	return err == nil && dmTokenOK(c.Value) != nil
}

var (
	dmMu    sync.Mutex
	dmCodes = map[string]dmCode{}
	dmFile  string
)

type dmCode struct {
	exp  time.Time
	name string
}

const pairABC = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

func dmList() []map[string]any {
	var l []map[string]any
	if b, err := os.ReadFile(dmFile); err == nil {
		json.Unmarshal(b, &l)
	}
	if l == nil {
		l = []map[string]any{}
	}
	return l
}

func dmSave(l []map[string]any) {
	b, _ := json.MarshalIndent(l, "", " ")
	if os.WriteFile(dmFile+".tmp", b, 0o644) == nil {
		os.Rename(dmFile+".tmp", dmFile)
	}
}

func dmHash(t string) string { h := sha256.Sum256([]byte(t)); return hex.EncodeToString(h[:]) }

func dmTokenOK(t string) map[string]any {
	if len(t) < 20 {
		return nil
	}
	h := dmHash(t)
	dmMu.Lock()
	defer dmMu.Unlock()
	l := dmList()
	for _, d := range l {
		if fmt.Sprint(d["h"]) == h {
			if s, _ := d["seen"].(float64); float64(time.Now().Unix())-s > 60 {
				d["seen"] = float64(time.Now().Unix())
				dmSave(l)
			}
			return d
		}
	}
	return nil
}

func randHex(n int) string { b := make([]byte, n); rand.Read(b); return hex.EncodeToString(b) }

// the pairing link, opened on the device that becomes the DM
func dmPairOpen(w http.ResponseWriter, r *http.Request, code string) {
	code = strings.ToUpper(strings.TrimSpace(code))
	dmMu.Lock()
	c, ok := dmCodes[code]
	delete(dmCodes, code)
	dmMu.Unlock()
	if !ok || time.Now().After(c.exp) {
		reply(w, 410, []byte("<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><title>Pairing</title>"+
			"<body style='font:18px system-ui;background:#14161f;color:#eee;padding:32px'><h2>This pairing link has expired</h2>"+
			"<p>Make a new one on the computer running Roundkeeper: Settings → DM devices → Add a DM device.</p>"), "text/html; charset=utf-8")
		return
	}
	tok := randHex(24)
	name := c.name
	if name == "" {
		name = "DM device"
	}
	dmMu.Lock()
	l := dmList()
	now := float64(time.Now().Unix())
	l = append(l, map[string]any{"id": randHex(4), "name": name, "h": dmHash(tok), "added": now, "seen": now, "ip": remoteIP(r)})
	dmSave(l)
	dmMu.Unlock()
	fmt.Printf("  Paired %s as a DM device (%s)\n", remoteIP(r), name)
	http.SetCookie(w, &http.Cookie{Name: "ti_dm", Value: tok, Path: "/", MaxAge: 315360000, HttpOnly: true, SameSite: http.SameSiteLaxMode})
	w.Header().Set("Location", "/?paired=1")
	reply(w, 302, nil, "")
}

func dmDevices(w http.ResponseWriter, r *http.Request) {
	if !isLocal(r) {
		reply(w, 403, []byte("{}"), "")
		return
	}
	me := ""
	if c, err := r.Cookie("ti_dm"); err == nil && c.Value != "" {
		me = dmHash(c.Value)
	}
	dmMu.Lock()
	out := []map[string]any{}
	for _, d := range dmList() {
		out = append(out, map[string]any{"id": d["id"], "name": d["name"], "added": d["added"], "seen": d["seen"], "ip": d["ip"], "me": fmt.Sprint(d["h"]) == me})
	}
	dmMu.Unlock()
	reply(w, 200, encode(map[string]any{"host": isHost(r), "list": out}), "")
}

func dmPost(w http.ResponseWriter, r *http.Request, path string) {
	var data map[string]any
	json.NewDecoder(io.LimitReader(r.Body, 4096)).Decode(&data)
	if path == "/dm-forget" { // a paired device unpairs itself
		if c, err := r.Cookie("ti_dm"); err == nil && c.Value != "" {
			h := dmHash(c.Value)
			dmMu.Lock()
			keep := []map[string]any{}
			for _, d := range dmList() {
				if fmt.Sprint(d["h"]) != h {
					keep = append(keep, d)
				}
			}
			dmSave(keep)
			dmMu.Unlock()
		}
		http.SetCookie(w, &http.Cookie{Name: "ti_dm", Value: "", Path: "/", MaxAge: -1})
		reply(w, 204, nil, "")
		return
	}
	if !isHost(r) {
		reply(w, 403, []byte(`{"error":"only the computer running the server can pair or remove DM devices"}`), "")
		return
	}
	if path == "/dm-unpair" {
		id := fmt.Sprint(data["id"])
		dmMu.Lock()
		keep := []map[string]any{}
		for _, d := range dmList() {
			if fmt.Sprint(d["id"]) != id {
				keep = append(keep, d)
			}
		}
		dmSave(keep)
		dmMu.Unlock()
		reply(w, 204, nil, "")
		return
	}
	b := make([]byte, 8)
	rand.Read(b)
	code := ""
	for _, x := range b {
		code += string(pairABC[int(x)%len(pairABC)])
	}
	name := ""
	if v, ok := data["name"].(string); ok {
		name = strings.TrimSpace(cut(v, 40))
	}
	dmMu.Lock()
	for k, v := range dmCodes {
		if time.Now().After(v.exp) {
			delete(dmCodes, k)
		}
	}
	dmCodes[code] = dmCode{time.Now().Add(10 * time.Minute), name}
	dmMu.Unlock()
	reply(w, 200, encode(map[string]any{"code": code, "ips": lanIPs(), "port": port, "expires": 600}), "")
}

func remoteIP(r *http.Request) string {
	host, _, _ := net.SplitHostPort(r.RemoteAddr)
	return host
}

// lanIPs: all of the laptop's IPv4 addresses; the first is the one it uses to reach the network.
func lanIPs() []string {
	var ips []string
	for _, target := range []string{"8.8.8.8:80", "192.168.1.1:80", "10.255.255.255:80"} {
		c, err := net.Dial("udp4", target) // sends nothing, just picks the network adapter
		if err == nil {
			ips = append(ips, c.LocalAddr().(*net.UDPAddr).IP.String())
			c.Close()
			break
		}
	}
	if ifs, err := net.Interfaces(); err == nil {
		for _, ifc := range ifs {
			if ifc.Flags&net.FlagUp == 0 || ifc.Flags&net.FlagLoopback != 0 {
				continue
			}
			addrs, _ := ifc.Addrs()
			for _, a := range addrs {
				if n, ok := a.(*net.IPNet); ok && n.IP.To4() != nil {
					ips = append(ips, n.IP.String())
				}
			}
		}
	}
	seen := map[string]bool{}
	var out []string
	for _, ip := range ips {
		if seen[ip] || strings.HasPrefix(ip, "127.") || strings.HasPrefix(ip, "169.254.") || strings.HasPrefix(ip, "0.") {
			continue
		}
		seen[ip] = true
		out = append(out, ip)
	}
	if len(out) == 0 {
		out = []string{"127.0.0.1"}
	}
	return out
}

// publicView: what players get. Hidden combatants, monster HP, the party and encounter lists stay on the laptop.
func publicView(st map[string]any) map[string]any {
	if st == nil {
		return nil
	}
	out := map[string]any{}
	for k, v := range st {
		if k == "party" || k == "sheets" || k == "encounters" || k == "clog" || k == "cstat" || k == "tstat" || k == "nstat" { // the combat recap, turn times and dice statistics are the DM's notes
			continue
		}
		out[k] = v
	}
	var list []any
	if l, ok := st["list"].([]any); ok {
		for _, item := range l {
			c, ok := item.(map[string]any)
			if !ok || c["hidden"] == true {
				continue
			}
			cc := map[string]any{}
			for k, v := range c {
				own := c["owner"] != nil && c["owner"] != ""                                                                     // a player's own companion keeps its HP and statblock
				if k == "hpLog" || k == "ib" || k == "php" || (!own && (k == "hp" || k == "hpMax" || k == "thp" || k == "sb")) { // monster HP and statblock counters are the DM's secret
					continue
				}
				cc[k] = v
			}
			list = append(list, cc)
		}
	}
	if list == nil {
		list = []any{}
	}
	out["list"] = list
	if ks, ok := st["clocks"].([]any); ok { // a secret countdown is the DM's alone
		keep := []any{}
		for _, it := range ks {
			if k, ok := it.(map[string]any); ok && k["secret"] != true {
				keep = append(keep, k)
			}
		}
		out["clocks"] = keep
	}
	hidden := map[string]bool{}
	if l, ok := st["list"].([]any); ok {
		for _, item := range l {
			if c, ok := item.(map[string]any); ok && c["hidden"] == true {
				hidden[str(c["id"])] = true
			}
		}
	}
	if effs, ok := st["effects"].([]any); ok && len(hidden) > 0 { // a hidden monster's spells, and hidden targets, stay with the DM
		keep := []any{}
		for _, it := range effs {
			e, ok := it.(map[string]any)
			if !ok || hidden[str(e["by"])] {
				continue
			}
			tg := []any{}
			orig, _ := e["targets"].([]any)
			for _, t := range orig {
				if !hidden[str(t)] {
					tg = append(tg, t)
				}
			}
			if len(orig) > 0 && len(tg) == 0 && e["area"] != true {
				continue
			}
			ee := map[string]any{}
			for k, v := range e {
				ee[k] = v
			}
			ee["targets"] = tg
			keep = append(keep, ee)
		}
		out["effects"] = keep
	}
	if t, ok := st["turn"].(map[string]any); ok {
		id, _ := t["id"].(string)
		seen := id == "__lair"
		for _, item := range list {
			if c, ok := item.(map[string]any); ok && c["id"] == id {
				seen = true
			}
		}
		if !seen { // a hidden creature's turn: players only see the round
			tt := map[string]any{}
			for k, v := range t {
				tt[k] = v
			}
			tt["id"] = nil
			tt["init"] = nil
			out["turn"] = tt
		}
	}
	return out
}

func asset(name string) ([]byte, error) {
	return assets.ReadFile("assets/" + name)
}

func page(w http.ResponseWriter) {
	if b, err := os.ReadFile(filepath.Join(here, "initiative.html")); err == nil {
		reply(w, 200, b, "text/html; charset=utf-8")
		return
	}
	b, _ := asset("initiative.html")
	reply(w, 200, b, "text/html; charset=utf-8")
}

func cached(w http.ResponseWriter, body []byte, ctype string) {
	w.Header().Set("Content-Type", ctype)
	w.Header().Set("Cache-Control", "max-age=604800")
	w.Header().Set("Content-Length", fmt.Sprint(len(body)))
	w.WriteHeader(200)
	w.Write(body)
}

func stamp() string { return time.Now().Format("15:04:05") }

// ---------- requests ----------

func handler(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	if r.Method == http.MethodPost {
		post(w, r, path)
		return
	}
	if fetHandle(w, r, path) || fetPublic(w, r, path) {
		return
	}
	if !isLocal(r) && path != "/state" {
		fmt.Printf("  [%s] Device %s opened %s\n", stamp(), remoteIP(r), path)
	}
	switch {
	case strings.HasPrefix(path, "/pair/"):
		dmPairOpen(w, r, path[6:])
	case path == "/dm-devices":
		dmDevices(w, r)
	case path == "/" || path == "/dm":
		if !isLocal(r) {
			w.Header().Set("Location", "/players")
			reply(w, 302, nil, "")
			return
		}
		page(w)
	case path == "/unos" || path == "/igraci":
		loc := "/players"
		if r.URL.RawQuery != "" {
			loc += "?" + r.URL.RawQuery
		}
		w.Header().Set("Location", loc)
		reply(w, 302, nil, "")
	case path == "/players":
		page(w)
	case path == "/manifest.json":
		reply(w, 200, manifest, "application/manifest+json")
	case path == "/icon-192.png" || path == "/icon-512.png":
		b, err := asset(path[1:])
		if err != nil {
			reply(w, 404, []byte("{}"), "")
			return
		}
		cached(w, b, "image/png")
	case strings.HasPrefix(path, "/fonts/"):
		name := filepath.Base(path)
		b, err := asset("fonts/" + name)
		if err != nil || strings.Contains(name, "..") {
			reply(w, 404, []byte("{}"), "")
			return
		}
		ct := "font/woff2"
		if strings.HasSuffix(name, ".css") {
			ct = "text/css; charset=utf-8"
		}
		cached(w, b, ct)
	case strings.HasPrefix(path, "/bg/"):
		name := path[4:]
		if !bgName.MatchString(name) {
			reply(w, 404, []byte("{}"), "")
			return
		}
		b, err := os.ReadFile(filepath.Join(bgDir, name))
		if err != nil {
			reply(w, 404, []byte("{}"), "")
			return
		}
		cached(w, b, map[string]string{"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}[name[strings.LastIndex(name, ".")+1:]])
	case path == "/library":
		if !isLocal(r) {
			reply(w, 403, []byte("[]"), "")
			return
		}
		b, err := os.ReadFile(libFile)
		if err != nil {
			b = []byte("[]")
		}
		reply(w, 200, b, "")
	case path == "/bg-list":
		if !isLocal(r) {
			reply(w, 403, []byte("[]"), "")
			return
		}
		entries, _ := os.ReadDir(bgDir)
		type f struct {
			n string
			t time.Time
		}
		var fs []f
		for _, e := range entries {
			if bgName.MatchString(e.Name()) {
				info, _ := e.Info()
				fs = append(fs, f{e.Name(), info.ModTime()})
			}
		}
		sort.Slice(fs, func(i, j int) bool { return fs[i].t.After(fs[j].t) })
		names := []string{}
		for _, x := range fs {
			names = append(names, x.n)
		}
		reply(w, 200, encode(names), "")
	case path == "/player-actions":
		if !isLocal(r) {
			reply(w, 403, []byte("[]"), "")
			return
		}
		mu.Lock()
		got := pending
		pending = nil
		mu.Unlock()
		if got == nil {
			got = []map[string]any{}
		}
		reply(w, 200, encode(got), "")
	case path == "/sheet": // 79: a phone gets its own character sheet back (one the DM keeps to himself is never sent)
		n := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("n")))
		mu.Lock()
		var sh map[string]any
		if st := state; st != nil {
			if all, ok := st["sheets"].(map[string]any); ok {
				sh, _ = all[n].(map[string]any)
			}
		}
		var body []byte
		if sh != nil && !truthy(sh["only"]) {
			body = encode(sh)
		}
		mu.Unlock()
		if body == nil {
			reply(w, 404, []byte("{}"), "")
			return
		}
		reply(w, 200, body, "")
	case path == "/state":
		local := isLocal(r)
		mu.Lock()
		if !local {
			lastPlayer = time.Now()
		}
		if r.URL.Query().Get("screen") == "tv" { // the TV, even when it's a second screen of this computer
			lastTV = time.Now()
		}
		st := state
		if !local || r.URL.Query().Get("pub") == "1" { // pages for the players ask for the players' view, even here
			st = publicView(state)
		}
		var body []byte
		rev := r.URL.Query().Get("rev")
		_, hasRev := r.URL.Query()["rev"]
		same := st != nil && hasRev && fmt.Sprint(st["rev"]) == rev
		if !same {
			if st == nil {
				body = []byte("null")
			} else {
				body = encode(st)
			}
		}
		mu.Unlock()
		if same {
			reply(w, 204, nil, "")
			return
		}
		reply(w, 200, body, "")
	case path == "/info":
		mu.Lock()
		var ago, tvAgo any
		if !lastPlayer.IsZero() {
			ago = time.Since(lastPlayer).Seconds()
		}
		if !lastTV.IsZero() {
			tvAgo = time.Since(lastTV).Seconds()
		}
		mu.Unlock()
		ips := lanIPs() // looked up each time, so a new Wi-Fi or address shows up without a restart
		var urls []string
		for _, ip := range ips {
			urls = append(urls, fmt.Sprintf("http://%s:%d/players", ip, port))
		}
		var https any
		if hasTLS {
			https = fmt.Sprintf("https://%s:%d/players", ips[0], httpsPort)
		}
		others := urls[1:]
		if others == nil {
			others = []string{}
		}
		reply(w, 200, encode(map[string]any{"url": urls[0], "others": others, "httpsUrl": https, "port": port, "playerAgo": ago, "tvAgo": tvAgo, "host": isHost(r), "ips": ips}), "")
	default:
		reply(w, 404, []byte("{}"), "")
	}
}

func post(w http.ResponseWriter, r *http.Request, path string) {
	switch path {
	case "/player", "/init":
		playerAction(w, r)
	case "/bg-upload", "/bg-delete":
		background(w, r, path)
	case "/dm-pair", "/dm-unpair", "/dm-forget":
		dmPost(w, r, path)
	case "/5et/imgbg", "/5et/import", "/5et/unimport":
		fetHandle(w, r, path)
	case "/library":
		if !isLocal(r) {
			reply(w, 403, []byte(`{"error":"only the laptop can do this"}`), "")
			return
		}
		body, err := io.ReadAll(io.LimitReader(r.Body, 32<<20))
		var lib []any
		if err != nil || json.Unmarshal(body, &lib) != nil {
			reply(w, 400, []byte(`{"error":"invalid library"}`), "")
			return
		}
		mu.Lock()
		if os.WriteFile(libFile+".tmp", body, 0o644) == nil {
			os.Rename(libFile+".tmp", libFile)
		}
		mu.Unlock()
		reply(w, 204, nil, "")
	case "/state":
		if !isLocal(r) {
			reply(w, 403, []byte(`{"error":"only the laptop can change the state"}`), "")
			return
		}
		var data map[string]any
		if err := decode(io.LimitReader(r.Body, 64<<20), &data); err != nil || data == nil {
			reply(w, 400, []byte(`{"error":"invalid state"}`), "")
			return
		}
		if _, ok := data["list"].([]any); !ok {
			reply(w, 400, []byte(`{"error":"invalid state"}`), "")
			return
		}
		mu.Lock()
		state = data
		tmp := saveFile + ".tmp"
		if err := os.WriteFile(tmp, encode(state), 0o644); err == nil {
			os.Rename(tmp, saveFile)
			backupDaily()
		} else {
			fmt.Printf("  (couldn't save: %v)\n", err)
		}
		mu.Unlock()
		reply(w, 204, nil, "")
	default:
		reply(w, 404, []byte("{}"), "")
	}
}

func background(w http.ResponseWriter, r *http.Request, path string) {
	if !isLocal(r) {
		reply(w, 403, []byte(`{"error":"only the laptop can do this"}`), "")
		return
	}
	if path == "/bg-delete" {
		var d map[string]any
		decode(io.LimitReader(r.Body, 500), &d)
		name, _ := d["file"].(string)
		if bgName.MatchString(name) {
			os.Remove(filepath.Join(bgDir, name))
		}
		reply(w, 204, nil, "")
		return
	}
	if r.ContentLength <= 0 || r.ContentLength > 25<<20 {
		reply(w, 413, []byte(`{"error":"The picture must be smaller than 25 MB"}`), "")
		return
	}
	data, err := io.ReadAll(io.LimitReader(r.Body, 25<<20+1))
	if err != nil {
		reply(w, 400, []byte(`{"error":"Upload failed"}`), "")
		return
	}
	var ext string
	switch {
	case bytes.HasPrefix(data, []byte{0xff, 0xd8, 0xff}):
		ext = "jpg"
	case bytes.HasPrefix(data, []byte("\x89PNG\r\n\x1a\n")):
		ext = "png"
	case len(data) > 12 && string(data[:4]) == "RIFF" && string(data[8:12]) == "WEBP":
		ext = "webp"
	default:
		reply(w, 415, []byte(`{"error":"Use a JPG, PNG or WebP picture"}`), "")
		return
	}
	os.MkdirAll(bgDir, 0o755)
	sum := sha1.Sum(data)
	name := hex.EncodeToString(sum[:])[:12] + "." + ext
	if err := os.WriteFile(filepath.Join(bgDir, name), data, 0o644); err != nil {
		reply(w, 500, []byte(`{"error":"Couldn't save the picture"}`), "")
		return
	}
	reply(w, 200, encode(map[string]string{"file": name}), "")
}

// backupDaily keeps one copy of the state per day in backups/, for the last 30 days.
func backupDaily() {
	os.MkdirAll(backupDir, 0o755)
	target := filepath.Join(backupDir, "state-"+time.Now().Format("2006-01-02")+".json")
	if _, err := os.Stat(target); err == nil {
		return
	}
	b, err := os.ReadFile(saveFile)
	if err != nil || os.WriteFile(target, b, 0o644) != nil {
		fmt.Println("  (backup failed)")
		return
	}
	entries, _ := os.ReadDir(backupDir)
	var olds []string
	for _, e := range entries {
		if strings.HasPrefix(e.Name(), "state-") && strings.HasSuffix(e.Name(), ".json") {
			olds = append(olds, e.Name())
		}
	}
	sort.Strings(olds)
	for i := 0; i < len(olds)-30; i++ {
		os.Remove(filepath.Join(backupDir, olds[i]))
	}
}

type badRequest struct{}

// num accepts a JSON number in [lo, hi] and returns it as a whole number (like Python's int()).
func num(v any, lo, hi float64) int64 {
	n, ok := v.(json.Number)
	if !ok {
		panic(badRequest{})
	}
	f, err := n.Float64()
	if err != nil || f < lo || f > hi {
		panic(badRequest{})
	}
	return int64(f)
}

func str(v any) string {
	switch x := v.(type) {
	case nil:
		return "None"
	case string:
		return x
	case bool:
		if x {
			return "True"
		}
		return "False"
	default:
		return fmt.Sprint(x)
	}
}

func cut(s string, n int) string {
	r := []rune(s)
	if len(r) > n {
		return string(r[:n])
	}
	return s
}

func truthy(v any) bool {
	switch x := v.(type) {
	case nil:
		return false
	case bool:
		return x
	case string:
		return x != ""
	case json.Number:
		f, _ := x.Float64()
		return f != 0
	case []any:
		return len(x) > 0
	case map[string]any:
		return len(x) > 0
	}
	return true
}

// playerAction: a phone may only change its own character.
func playerAction(w http.ResponseWriter, r *http.Request) {
	act, ok := parseAction(r)
	if !ok {
		reply(w, 400, []byte(`{"error":"invalid request"}`), "")
		return
	}
	mu.Lock()
	defer mu.Unlock()
	st := state
	if st == nil {
		st = map[string]any{}
	}
	if st["playerEdits"] == false && act["action"] != "php" && act["action"] != "pmode" && act["action"] != "sheet" { // sharing HP isn't changing the fight
		reply(w, 403, []byte(`{"error":"the DM has locked changes"}`), "")
		return
	}
	list, _ := st["list"].([]any)
	id := act["id"].(string)
	found := false
	for _, it := range list {
		if c, ok := it.(map[string]any); ok && str(c["id"]) == id && c["kind"] == "pc" && !truthy(c["hidden"]) {
			found = true
		}
	}
	a := act["action"].(string)
	if a == "chp" { // the companion of a player in the fight
		pcs := map[string]bool{}
		for _, it := range list {
			if c, ok := it.(map[string]any); ok && c["kind"] == "pc" && !truthy(c["hidden"]) {
				pcs[str(c["id"])] = true
			}
		}
		found = false
		for _, it := range list {
			if c, ok := it.(map[string]any); ok && str(c["id"]) == id && pcs[str(c["owner"])] && !truthy(c["hidden"]) {
				found = true
			}
		}
	}
	if found && a == "gift" {
		to := act["to"].(string)
		found = false
		for _, it := range list {
			if c, ok := it.(map[string]any); ok && to != id && str(c["id"]) == to && c["kind"] == "pc" && !truthy(c["hidden"]) {
				found = true
			}
		}
	}
	if found && a == "giftuse" {
		found = false
		for _, it := range list {
			if c, ok := it.(map[string]any); ok && str(c["id"]) == id {
				gs, _ := c["gifts"].([]any)
				for _, g := range gs {
					if gm, ok := g.(map[string]any); ok && str(gm["id"]) == act["gid"] {
						found = true
					}
				}
			}
		}
	}
	if found && a == "effect_add" {
		visible := map[string]bool{}
		for _, it := range list {
			if c, ok := it.(map[string]any); ok && !truthy(c["hidden"]) {
				visible[str(c["id"])] = true
			}
		}
		var keep []string
		for _, t := range act["targets"].([]string) {
			if visible[t] {
				keep = append(keep, t)
			}
		}
		if keep == nil {
			keep = []string{}
		}
		act["targets"] = keep
		found = len(keep) > 0 || act["area"].(bool)
	}
	if found && a == "answer" {
		call, _ := st["call"].(map[string]any)
		found = call != nil && str(call["id"]) == act["call"]
		if found {
			if to, ok := call["to"].([]any); ok && len(to) > 0 {
				in := false
				for _, t := range to {
					if str(t) == id {
						in = true
					}
				}
				found = in
			}
		}
	}
	if !found && a == "roll" {
		for _, it := range list {
			if c, ok := it.(map[string]any); ok && str(c["id"]) == id && c["kind"] == "pc" {
				found = true
			}
		}
	}
	if found && a == "concans" {
		found = false
		asks, _ := st["concAsk"].([]any)
		for _, it := range asks {
			if q, ok := it.(map[string]any); ok && str(q["id"]) == act["ask"] && str(q["cid"]) == id {
				found = true
			}
		}
	}
	if found && a == "effect_rm" {
		found = false
		effs, _ := st["effects"].([]any)
		for _, it := range effs {
			if e, ok := it.(map[string]any); ok && str(e["id"]) == act["eid"] && str(e["by"]) == id {
				found = true
			}
		}
	}
	if !found {
		reply(w, 404, []byte(`{"error":"character not in combat"}`), "")
		return
	}
	if len(pending) < 300 {
		pending = append(pending, act)
	}
	reply(w, 204, nil, "")
}

func parseAction(r *http.Request) (act map[string]any, ok bool) {
	defer func() {
		if e := recover(); e != nil {
			act, ok = nil, false
		}
	}()
	if r.ContentLength > 48000 { // a character sheet is the biggest thing a phone sends
		return nil, false
	}
	var data map[string]any
	if err := decode(io.LimitReader(r.Body, 48001), &data); err != nil || data == nil {
		return nil, false
	}
	action := "init"
	if v, has := data["action"]; has {
		s, isStr := v.(string)
		if !isStr {
			return nil, false
		}
		action = s
	}
	act = map[string]any{"id": str(data["id"]), "action": action}
	if v, has := data["nat"]; has && v != nil { // the die itself, for the session's dice statistics
		act["nat"] = num(v, 1, 20)
	}
	switch action {
	case "init":
		v, has := data["value"]
		if !has {
			v = data["init"]
		}
		act["value"] = num(v, -10, 60)
	case "cond":
		c, _ := data["cond"].(string)
		if !playerCond[c] {
			return nil, false
		}
		act["cond"], act["on"] = c, truthy(data["on"])
	case "exh":
		act["level"] = num(data["level"], 0, 6)
	case "ds":
		act["s"], act["f"] = num(data["s"], 0, 3), num(data["f"], 0, 3)
	case "effect_add":
		name := strings.TrimSpace(str(data["name"]))
		if _, has := data["name"]; !has {
			name = ""
		}
		targets, isList := data["targets"].([]any)
		area := truthy(data["area"])
		minT := 1
		if area {
			minT = 0
		}
		n := len([]rune(name))
		if n < 1 || n > 30 || !isList || len(targets) < minT || len(targets) > 16 {
			return nil, false
		}
		ts := []string{}
		for _, t := range targets {
			ts = append(ts, str(t))
		}
		act["name"], act["targets"], act["conc"], act["area"] = name, ts, truthy(data["conc"]), area
		src := "" // which printing of the spell (PHB or XPHB…)
		if v, ok := data["src"].(string); ok {
			for _, r := range v {
				if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == ':' || r == '_' || r == '-' {
					src += string(r)
				}
			}
		}
		act["src"] = cut(src, 20)
	case "hpstate":
		act["bloodied"], act["down"] = truthy(data["bloodied"]), truthy(data["down"])
	case "roll":
		k, _ := data["kind"].(string)
		if k != "nat20" && k != "nat1" && k != "roll" {
			return nil, false
		}
		text := ""
		if v, has := data["text"]; has {
			text = str(v)
		}
		total := any(json.Number("0"))
		if v, has := data["total"]; has {
			total = v
		}
		act["kind"], act["text"], act["total"] = k, cut(text, 40), num(total, -50, 999)
	case "answer":
		call := ""
		if v, has := data["call"]; has {
			call = str(v)
		}
		act["call"], act["value"] = cut(call, 20), num(data["value"], -20, 99)
	case "tag":
		t, _ := data["tag"].(string)
		if !tags[t] {
			return nil, false
		}
		act["tag"], act["on"] = t, truthy(data["on"])
	case "cover":
		c, isStr := data["cover"].(string)
		if !isStr || !covers[c] {
			return nil, false
		}
		act["cover"] = c
	case "effect_rm":
		eid := ""
		if v, has := data["eid"]; has {
			eid = str(v)
		}
		act["eid"] = cut(eid, 40)
	case "concans": // the answer to the DM's Concentration save ask
		ask := ""
		if v, has := data["ask"]; has {
			ask = str(v)
		}
		okv, _ := data["ok"].(bool)
		act["ask"], act["ok"] = cut(ask, 20), okv
		if v, has := data["total"]; has && v != nil {
			act["total"] = num(v, -20, 99)
		} else {
			act["total"] = nil
		}
	case "gift": // Bardic Inspiration and the like, to another player
		die := str(data["die"])
		name := strings.TrimSpace(str(data["name"]))
		if _, has := data["name"]; !has {
			name = ""
		}
		if die != "d4" && die != "d6" && die != "d8" && die != "d10" && die != "d12" || name == "" {
			return nil, false
		}
		act["to"], act["name"], act["die"] = cut(str(data["to"]), 20), cut(name, 30), die
	case "giftuse":
		act["gid"] = cut(str(data["gid"]), 20)
		r := any(0.0)
		if v, has := data["roll"]; has {
			r = v
		}
		act["roll"] = num(r, 0, 12)
	case "stats": // AC and passive scores, for the DM's party sheet
		for _, k := range []string{"ac", "pp", "pi", "pv", "dc"} {
			v := any(0.0)
			if x, has := data[k]; has {
				v = x
			}
			act[k] = num(v, 0, 40)
		}
	case "sheet": // 79: the player's character sheet, kept on the laptop
		sh, isMap := data["sheet"].(map[string]any)
		if !isMap || len(encode(sh)) > 40000 {
			return nil, false
		}
		act["sheet"] = sh
	case "spfx": // R1: the player's spell plays in the scene on the tablet and the TV
		n, t := "", ""
		if v, has := data["n"]; has {
			n = cut(strings.TrimSpace(str(v)), 40)
		}
		if v, has := data["t"]; has {
			t = strings.ToLower(str(v))
		}
		if n == "" || !map[string]bool{"": true, "fire": true, "cold": true, "lightning": true, "thunder": true, "necrotic": true, "radiant": true, "acid": true, "poison": true, "psychic": true, "force": true, "bludgeoning": true, "piercing": true, "slashing": true}[t] {
			return nil, false
		}
		act["n"], act["t"] = n, t
	case "pmode": // the player uses the simple phone
		act["simple"] = truthy(data["simple"])
	case "php": // the player's own HP, for the DM only
		act["off"] = truthy(data["off"])
		if !truthy(data["off"]) {
			g := func(k string) any {
				if v, has := data[k]; has {
					return v
				}
				return 0.0
			}
			act["cur"], act["max"], act["temp"] = num(g("cur"), 0, 9999), num(g("max"), 1, 9999), num(g("temp"), 0, 999)
		}
	case "chp": // a player's companion: its HP
		k := str(data["kind"])
		if k != "dmg" && k != "heal" && k != "temp" {
			return nil, false
		}
		act["kind"], act["n"] = k, num(data["n"], 0, 999)
	default:
		return nil, false
	}
	return act, true
}

// ---------- start ----------

func openBrowser(url string) {
	switch runtime.GOOS {
	case "windows":
		exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		exec.Command("open", url).Start()
	default:
		exec.Command("xdg-open", url).Start()
	}
}

func waitAndExit() {
	fmt.Println("Press Enter to close this window...")
	bufio.NewReader(os.Stdin).ReadString('\n')
	os.Exit(1)
}

func main() {
	exe, err := os.Executable()
	if err == nil {
		exe, _ = filepath.EvalSymlinks(exe)
		here = filepath.Dir(exe)
	} else {
		here, _ = os.Getwd()
	}
	if d := os.Getenv("ROUNDKEEPER_DIR"); d != "" {
		here = d
	} else if d := os.Getenv("TABLE_INITIATIVE_DIR"); d != "" { // the old name still works
		here = d
	}
	saveFile = filepath.Join(here, "state.json")
	bgDir = filepath.Join(here, "backgrounds")
	libFile = filepath.Join(here, "library.json")
	dmFile = filepath.Join(here, "dm-devices.json")
	backupDir = filepath.Join(here, "backups")
	fetStatus() // starts reading a 5etools folder in the background, if there is one
	for _, f := range []string{saveFile, filepath.Join(here, "stanje.json")} {
		if b, err := os.ReadFile(f); err == nil {
			var st map[string]any
			if decode(bytes.NewReader(b), &st) == nil && st != nil {
				state = st
				break
			}
		}
	}
	// a quick write test: a .exe inside a protected folder can't keep its data
	if f, err := os.CreateTemp(here, ".write-test-*"); err == nil {
		f.Close()
		os.Remove(f.Name())
	} else {
		fmt.Printf("This folder can't be written to:\n  %s\nMove Roundkeeper.exe to a normal folder, e.g. Documents\\Roundkeeper.\n", here)
		waitAndExit()
	}

	mux := http.HandlerFunc(handler)
	quiet := log.New(io.Discard, "", 0)
	ln, err := net.Listen("tcp4", fmt.Sprintf("0.0.0.0:%d", port))
	if err != nil {
		fmt.Printf("Port %d is already in use. Is Roundkeeper already running in another window?\n", port)
		waitAndExit()
	}
	go func() {
		srv := &http.Server{Handler: mux, ErrorLog: quiet}
		if err := srv.Serve(ln); err != nil {
			fmt.Println("Server stopped:", err)
		}
	}()

	certPEM, e1 := asset("cert.pem")
	keyPEM, e2 := asset("key.pem")
	if b, err := os.ReadFile(filepath.Join(here, "cert.pem")); err == nil {
		if k, err2 := os.ReadFile(filepath.Join(here, "key.pem")); err2 == nil {
			certPEM, keyPEM, e1, e2 = b, k, nil, nil
		}
	}
	if e1 != nil || e2 != nil { // no certificate shipped: this install makes its own, once, and keeps it next to the program
		if c, k, err := makeCert(here); err == nil {
			certPEM, keyPEM, e1, e2 = c, k, nil, nil
		}
	}
	if e1 == nil && e2 == nil {
		if cert, err := tls.X509KeyPair(certPEM, keyPEM); err == nil {
			if tl, err := net.Listen("tcp4", fmt.Sprintf("0.0.0.0:%d", httpsPort)); err == nil {
				hasTLS = true
				go (&http.Server{Handler: mux, ErrorLog: quiet, TLSConfig: &tls.Config{Certificates: []tls.Certificate{cert}}}).ServeTLS(tl, "", "")
			} else {
				fmt.Printf("  (https didn't start: %v)\n", err)
			}
		}
	}

	ips := lanIPs()
	dm := fmt.Sprintf("http://127.0.0.1:%d/", port)
	line := strings.Repeat("=", 60)
	fmt.Println(line)
	fmt.Println("  Roundkeeper is running")
	fmt.Printf("  DM (this laptop):              %s\n", dm)
	fmt.Printf("  Players (tablet and phones):  http://%s:%d/players\n", ips[0], port)
	for _, ip := range ips[1:] {
		fmt.Printf("  or try:                        http://%s:%d/players\n", ip, port)
	}
	if hasTLS {
		fmt.Printf("  https (phones):                https://%s:%d/players\n", ips[0], httpsPort)
		fmt.Println("  (the first time, the browser warns about the certificate: Advanced -> Proceed)")
	}
	fmt.Printf("  Your data is kept in:          %s\n", here)
	fmt.Println("  If Windows asks whether to allow network access, choose Allow (private networks).")
	fmt.Println("  Close this window to stop the server.")
	fmt.Println("  When the tablet or a phone opens the page, it shows up here.")
	fmt.Println(line)
	if os.Getenv("ROUNDKEEPER_NO_BROWSER") == "" && os.Getenv("TABLE_INITIATIVE_NO_BROWSER") == "" {
		time.AfterFunc(800*time.Millisecond, func() { openBrowser(dm) })
	}
	select {}
}

var _ fs.FS = assets

// makeCert writes a self-signed certificate for the https address (phones that need a secure page).
// Each install has its own key; none is shipped with the program.
func makeCert(dir string) ([]byte, []byte, error) {
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, nil, err
	}
	sn, _ := rand.Int(rand.Reader, big.NewInt(1<<62))
	tpl := x509.Certificate{
		SerialNumber: sn, Subject: pkix.Name{CommonName: "Roundkeeper (this computer)"},
		NotBefore: time.Now().Add(-time.Hour), NotAfter: time.Now().AddDate(10, 0, 0),
		KeyUsage: x509.KeyUsageDigitalSignature, ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		DNSNames: []string{"localhost"}, IPAddresses: []net.IP{net.ParseIP("127.0.0.1")},
	}
	for _, ip := range lanIPs() {
		if p := net.ParseIP(ip); p != nil {
			tpl.IPAddresses = append(tpl.IPAddresses, p)
		}
	}
	der, err := x509.CreateCertificate(rand.Reader, &tpl, &tpl, &key.PublicKey, key)
	if err != nil {
		return nil, nil, err
	}
	kb, err := x509.MarshalECPrivateKey(key)
	if err != nil {
		return nil, nil, err
	}
	c := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
	k := pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: kb})
	os.WriteFile(filepath.Join(dir, "cert.pem"), c, 0644)
	os.WriteFile(filepath.Join(dir, "key.pem"), k, 0600)
	return c, k, nil
}
