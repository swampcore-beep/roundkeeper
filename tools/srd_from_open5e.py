"""Build srd/srd-5.2.1.json, the game data the app comes with, from Open5e's transcription of the SRD.

The System Reference Document 5.2.1 is by Wizards of the Coast and licensed under CC BY 4.0. Open5e
(https://github.com/open5e/open5e-api) keeps it as structured data in data/v2/wizards-of-the-coast/srd-2024.
This turns that into the common homebrew JSON format the app already reads (monster, spell, item,
condition, variantrule), all with the source "SRD52".

    python3 tools/srd_from_open5e.py path/to/open5e-api/data/v2/wizards-of-the-coast/srd-2024
"""
import json
import os
import re
import sys

SRC = "SRD52"
SIZE = {"tiny": "T", "small": "S", "medium": "M", "large": "L", "huge": "H", "gargantuan": "G"}
SCHOOL = {"abjuration": "A", "conjuration": "C", "divination": "D", "enchantment": "E", "evocation": "V",
          "illusion": "I", "necromancy": "N", "transmutation": "T"}
AREA = {"sphere": "S", "cube": "C", "cone": "N", "cylinder": "Y", "line": "L"}
ABIL = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]
CONDITIONS = ["Blinded", "Charmed", "Deafened", "Exhaustion", "Frightened", "Grappled", "Incapacitated", "Invisible",
              "Paralyzed", "Petrified", "Poisoned", "Prone", "Restrained", "Stunned", "Unconscious"]
ITEM_TYPE = {"ring": "RG", "potion": "P", "wand": "WD", "staff": "ST", "rod": "RD", "scroll": "SC", "ammunition": "A",
             "adventuring-gear": "G", "tools": "T", "mount": "MNT", "waterborne-vehicle": "VEH", "land-vehicle": "VEH",
             "spellcasting-focus": "SCF", "equipment-pack": "G"}
ALIGN = {"lawful": "L", "neutral": "N", "chaotic": "C", "good": "G", "evil": "E", "unaligned": "U"}


def load(d, name):
    with open(os.path.join(d, name + ".json"), encoding="utf-8") as f:
        return json.load(f)


def cr_text(v):
    x = float(v)
    return {0.125: "1/8", 0.25: "1/4", 0.5: "1/2"}.get(x, str(int(x)) if x == int(x) else str(x))


def table(lines):
    """A markdown table as a table entry."""
    rows = [[c.strip() for c in ln.strip().strip("|").split("|")] for ln in lines if not re.match(r"^\s*\|?\s*:?-{2,}", ln)]
    if not rows:
        return None
    return {"type": "table", "colLabels": rows[0], "rows": rows[1:]}


def entries(text):
    """Paragraphs, bullet lists and tables, the way the homebrew format writes them."""
    out = []
    for block in re.split(r"\n\s*\n", str(text or "").strip()):
        lines = [ln for ln in block.split("\n") if ln.strip()]
        if not lines:
            continue
        if all(ln.strip().startswith("|") for ln in lines):
            t = table(lines)
            if t:
                out.append(t)
            continue
        para, items = [], []
        for ln in lines:
            m = re.match(r"^\s*[-*] (.*)$", ln)
            if m:
                items.append(m.group(1).strip())
            elif items:
                items[-1] += " " + ln.strip()
            else:
                para.append(ln.strip())
        if para:
            out.append(" ".join(para))
        if items:
            out.append({"type": "list", "items": items})
    return out


def tag_conditions(s):
    return re.sub(r"\b(" + "|".join(CONDITIONS) + r")\b(?= condition)", r"{@condition \1}", s)


def walk(es, fn):
    out = []
    for e in es:
        if isinstance(e, str):
            out.append(fn(e))
        elif isinstance(e, dict) and e.get("type") == "list":
            out.append(dict(e, items=[fn(x) for x in e["items"]]))
        else:
            out.append(e)
    return out


def fix_attack(s):
    """Open5e drops the "Hit:" after an attack's reach or range; the statblock reader wants it."""
    rr = r"(?:reach \d+ ft\.|range [\d/]+ ft\.)"
    return re.sub(r"((?:Melee|Ranged|Melee or Ranged) Attack Roll: [+−-]\d+, " + rr + r"(?: or " + rr + r")?) (?!Hit)", r"\1 Hit: ", s)


def spell_tag(name):
    m = re.match(r"^\s*([^()]+?)\s*(\(.*\))?\s*$", name)
    if not m:
        return name
    return "{@spell " + m.group(1).lower() + "}" + (" " + m.group(2) if m.group(2) else "")


def spellcasting(a):
    """The Spellcasting action as a spellcasting block: header, At Will, X/Day."""
    desc = a["desc"]
    head, _, rest = desc.partition("\n\n")
    block = {"name": a["name"], "type": "spellcasting", "headerEntries": [head.strip()], "displayAs": "action", "ability": None}
    m = re.search(r"using (\w+) as the spellcasting ability", head)
    if m:
        block["ability"] = m.group(1)[:3].lower()
    else:
        block.pop("ability")
    found = False
    for ln in rest.split("\n"):
        m = re.match(r"^\s*[-*]\s*\*\*(.+?):\*\*\s*(.*)$", ln)
        if not m:
            continue
        found = True
        when, spells = m.group(1).strip(), [spell_tag(x) for x in re.split(r",\s*(?![^()]*\))", m.group(2)) if x.strip()]
        d = re.match(r"(\d+)/Day( Each)?", when, re.I)
        if when.lower().startswith("at will"):
            block.setdefault("will", []).extend(spells)
        elif d:
            block.setdefault("daily", {})[d.group(1) + ("e" if d.group(2) else "")] = spells
        else:
            block.setdefault("footerEntries", []).append(f"**{when}:** " + ", ".join(spells))
    return block if found else None


def action_name(a):
    n, ut, p = a["name"], a.get("uses_type"), a.get("uses_param")
    n = re.sub(r"\((Recharge \d)-6\)", "(\\1–6)", n)
    if ut in ("RECHARGE_ON_ROLL", "RECHARGE") and p and "Recharge" not in n:
        n += f" (Recharge {p}–6)" if p < 6 else " (Recharge 6)"
    elif ut == "PER_DAY" and p and "/Day" not in n:
        n += f" ({p}/Day)"
    if a.get("legendary_action_cost") and a["legendary_action_cost"] > 1 and "Costs" not in n:
        n += f" (Costs {a['legendary_action_cost']} Actions)"
    return n


def alignment(s):
    s = (s or "").lower().strip()
    if not s:
        return None
    if s in ("neutral", "true neutral"):
        return ["N"]
    if s == "unaligned":
        return ["U"]
    if s.startswith("any"):
        return ["A"]
    codes = [ALIGN[w] for w in s.split() if w in ALIGN]
    return codes if codes and len(codes) == len(s.split()) else [{"special": s}]


def monsters(d):
    C, A, T, AT = load(d, "Creature"), load(d, "CreatureAction"), load(d, "CreatureTrait"), load(d, "CreatureActionAttack")
    acts, traits = {}, {}
    for a in A:
        acts.setdefault(a["fields"]["parent"], []).append(a["fields"])
    for t in T:
        traits.setdefault(t["fields"]["parent"], []).append(t["fields"])
    out = []
    for c in C:
        f, pk = c["fields"], c["pk"]
        if f.get("document") != "srd-2024":
            continue
        m = {"name": f["name"], "source": SRC, "size": [SIZE.get(f["size"], "M")], "type": f["type"]}
        al = alignment(f.get("alignment"))
        if al:
            m["alignment"] = al
        m["ac"] = [{"ac": f["armor_class"], "from": [f["armor_detail"]]}] if f.get("armor_detail") else [f["armor_class"]]
        m["hp"] = {"average": f["hit_points"], "formula": f.get("hit_dice") or ""}
        sp = {k: f[k] for k in ("walk", "burrow", "climb", "fly", "swim") if f.get(k)}
        if f.get("hover"):
            sp["canHover"] = True
        m["speed"] = sp or {"walk": 0}
        for ab in ABIL:
            m[ab[:3]] = f[f"ability_score_{ab}"]
        if f.get("initiative_bonus") is not None:
            m["initiative"] = f["initiative_bonus"]
        save = {}
        for ab in ABIL:
            v, mod = f.get(f"saving_throw_{ab}"), (f[f"ability_score_{ab}"] - 10) // 2
            if v is not None and v != mod:
                save[ab[:3]] = f"{v:+d}"
        if save:
            m["save"] = save
        skill = {k[len("skill_bonus_"):].replace("_", " "): f"{v:+d}" for k, v in f.items() if k.startswith("skill_bonus_") and v is not None}
        if skill:
            m["skill"] = skill
        senses = [f"{n} {f[n + '_range']} ft." for n in ("blindsight", "darkvision", "tremorsense", "truesight") if f.get(n + "_range")]
        if senses:
            m["senses"] = senses
        if f.get("passive_perception") is not None:
            m["passive"] = f["passive_perception"]
        for key, ok in (("vulnerable", "damage_vulnerabilities_display"), ("resist", "damage_resistances_display"),
                        ("immune", "damage_immunities_display"), ("conditionImmune", "condition_immunities_display")):
            if f.get(ok):
                m[key] = [f[ok]]
        if f.get("languages_desc"):
            m["languages"] = [f["languages_desc"]]
        m["cr"] = cr_text(f["challenge_rating"])
        tr = [{"name": t["name"], "entries": walk(entries(t["desc"]), lambda s: tag_conditions(fix_attack(s)))} for t in traits.get(pk, [])]
        if tr:
            m["trait"] = tr
        groups = {"ACTION": "action", "BONUS_ACTION": "bonus", "REACTION": "reaction", "LEGENDARY_ACTION": "legendary"}
        casts = []
        for a in sorted(acts.get(pk, []), key=lambda a: (a.get("order_in_statblock") or 0)):
            g = groups.get(a["action_type"], "action")
            if a["name"].startswith("Spellcasting") and "\n" in a["desc"]:
                sc = spellcasting(a)
                if sc:
                    sc["displayAs"] = g
                    casts.append(sc)
                    continue
            m.setdefault(g, []).append({"name": action_name(a), "entries": walk(entries(a["desc"]), lambda s: tag_conditions(fix_attack(s)))})
        if casts:
            m["spellcasting"] = casts
        if m.get("legendary"):
            m["legendaryActions"] = 3
            if any("in Lair" in t["name"] for t in tr):
                m["legendaryActionsLair"] = 4
        out.append(m)
    return out


def duration(text, conc):
    t = (text or "").strip().lower()
    m = re.match(r"^(\d+) (round|minute|hour|day|week)s?$", t)
    if m:
        d = {"type": "timed", "duration": {"type": m.group(2), "amount": int(m.group(1))}}
    elif t.startswith("instant"):
        d = {"type": "instant"}
    elif t.startswith("until dispelled"):
        d = {"type": "permanent", "ends": ["dispel"] + (["trigger"] if "trigger" in t else [])}
    else:
        d = {"type": "special"}
    if conc:
        d["concentration"] = True
    return [d]


def spells(d):
    out = []
    for s in load(d, "Spell"):
        f = s["fields"]
        if f.get("document") != "srd-2024":
            continue
        unit = {"action": "action", "bonus-action": "bonus", "reaction": "reaction"}.get(f["casting_time"])
        if unit:
            time = {"number": 1, "unit": unit}
        else:
            m = re.match(r"(\d+)(minute|hour)s?", f["casting_time"])
            time = {"number": int(m.group(1)), "unit": m.group(2)} if m else {"number": 1, "unit": "action"}
        if unit == "reaction" and f.get("reaction_condition"):
            time["condition"] = f["reaction_condition"]
        rt = (f.get("range_text") or "").strip()
        m = re.match(r"^(\d+) (feet|foot|miles?)$", rt)
        if m:
            rng = {"type": "point", "distance": {"type": "miles" if m.group(2).startswith("mile") else "feet", "amount": int(m.group(1))}}
        elif rt.lower() in ("self", "touch", "sight", "unlimited"):
            rng = {"type": "point", "distance": {"type": rt.lower()}}
        else:
            rng = {"type": "special"}
        comp = {}
        if f.get("verbal"):
            comp["v"] = True
        if f.get("somatic"):
            comp["s"] = True
        if f.get("material"):
            comp["m"] = f.get("material_specified") or True
        sp = {"name": f["name"], "source": SRC, "level": f["level"], "school": SCHOOL.get(f["school"], "V"), "time": [time],
              "range": rng, "components": comp, "duration": duration(f.get("duration"), f.get("concentration")),
              "entries": walk(entries(f["desc"]), tag_conditions)}
        if f.get("higher_level"):
            sp["entriesHigherLevel"] = [{"type": "entries", "name": "Cantrip Upgrade" if f["level"] == 0 else "Using a Higher-Level Spell Slot",
                                         "entries": entries(f["higher_level"])}]
        if f.get("ritual"):
            sp["meta"] = {"ritual": True}
        cls = [c.split("_", 1)[-1].title() for c in f.get("classes") or []]
        if cls:
            sp["classes"] = {"fromClassList": [{"name": c, "source": SRC} for c in cls]}
        if f.get("damage_types"):
            sp["damageInflict"] = [x.lower() for x in f["damage_types"]]
        if f.get("saving_throw_ability"):
            sp["savingThrow"] = [f["saving_throw_ability"].lower()]
        if f.get("shape_type") in AREA:
            sp["areaTags"] = [AREA[f["shape_type"]]]
        out.append(sp)
    return out


def items(d):
    out = []
    for it in load(d, "MagicItem"):
        f = it["fields"]
        if f.get("document") != "srd-2024" or re.match(r"^\+\d ", f["name"]):   # +1 Longsword, +2 Dagger…: one per weapon is just noise
            continue
        x = {"name": f["name"], "source": SRC, "rarity": (f.get("rarity") or "unknown").replace("-", " "), "entries": entries(f["desc"])}
        cat = f.get("category")
        if cat == "wondrous-item":
            x["wondrous"] = True
        elif cat in ITEM_TYPE:
            x["type"] = ITEM_TYPE[cat]
        elif cat == "weapon":
            x["weapon"] = True
        elif cat == "armor":
            x["armor"] = True
        if f.get("requires_attunement"):
            x["reqAttune"] = True
        out.append(x)
    for it in load(d, "Item"):
        f = it["fields"]
        if f.get("document") != "srd-2024":
            continue
        x = {"name": f["name"], "source": SRC, "rarity": "none", "entries": entries(f.get("desc") or "")}
        cat = f.get("category")
        if cat in ITEM_TYPE:
            x["type"] = ITEM_TYPE[cat]
        try:
            if float(f.get("cost") or 0):
                x["value"] = round(float(f["cost"]) * 100)
            if float(f.get("weight") or 0):
                x["weight"] = float(f["weight"])
        except ValueError:
            pass
        out.append(x)
    seen, uniq = set(), []
    for x in out:
        k = x["name"].lower()
        if k not in seen:
            seen.add(k)
            uniq.append(x)
    return uniq


def conditions(d):
    out = []
    for c in load(d, "ConditionDescription"):
        f = c["fields"]
        if f.get("document") != "srd-2024":
            continue
        name = f["describes"].replace("-", " ").title()
        out.append({"name": name, "source": SRC, "entries": entries(f["desc"])})
    return out


def rules(d):
    sets = {r["pk"]: r["fields"]["name"] for r in load(d, "RuleSet")}
    names = {}
    for r in load(d, "Rule"):
        names[r["fields"]["name"].lower()] = names.get(r["fields"]["name"].lower(), 0) + 1
    out = []
    for r in sorted(load(d, "Rule"), key=lambda r: (r["fields"].get("ruleset") or "", r["fields"].get("index") or 0)):
        f = r["fields"]
        if f.get("document") != "srd-2024":
            continue
        name = f["name"] if names[f["name"].lower()] == 1 else f"{f['name']} ({sets.get(f.get('ruleset'), '')})"
        out.append({"name": name, "source": SRC, "ruleType": "C", "entries": entries(f["desc"])})
    return out


def main():
    d = sys.argv[1]
    data = {
        "_meta": {"sources": [{"json": SRC, "abbreviation": "SRD", "full": "SRD 5.2.1", "version": "5.2.1",
                               "authors": ["Wizards of the Coast"], "convertedBy": ["Open5e"],
                               "url": "https://www.dndbeyond.com/srd"}],
                  "license": ("This work includes material from the System Reference Document 5.2.1 (\"SRD 5.2.1\") by Wizards of the Coast LLC, "
                              "available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 "
                              "International License, available at https://creativecommons.org/licenses/by/4.0/legalcode. "
                              "Transcribed as data by Open5e (https://github.com/open5e/open5e-api) and converted for Roundkeeper.")},
        "monster": monsters(d), "spell": spells(d), "item": items(d), "condition": conditions(d), "variantrule": rules(d),
    }
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.makedirs(os.path.join(here, "srd"), exist_ok=True)
    with open(os.path.join(here, "srd", "srd-5.2.1.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print({k: len(v) for k, v in data.items() if isinstance(v, list)})


if __name__ == "__main__":
    main()
