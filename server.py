#!/usr/bin/env python3
"""Roundkeeper - local server.
Copyright (C) 2026 swampcore-beep. Licensed under the GNU AGPL v3 or later; see LICENSE.
Source: https://github.com/swampcore-beep/roundkeeper

Run it on the laptop (python server.py). The DM window opens on the laptop,
and the tablet (or any device on the same Wi-Fi) opens the address the
server prints, e.g. http://192.168.1.23:8765/players
Players open the same address on their phones and manage their own initiative and conditions.
If cert.pem and key.pem are in the folder, it also runs on https://...:8766/players
(for browsers that insist on https, e.g. Chrome on phones).

Only the laptop (127.0.0.1), or a device paired as the DM from it, can change the state; other devices only watch,
plus the narrow set of player actions validated below.
Hidden enemies never leave the laptop.
"""
import hashlib
import json
import os
import re
import shutil
import socket
import ssl
import sys
import threading
import time
import webbrowser
import urllib.parse
import zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = 8765
HTTPS_PORT = 8766
HERE = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(HERE, "initiative.html")
SAVE = os.path.join(HERE, "state.json")
OLD_SAVE = os.path.join(HERE, "stanje.json")   # save file from the earlier Croatian version
CERT = os.path.join(HERE, "cert.pem")
KEY = os.path.join(HERE, "key.pem")
HAS_TLS = os.path.exists(CERT) and os.path.exists(KEY)
FONTS = os.path.join(HERE, "fonts")
BGDIR = os.path.join(HERE, "backgrounds")
DM_DEVICES = os.path.join(HERE, "dm-devices.json")   # other computers paired as the DM (e.g. the laptop, when the server runs on the desktop)
LIBRARY = os.path.join(HERE, "library.json")   # statblocks the DM imported, kept for next time   # pictures the DM uploads for the tablet background
BG_NAME = re.compile(r"^[a-f0-9]{12}\.(jpg|png|webp)$")
BACKUPS = os.path.join(HERE, "backups")
STATIC = {"/manifest.json": None, "/icon-192.png": "image/png", "/icon-512.png": "image/png"}
MANIFEST = json.dumps({"name": "Roundkeeper", "short_name": "Roundkeeper", "start_url": "/players", "display": "fullscreen",
                       "orientation": "any", "background_color": "#14161f", "theme_color": "#14161f",
                       "icons": [{"src": "/icon-192.png", "sizes": "192x192", "type": "image/png"},
                                 {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png"}]}).encode()
TAGS = {"reaction", "readied", "dodge"}
COVERS = {"", "half", "tq", "total"}

lock = threading.Lock()
state = None
last_player = 0.0
last_tv = 0.0   # when the TV last asked for the state
last_tablet = 0.0   # when the tablet last asked (pages that say screen=tablet)
phone_seen = {}   # character id -> when that player's phone last asked; only the DM gets this, from /info
pending_actions = []   # changes players send from their phones; the laptop picks them up and applies them
PLAYER_CONDS = {"Blinded", "Burning", "Charmed", "Deafened", "Frightened", "Grappled", "Incapacitated", "Invisible",
                "Paralyzed", "Petrified", "Poisoned", "Prone", "Restrained", "Stunned", "Unconscious", "Concentrating", "Exhaustion"}

for candidate in (SAVE, OLD_SAVE):
    try:
        with open(candidate, encoding="utf-8") as f:
            state = json.load(f)
        break
    except Exception:
        state = None


def lan_ips():
    """All of the laptop's IPv4 addresses; the first is the one it uses to reach the network."""
    ips = []
    for target in ("8.8.8.8", "192.168.1.1", "10.255.255.255"):
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect((target, 80))  # a UDP connect sends nothing, it just picks the network adapter
            ips.append(s.getsockname()[0])
            break
        except Exception:
            pass
        finally:
            s.close()
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ips.append(info[4][0])
    except Exception:
        pass
    seen, out = set(), []
    for ip in ips:
        if ip not in seen and not ip.startswith(("127.", "169.254.", "0.")):
            seen.add(ip)
            out.append(ip)
    return out or ["127.0.0.1"]


IPS = lan_ips()
IP = IPS[0]
PLAYER_URL = f"http://{IP}:{PORT}/players"
OTHER_URLS = [f"http://{ip}:{PORT}/players" for ip in IPS[1:]]
HTTPS_URL = f"https://{IP}:{HTTPS_PORT}/players" if HAS_TLS else None


def public_view(st):
    """What players get: hidden combatants are never sent, nor the DM's party and encounter lists."""
    if not st:
        return st
    out = dict(st)
    out["list"] = [{k: v for k, v in c.items() if k not in (("hpLog", "ib", "php") if c.get("owner") else ("hp", "hpMax", "thp", "hpLog", "sb", "ib", "php"))}   # monster HP and statblock counters are the DM's secret; a player's own companion is not
                   for c in st.get("list", []) if not c.get("hidden")]
    out.pop("party", None)
    out.pop("sheets", None)   # 79: character sheets go to the DM; a phone asks for its own
    out.pop("encounters", None)
    out.pop("clog", None)   # the combat recap is the DM's notes
    out.pop("cstat", None)
    out.pop("tstat", None)   # turn times and dice statistics are the DM's notes too
    out.pop("nstat", None)
    if isinstance(st.get("clocks"), list):   # a secret countdown is the DM's alone
        out["clocks"] = [k for k in st["clocks"] if isinstance(k, dict) and not k.get("secret")]
    hidden = {c.get("id") for c in st.get("list", []) if c.get("hidden")}
    if hidden and isinstance(st.get("effects"), list):   # a hidden monster's spells, and hidden targets, stay with the DM
        effs = []
        for e in st["effects"]:
            if not isinstance(e, dict) or e.get("by") in hidden:
                continue
            tg = [t for t in e.get("targets") or [] if t not in hidden]
            if e.get("targets") and not tg and not e.get("area"):
                continue
            effs.append(dict(e, targets=tg))
        out["effects"] = effs
    turn = st.get("turn")
    if isinstance(turn, dict) and turn.get("id") not in {c.get("id") for c in out["list"]} and turn.get("id") != "__lair":
        out["turn"] = dict(turn, id=None, init=None)   # a hidden creature's turn: players only see the round
    return out


# ---- DM devices: a paired computer gets a cookie and counts as the laptop; only the computer running the server pairs or removes them
dm_lock = threading.Lock()
dm_codes = {}   # short pairing code -> (expires, name)
PAIR_ABC = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def dm_list():
    try:
        with open(DM_DEVICES, encoding="utf-8") as f:
            d = json.load(f)
        return d if isinstance(d, list) else []
    except Exception:
        return []


def dm_save(lst):
    tmp = DM_DEVICES + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(lst, f, ensure_ascii=False, indent=1)
    os.replace(tmp, DM_DEVICES)


def dm_token_ok(token):
    if not token or len(token) < 20:
        return None
    h = hashlib.sha256(token.encode()).hexdigest()
    with dm_lock:
        lst = dm_list()
        for d in lst:
            if d.get("h") == h:
                if time.time() - d.get("seen", 0) > 60:   # "last seen", without writing on every poll
                    d["seen"] = time.time()
                    dm_save(lst)
                return d
    return None


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def log_error(self, fmt, *args):
        # e.g. a browser that insists on https sends bytes this plain-http server can't read
        stamp = time.strftime("%H:%M:%S")
        print(f"  [{stamp}] Device {self.client_address[0]} connected but sent an unreadable request"
              f" (the browser is probably trying https"
              f"{', have it open ' + HTTPS_URL if HTTPS_URL else ''}): {(fmt % args)[:60]}", flush=True)

    def handle(self):
        try:
            super().handle()
        except (ConnectionResetError, BrokenPipeError):
            pass

    def note_visit(self, path):
        ip = self.client_address[0]
        if self.is_local() or path == "/state":
            return
        stamp = time.strftime("%H:%M:%S")
        print(f"  [{stamp}] Device {ip} opened {path}", flush=True)

    def is_host(self):   # the computer the server runs on
        return self.client_address[0] in ("127.0.0.1", "::1", "::ffff:127.0.0.1")

    def dm_cookie(self):
        for part in (self.headers.get("Cookie") or "").split(";"):
            k, _, v = part.strip().partition("=")
            if k == "ti_dm":
                return v
        return ""

    def is_local(self):   # the DM: the host, or a device paired from it
        if self.is_host():
            return True
        c = self.dm_cookie()
        return bool(c) and dm_token_ok(c) is not None

    def reply(self, code, body=b"", ctype="application/json; charset=utf-8", extra=None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Now", str(int(time.time() * 1000)))   # the laptop's clock, so other devices can line theirs up
        self.send_header("Content-Length", str(len(body)))
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if body:
            self.wfile.write(body)

    def page(self):
        try:
            with open(HTML, "rb") as f:
                self.reply(200, f.read(), "text/html; charset=utf-8")
        except FileNotFoundError:
            self.reply(500, b"initiative.html must be in the same folder as server.py", "text/plain; charset=utf-8")

    def do_GET(self):
        global last_player
        path, _, query = self.path.partition("?")
        self.note_visit(path)
        if path.startswith("/5et/"):
            if not self.is_local():
                return self.reply(403, b"{}")
            if path == "/5et/status":
                return self.reply(200, json.dumps(fet_status(), ensure_ascii=False).encode("utf-8"))
            if path == "/5et/index":
                fet_status()
                db = fet["db"]
                if not db or fet["state"] != "ready":
                    return self.reply(503, json.dumps({"state": fet["state"]}).encode())
                return self.reply(200, db["index"])
            q = {k: urllib.parse.unquote_plus(v) for k, v in (x.split("=", 1) for x in query.split("&") if "=" in x)}
            if path == "/5et/monster":
                try:
                    body = fet_monster(fet_find_monster(q["n"], q.get("s", "")) if q.get("n") else int(q.get("id", "-1")))
                except ValueError:
                    body = None
                return self.reply(200, body) if body else self.reply(404, b"{}")
            if path == "/5et/pics":   # where the pictures come from, for Settings → Pictures
                db = fet["db"]
                return self.reply(200, json.dumps({"count": len(db["imgs"]) if db else 0, "from": db["img_src"] if db else [],
                                                   "folder": os.path.join(HERE, "5etools", "img", "bestiary"), "state": fet["state"]}, ensure_ascii=False).encode("utf-8"))
            if path == "/5et/fluff":
                fl = fet_fluff(q.get("n", ""), q.get("s", ""))
                imgs = []
                for im in fl["images"]:
                    pth = fet_img_path(im)
                    if pth:
                        imgs.append({"p": pth, "ok": pth in fet["db"]["imgs"]})
                return self.reply(200, json.dumps({"entries": fl["entries"], "images": imgs}, ensure_ascii=False).encode("utf-8"))
            if path == "/5et/img":
                b = fet_img_read(q.get("p", ""))
                if b is None:
                    return self.reply(404, b"{}")
                ext = q.get("p", "").lower().rsplit(".", 1)[-1]
                return self.reply(200, b, {"webp": "image/webp", "png": "image/png"}.get(ext, "image/jpeg"))
            if path == "/5et/ref":
                k, ty = (fet_ref_exact if q.get("x") else fet_ref)(q.get("t", "").lower(), q.get("n", ""), q.get("s", ""))
                if not k:
                    return self.reply(404, b"{}")
                db = fet["db"]
                return self.reply(200, ('{"t":"' + ty + '","item":' + db["refs"][k] + ',"label":' +
                                        json.dumps(db["ref_label"].get(k, ""), ensure_ascii=False) + "}").encode("utf-8"))
            if path == "/5et/refindex":
                db = fet["db"]
                if not db or fet["state"] != "ready":
                    return self.reply(503, json.dumps({"state": fet["state"]}).encode())
                return self.reply(200, db["refindex"])
            if path == "/5et/refnames":
                db = fet["db"]
                names = {t: sorted(v) for t, v in (db["ref_names"].items() if db else [])} or {"spell": [], "condition": []}
                return self.reply(200, json.dumps(names, ensure_ascii=False).encode("utf-8"))
            return self.reply(404, b"{}")
        if path in ("/pc", "/pcref"):   # phones may also read classes, feats and class options, to build their own trackers
            fet_status()
            db = fet["db"]
            if not db or fet["state"] != "ready":
                return self.reply(503, json.dumps({"state": fet["state"]}).encode())
            if path == "/pc":
                return self.reply(200, db["pcdata"])
            q = {k: urllib.parse.unquote_plus(v) for k, v in (x.split("=", 1) for x in query.split("&") if "=" in x)}
            t = q.get("t", "")
            if t not in ("feat", "optionalfeature"):
                return self.reply(404, b"{}")
            k, ty = fet_ref_exact(t, q.get("n", ""), q.get("s", ""))
            if not k or ty != t:
                return self.reply(404, b"{}")
            return self.reply(200, ('{"t":' + json.dumps(t) + ',"item":' + db["refs"][k] + ',"label":' +
                                    json.dumps(db["ref_label"].get(k, ""), ensure_ascii=False) + "}").encode("utf-8"))
        if path in ("/spells", "/spell"):   # the one thing phones may read from the 5e.tools files: spells, for their spell list
            fet_status()
            db = fet["db"]
            if not db or fet["state"] != "ready":
                return self.reply(503, json.dumps({"state": fet["state"]}).encode())
            if path == "/spells":
                return self.reply(200, db["spells"])
            q = {k: urllib.parse.unquote_plus(v) for k, v in (x.split("=", 1) for x in query.split("&") if "=" in x)}
            k, ty = fet_ref_exact("spell", q.get("n", ""), q.get("s", ""))
            if not k or ty != "spell":
                return self.reply(404, b"{}")
            return self.reply(200, ('{"t":"spell","item":' + db["refs"][k] + ',"label":' +
                                    json.dumps(db["ref_label"].get(k, ""), ensure_ascii=False) + "}").encode("utf-8"))
        if path.startswith("/pair/"):   # opened on the device that becomes the DM
            code = path[6:].strip().upper()
            with dm_lock:
                exp, name = dm_codes.pop(code, (0, ""))
            if exp < time.time():
                return self.reply(410, ("<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><title>Pairing</title>"
                                        "<body style='font:18px system-ui;background:#14161f;color:#eee;padding:32px'><h2>This pairing link has expired</h2>"
                                        "<p>Make a new one on the computer running Roundkeeper: Settings → DM devices → Add a DM device.</p>").encode(), "text/html; charset=utf-8")
            token = os.urandom(24).hex()
            with dm_lock:
                lst = dm_list()
                lst.append({"id": os.urandom(4).hex(), "name": name or "DM device", "h": hashlib.sha256(token.encode()).hexdigest(),
                            "added": time.time(), "seen": time.time(), "ip": self.client_address[0]})
                dm_save(lst)
            print(f"  Paired {self.client_address[0]} as a DM device ({name or 'DM device'})", flush=True)
            return self.reply(302, extra={"Location": "/?paired=1", "Set-Cookie": f"ti_dm={token}; Max-Age=315360000; Path=/; HttpOnly; SameSite=Lax"})
        if path == "/dm-devices":
            if not self.is_local():
                return self.reply(403, b"{}")
            me = hashlib.sha256(self.dm_cookie().encode()).hexdigest() if self.dm_cookie() else ""
            with dm_lock:
                lst = [{"id": d.get("id"), "name": d.get("name"), "added": d.get("added"), "seen": d.get("seen"), "ip": d.get("ip"), "me": d.get("h") == me} for d in dm_list()]
            return self.reply(200, json.dumps({"host": self.is_host(), "list": lst}, ensure_ascii=False).encode("utf-8"))
        if path in ("/", "/dm"):
            if not self.is_local():
                return self.reply(302, extra={"Location": "/players"})
            return self.page()
        if path in ("/unos", "/igraci"):   # addresses from the earlier version
            return self.reply(302, extra={"Location": "/players" + ("?" + query if query else "")})
        if path == "/players":
            return self.page()
        if path == "/manifest.json":
            return self.reply(200, MANIFEST, "application/manifest+json")
        if path in ("/icon-192.png", "/icon-512.png") or path.startswith("/fonts/"):
            name = os.path.basename(path)
            folder = FONTS if path.startswith("/fonts/") else HERE
            full = os.path.join(folder, name)
            if not name or not os.path.isfile(full):
                return self.reply(404, b"{}")
            ctype = "font/woff2" if name.endswith(".woff2") else "text/css; charset=utf-8" if name.endswith(".css") else "image/png"
            with open(full, "rb") as f:
                body = f.read()
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Cache-Control", "max-age=604800")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            return self.wfile.write(body)
        if path.startswith("/bg/"):
            name = path[4:]
            full = os.path.join(BGDIR, name)
            if not BG_NAME.match(name) or not os.path.isfile(full):
                return self.reply(404, b"{}")
            with open(full, "rb") as f:
                body = f.read()
            self.send_response(200)
            self.send_header("Content-Type", {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}[name.rsplit(".", 1)[1]])
            self.send_header("Cache-Control", "max-age=604800")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            return self.wfile.write(body)
        if path == "/library":
            if not self.is_local():
                return self.reply(403, b"[]")
            try:
                with open(LIBRARY, "rb") as f:
                    return self.reply(200, f.read())
            except OSError:
                return self.reply(200, b"[]")
        if path == "/bg-list":
            if not self.is_local():
                return self.reply(403, b"[]")
            try:
                names = [n for n in os.listdir(BGDIR) if BG_NAME.match(n)]
                names.sort(key=lambda n: os.path.getmtime(os.path.join(BGDIR, n)), reverse=True)
            except FileNotFoundError:
                names = []
            return self.reply(200, json.dumps(names).encode())
        if path == "/player-actions":
            if not self.is_local():
                return self.reply(403, b"[]")
            with lock:
                got = list(pending_actions)
                pending_actions.clear()
            return self.reply(200, json.dumps(got).encode())
        if path == "/sheet":   # 79: a phone gets its own character sheet back (one the DM keeps to himself is never sent)
            qs = dict(p.split("=", 1) for p in query.split("&") if "=" in p)
            n = urllib.parse.unquote_plus(qs.get("n", "")).strip().lower()
            with lock:
                sh = ((state or {}).get("sheets") or {}).get(n)
            if not isinstance(sh, dict) or sh.get("only"):
                return self.reply(404, b"{}")
            return self.reply(200, json.dumps(sh, ensure_ascii=False).encode("utf-8"))
        if path == "/state":
            local = self.is_local()
            qs = dict(p.split("=", 1) for p in query.split("&") if "=" in p)
            if not local:
                last_player = time.time()
            if qs.get("screen") == "tv":   # the TV, even when it's a second screen of this computer
                globals()["last_tv"] = time.time()
            elif qs.get("screen") == "tablet":
                globals()["last_tablet"] = time.time()
            me = urllib.parse.unquote_plus(qs.get("me", ""))[:40]
            if me:   # a phone says which character it is, so the DM's Devices window can show who is connected
                with lock:
                    phone_seen[me] = time.time()
                    if len(phone_seen) > 64:
                        del phone_seen[min(phone_seen, key=phone_seen.get)]
            with lock:
                st = state if local and qs.get("pub") != "1" else public_view(state)   # pages for the players ask for the players' view, even here
            rev = qs.get("rev")
            if st and rev is not None and str(st.get("rev")) == rev:
                return self.reply(204)
            return self.reply(200, json.dumps(st, ensure_ascii=False).encode("utf-8"))
        if path == "/info":
            ago = time.time() - last_player if last_player else None
            tv_ago = time.time() - last_tv if last_tv else None
            tab_ago = time.time() - last_tablet if last_tablet else None
            dm = self.is_local()
            with lock:
                phones = {k: round(time.time() - v, 1) for k, v in phone_seen.items()} if dm else None
            ips = lan_ips()  # looked up each time, so a new Wi-Fi or address shows up without a restart
            urls = [f"http://{ip}:{PORT}/players" for ip in ips]
            https = f"https://{ips[0]}:{HTTPS_PORT}/players" if HAS_TLS else None
            return self.reply(200, json.dumps({"url": urls[0], "others": urls[1:], "httpsUrl": https, "port": PORT, "playerAgo": ago, "tvAgo": tv_ago,
                                               "tabletAgo": tab_ago, "phones": phones, "host": self.is_host(), "ips": ips}).encode())
        self.reply(404, b"{}")

    def do_POST(self):
        global state
        route = self.path.split("?")[0]
        if route in ("/player", "/init"):
            return self.player_action()
        if route in ("/bg-upload", "/bg-delete"):
            return self.background(route)
        if route in ("/5et/import", "/5et/unimport"):   # 86: Settings → Import JSON, and removing such a file
            if not self.is_local():
                return self.reply(403, b"{}")
            n = int(self.headers.get("Content-Length", "0") or 0)
            if n > 60 * 1024 * 1024:
                return self.reply(413, b'{"error":"That file is larger than 60 MB."}')
            body = self.rfile.read(n)
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            name = (q.get("name") or [""])[0]
            if route == "/5et/unimport":
                if name not in fet_imported():
                    return self.reply(404, b"{}")
                os.remove(os.path.join(IMPORT_DIR, name))
                fet_status()
                return self.reply(200, b'{"ok":true}')
            try:
                base, kinds = fet_import(name, body)
            except ValueError as e:
                return self.reply(400, json.dumps({"error": str(e)}).encode())
            fet_status()
            return self.reply(200, json.dumps({"ok": True, "file": base, "kinds": kinds}).encode())
        if route == "/5et/imgbg":   # a 5e.tools picture becomes a background the tablet may show (for a boss intro)
            if not self.is_local():
                return self.reply(403, b"{}")
            try:
                n = int(self.headers.get("Content-Length", "0") or 0)
                pth = str(json.loads(self.rfile.read(n).decode("utf-8") or "{}").get("p", ""))
            except Exception:
                return self.reply(400, b"{}")
            b = fet_img_read(pth)
            if b is None:
                return self.reply(404, b"{}")
            ext = pth.lower().rsplit(".", 1)[-1].replace("jpeg", "jpg")
            name = hashlib.sha1(pth.lower().encode()).hexdigest()[:12] + "." + (ext if ext in ("jpg", "png", "webp") else "jpg")
            os.makedirs(BGDIR, exist_ok=True)
            with open(os.path.join(BGDIR, name), "wb") as f:
                f.write(b)
            return self.reply(200, json.dumps({"file": name}).encode())
        if route in ("/dm-pair", "/dm-unpair", "/dm-forget"):
            try:
                n = int(self.headers.get("Content-Length", "0") or 0)
                data = json.loads(self.rfile.read(n).decode("utf-8") or "{}") if n else {}
            except Exception:
                data = {}
            if route == "/dm-forget":   # a paired device unpairs itself
                h = hashlib.sha256(self.dm_cookie().encode()).hexdigest() if self.dm_cookie() else None
                with dm_lock:
                    dm_save([d for d in dm_list() if d.get("h") != h])
                return self.reply(204, extra={"Set-Cookie": "ti_dm=; Max-Age=0; Path=/"})
            if not self.is_host():
                return self.reply(403, b'{"error":"only the computer running the server can pair or remove DM devices"}')
            if route == "/dm-unpair":
                with dm_lock:
                    dm_save([d for d in dm_list() if d.get("id") != str(data.get("id", ""))])
                return self.reply(204)
            code = "".join(PAIR_ABC[b % len(PAIR_ABC)] for b in os.urandom(8))
            with dm_lock:
                now = time.time()
                for k in [k for k, v in dm_codes.items() if v[0] < now]:
                    del dm_codes[k]
                dm_codes[code] = (now + 600, str(data.get("name", ""))[:40].strip())
            return self.reply(200, json.dumps({"code": code, "ips": lan_ips(), "port": PORT, "expires": 600}).encode())
        if route == "/library":
            if not self.is_local():
                return self.reply(403, b'{"error":"only the laptop can do this"}')
            try:
                n = int(self.headers.get("Content-Length", "0"))
                body = self.rfile.read(n)
                assert isinstance(json.loads(body.decode("utf-8")), list)
            except Exception:
                return self.reply(400, b'{"error":"invalid library"}')
            with lock:
                with open(LIBRARY + ".tmp", "wb") as f:
                    f.write(body)
                os.replace(LIBRARY + ".tmp", LIBRARY)
            return self.reply(204)
        if route != "/state":
            return self.reply(404, b"{}")
        if not self.is_local():
            return self.reply(403, b'{"error":"only the laptop can change the state"}')
        try:
            n = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(n).decode("utf-8"))
            assert isinstance(data, dict) and isinstance(data.get("list"), list)
        except Exception:
            return self.reply(400, b'{"error":"invalid state"}')
        with lock:
            state = data
            tmp = SAVE + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(state, f, ensure_ascii=False)
            os.replace(tmp, SAVE)
            backup_daily()
        self.reply(204)


def _background(self, route):
    """The laptop uploads or deletes a picture for the tablet background."""
    if not self.is_local():
        return self.reply(403, b'{"error":"only the laptop can do this"}')
    n = int(self.headers.get("Content-Length", "0"))
    if route == "/bg-delete":
        try:
            name = json.loads(self.rfile.read(min(n, 500)).decode("utf-8")).get("file", "")
        except Exception:
            name = ""
        if BG_NAME.match(name or "") and os.path.isfile(os.path.join(BGDIR, name)):
            os.remove(os.path.join(BGDIR, name))
        return self.reply(204)
    if n <= 0 or n > 25 * 1024 * 1024:
        return self.reply(413, b'{"error":"The picture must be smaller than 25 MB"}')
    data = self.rfile.read(n)
    if data[:3] == b"\xff\xd8\xff":
        ext = "jpg"
    elif data[:8] == b"\x89PNG\r\n\x1a\n":
        ext = "png"
    elif data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        ext = "webp"
    else:
        return self.reply(415, b'{"error":"Use a JPG, PNG or WebP picture"}')
    os.makedirs(BGDIR, exist_ok=True)
    name = hashlib.sha1(data).hexdigest()[:12] + "." + ext
    with open(os.path.join(BGDIR, name), "wb") as f:
        f.write(data)
    return self.reply(200, json.dumps({"file": name}).encode())


Handler.background = _background


def backup_daily():
    """Keeps one copy of the state per day in backups/, for the last 30 days."""
    try:
        os.makedirs(BACKUPS, exist_ok=True)
        target = os.path.join(BACKUPS, time.strftime("state-%Y-%m-%d.json"))
        if not os.path.exists(target):
            shutil.copy(SAVE, target)
            olds = sorted(f for f in os.listdir(BACKUPS) if f.startswith("state-") and f.endswith(".json"))
            for f in olds[:-30]:
                os.remove(os.path.join(BACKUPS, f))
    except Exception as e:
        print(f"  (backup failed: {e})")


def _player_action(self):
    """A player's phone may only change their own character: initiative, conditions, Exhaustion, death saves, their effects."""
    def num(v, lo, hi):
        if isinstance(v, bool) or not isinstance(v, (int, float)) or not lo <= v <= hi:
            raise ValueError
        return int(v)
    try:
        n = int(self.headers.get("Content-Length", "0"))
        if n > 48000:   # a character sheet is the biggest thing a phone sends
            raise ValueError
        data = json.loads(self.rfile.read(n).decode("utf-8"))
        act = {"id": str(data.get("id")), "action": data.get("action", "init")}
        if data.get("nat") is not None:   # the die itself, for the session's dice statistics
            act["nat"] = num(data["nat"], 1, 20)
        if act["action"] == "init":
            act["value"] = num(data.get("value", data.get("init")), -10, 60)
        elif act["action"] == "cond":
            if data.get("cond") not in PLAYER_CONDS:
                raise ValueError
            act["cond"], act["on"] = data["cond"], bool(data.get("on"))
        elif act["action"] == "exh":
            act["level"] = num(data.get("level"), 0, 6)
        elif act["action"] == "ds":
            act["s"], act["f"] = num(data.get("s"), 0, 3), num(data.get("f"), 0, 3)
        elif act["action"] == "effect_add":
            name = str(data.get("name", "")).strip()
            targets = data.get("targets")
            area = bool(data.get("area"))
            if not 1 <= len(name) <= 30 or not isinstance(targets, list) or not (0 if area else 1) <= len(targets) <= 16:
                raise ValueError
            act["name"], act["targets"], act["conc"], act["area"] = name, [str(t) for t in targets], bool(data.get("conc")), area
            act["src"] = re.sub(r"[^A-Za-z0-9:_-]", "", str(data.get("src", "")))[:20]   # which printing of the spell (PHB or XPHB…)
        elif act["action"] == "hpstate":
            act["bloodied"], act["down"] = bool(data.get("bloodied")), bool(data.get("down"))
        elif act["action"] == "roll":
            if data.get("kind") not in ("nat20", "nat1", "roll"):
                raise ValueError
            act["kind"], act["text"] = data["kind"], str(data.get("text", ""))[:40]
            act["total"] = num(data.get("total", 0), -50, 999)
        elif act["action"] == "answer":
            act["call"], act["value"] = str(data.get("call", ""))[:20], num(data.get("value"), -20, 99)
        elif act["action"] == "tag":
            if data.get("tag") not in TAGS:
                raise ValueError
            act["tag"], act["on"] = data["tag"], bool(data.get("on"))
        elif act["action"] == "cover":
            if data.get("cover") not in COVERS:
                raise ValueError
            act["cover"] = data["cover"]
        elif act["action"] == "effect_rm":
            act["eid"] = str(data.get("eid", ""))[:40]
        elif act["action"] == "concans":   # the answer to the DM's Concentration save ask
            act["ask"], act["ok"] = str(data.get("ask", ""))[:20], bool(data.get("ok"))
            act["total"] = num(data["total"], -20, 99) if data.get("total") is not None else None
        elif act["action"] == "gift":   # Bardic Inspiration and the like, to another player
            act["to"], act["name"], act["die"] = str(data.get("to", ""))[:20], str(data.get("name", "")).strip()[:30], data.get("die")
            if act["die"] not in ("d4", "d6", "d8", "d10", "d12") or not act["name"]:
                raise ValueError
        elif act["action"] == "giftuse":
            act["gid"], act["roll"] = str(data.get("gid", ""))[:20], num(data.get("roll", 0), 0, 12)
        elif act["action"] == "stats":   # AC and passive scores, for the DM's party sheet
            for k in ("ac", "pp", "pi", "pv", "dc"):
                act[k] = num(data.get(k, 0), 0, 40)
        elif act["action"] == "sheet":   # 79: the player's character sheet, kept on the laptop
            sh = data.get("sheet")
            if not isinstance(sh, dict) or len(json.dumps(sh)) > 40000:
                raise ValueError
            act["sheet"] = sh
        elif act["action"] == "spfx":   # R1: the player's spell plays in the scene on the tablet and the TV
            act["n"], act["t"] = str(data.get("n", "")).strip()[:40], str(data.get("t", "")).lower()
            if not act["n"] or act["t"] not in ("", "fire", "cold", "lightning", "thunder", "necrotic", "radiant", "acid", "poison", "psychic", "force", "bludgeoning", "piercing", "slashing"):
                raise ValueError
        elif act["action"] == "pmode":   # the player uses the simple phone
            act["simple"] = bool(data.get("simple"))
        elif act["action"] == "php":   # the player's own HP, for the DM only
            act["off"] = bool(data.get("off"))
            if not act["off"]:
                act["cur"], act["max"], act["temp"] = num(data.get("cur", 0), 0, 9999), num(data.get("max", 0), 1, 9999), num(data.get("temp", 0), 0, 999)
        elif act["action"] == "chp":   # a player's companion: its HP
            if data.get("kind") not in ("dmg", "heal", "temp"):
                raise ValueError
            act["kind"], act["n"] = data["kind"], num(data.get("n"), 0, 999)
        else:
            raise ValueError
    except Exception:
        return self.reply(400, b'{"error":"invalid request"}')
    with lock:
        st = state or {}
        if st.get("playerEdits") is False and act["action"] not in ("php", "pmode", "sheet"):   # sharing HP isn't changing the fight
            return self.reply(403, b'{"error":"the DM has locked changes"}')
        ok = any(c.get("id") == act["id"] and c.get("kind") == "pc" and not c.get("hidden") for c in st.get("list", []))
        if act["action"] == "chp":   # the companion of a player in the fight
            pcs = {c.get("id") for c in st.get("list", []) if c.get("kind") == "pc" and not c.get("hidden")}
            ok = any(c.get("id") == act["id"] and c.get("owner") in pcs and not c.get("hidden") for c in st.get("list", []))
        if ok and act["action"] == "gift":
            ok = act["to"] != act["id"] and any(c.get("id") == act["to"] and c.get("kind") == "pc" and not c.get("hidden") for c in st.get("list", []))
        if ok and act["action"] == "giftuse":
            ok = any(c.get("id") == act["id"] and any(isinstance(g, dict) and g.get("id") == act["gid"] for g in c.get("gifts") or []) for c in st.get("list", []))
        if ok and act["action"] == "effect_add":
            visible = {c.get("id") for c in st.get("list", []) if not c.get("hidden")}
            act["targets"] = [t for t in act["targets"] if t in visible]
            ok = bool(act["targets"]) or act["area"]
        if ok and act["action"] == "answer":
            call = st.get("call") or {}
            ok = call.get("id") == act["call"] and (not call.get("to") or act["id"] in call.get("to"))
        if not ok and act["action"] == "roll" and st.get("playerEdits") is not False:
            ok = any(c.get("id") == act["id"] and c.get("kind") == "pc" for c in st.get("list", []))
        if ok and act["action"] == "concans":
            ok = any(isinstance(q, dict) and q.get("id") == act["ask"] and q.get("cid") == act["id"] for q in st.get("concAsk") or [])
        if ok and act["action"] == "effect_rm":
            ok = any(e.get("id") == act["eid"] and e.get("by") == act["id"] for e in st.get("effects", []))
        if ok and len(pending_actions) < 300:
            pending_actions.append(act)
    if not ok:
        return self.reply(404, b'{"error":"character not in combat"}')
    self.reply(204)


Handler.player_action = _player_action


# ---------- 5e.tools bestiary for the DM's monster search ----------
# A 5etools folder next to the app may hold the 5etools zip from GitHub (official monsters, read
# straight from the zip), the backup the site exports (5etools.json: homebrew loaded in the browser)
# and homebrew .json files. They are only read here; only the laptop can search them.
fet = {"state": "none", "error": "", "sig": "", "db": None}
fet_lock = threading.Lock()


def fet_key(name, source):
    return f"{str(name).strip().lower()}|{str(source).strip().lower()}"


SRD_FILE = os.path.join(HERE, "srd", "srd-5.2.1.json")   # 84: the SRD 5.2.1 the app comes with (CC BY 4.0)
SRD_LABEL = "SRD 5.2.1"
IMPORT_DIR = os.path.join(HERE, "5etools", "imported")   # 86: homebrew files added with Settings → Import JSON


def fet_files():
    out, sig = [], []
    if os.path.isfile(SRD_FILE):
        st = os.stat(SRD_FILE)
        out.append(SRD_FILE)
        sig.append(f"srd:{st.st_size}:{st.st_mtime_ns}")
    for d in (os.path.join(HERE, "5etools"), IMPORT_DIR, HERE):
        try:
            names = sorted(os.listdir(d))
        except OSError:
            continue
        for n in names:
            low = n.lower()
            p = os.path.join(d, n)
            if not (low.endswith(".zip") or low.endswith(".json")) or not os.path.isfile(p):
                continue
            if d == HERE and not low.startswith("5etools"):
                continue
            if d == IMPORT_DIR and not low.endswith(".json"):
                continue
            if low in ("state.json", "library.json", "stanje.json"):
                continue
            st = os.stat(p)
            out.append(p)
            sig.append(f"{p}:{st.st_size}:{st.st_mtime_ns}")
        img = os.path.join(d, "img", "bestiary")   # 5e.tools pictures you put there: a new book folder or new files change the signature
        if d == os.path.join(HERE, "5etools") and os.path.isdir(img):
            sig.append(f"img:{os.stat(img).st_mtime_ns}:" + ",".join(f"{n}:{os.stat(os.path.join(img, n)).st_mtime_ns}" for n in sorted(os.listdir(img)) if os.path.isdir(os.path.join(img, n))))
        b = os.path.join(d, "data", "bestiary")
        if d == os.path.join(HERE, "5etools") and os.path.isdir(b):
            for n in sorted(os.listdir(b)):
                if n.startswith("bestiary-"):
                    st = os.stat(os.path.join(b, n))
                    sig.append(f"{n}:{st.st_size}:{st.st_mtime_ns}")
            out.append(b)
    return out, ";".join(sig)


def fet_status():
    with fet_lock:
        files, sig = fet_files()
        if not files:
            fet.update(state="none", db=None, sig="")
        elif sig != fet["sig"] and fet["state"] != "loading":
            fet.update(state="loading", sig=sig)
            threading.Thread(target=fet_load, args=(sig,), daemon=True).start()
        out = {"state": fet["state"], "error": fet["error"], "sig": fet["sig"]}
        if fet["db"]:
            out["counts"] = fet["db"]["counts"]
            out["files"] = [os.path.basename(f) for f in fet["db"]["files"]]
        out["imported"] = fet_imported()
        return out


def _fet_cr(m):
    cr = m.get("cr")
    return cr.get("cr", "") if isinstance(cr, dict) else (cr or "")


def _fet_type(m):
    t = m.get("type")
    if isinstance(t, dict):
        t = t.get("type")
        if isinstance(t, dict):
            t = "/".join(t.get("choose", []))
    return (t or "").lower() if isinstance(t, str) else ""


def fet_add(db, m, label, group):
    if not isinstance(m, dict) or not m.get("name"):
        return
    k = fet_key(m["name"], m.get("source", ""))
    j = db["by_key"].get(k)
    if j is not None and db["mons"][j]["group"] == "off" and group != "off":
        k = f"{k}|{group}{len(db['mons'])}"   # homebrew reusing an official name keeps both
    db["by_key"][k] = len(db["mons"])
    db["mons"].append({"raw": json.dumps(m, ensure_ascii=False, separators=(",", ":")), "name": m["name"],
                       "label": label or m.get("source", ""), "group": group, "cr": _fet_cr(m), "type": _fet_type(m),
                       "copy": m.get("_copy")})


FET_REF_TYPES = ("spell", "condition", "disease", "status", "item", "baseitem", "action", "variantrule", "sense", "skill",
                 "feat", "optionalfeature", "background", "race", "trap", "hazard", "name")
FET_REF_PREF = {"spell": ("xphb", "phb"), "condition": ("xphb", "phb"), "status": ("xphb", "phb"), "disease": ("xdmg", "dmg"),
                "item": ("xdmg", "dmg", "xphb", "phb"), "baseitem": ("xphb", "phb"), "action": ("xphb", "phb"),
                "variantrule": ("xphb", "phb", "xdmg", "dmg"), "sense": ("xphb", "phb"), "skill": ("xphb", "phb"),
                "feat": ("xphb", "phb"), "optionalfeature": ("xphb", "phb"), "background": ("xphb", "phb"), "race": ("xphb", "phb"),
                "trap": ("xdmg", "dmg"), "hazard": ("xphb", "xdmg", "dmg")}
FET_REF_FILES = ("conditionsdiseases.json", "actions.json", "items.json", "items-base.json", "variantrules.json", "senses.json", "skills.json",
                 "feats.json", "optionalfeatures.json", "backgrounds.json", "races.json", "trapshazards.json", "names.json")
FET_SPELL_CLASS = {"bard": "B", "cleric": "C", "druid": "D", "paladin": "P", "ranger": "R", "sorcerer": "S", "warlock": "K", "wizard": "W", "artificer": "A"}
FET_AREA_TAGS = {"S", "C", "N", "Y", "L", "W", "H", "R", "Q"}   # sphere, cube, cone, cylinder, line, wall, hemisphere, circle, square


def fet_add_refs(db, data, labels, group):
    """Spells, conditions, items and rules a statblock can point at."""
    if not isinstance(data, dict):
        return
    for t in FET_REF_TYPES:
        for it in data.get(t, []) or []:
            if not isinstance(it, dict) or not it.get("name"):
                continue
            src = str(it.get("source", ""))
            k = f"{t}|{fet_key(it['name'], src)}"
            if k not in db["refs"]:
                db["ref_src"].setdefault(f"{t}|{it['name'].strip().lower()}", []).append(src.lower())
            db["refs"][k] = json.dumps(it, ensure_ascii=False, separators=(",", ":"))
            db["ref_label"][k] = labels.get(src.lower(), src)
            db["ref_group"][k] = group
            if t == "spell":   # homebrew names its classes in the spell itself
                fl = ((it.get("classes") or {}).get("fromClassList") or []) if isinstance(it.get("classes"), dict) else []
                letters = "".join(FET_SPELL_CLASS.get(str(c.get("name", "")).lower(), "") for c in fl if isinstance(c, dict))
                if letters:
                    db["spell_cls"][fet_key(it["name"], src)] = letters
            if group != "hb" and t in ("spell", "condition"):
                db["ref_names"][t].add(it["name"])
            alias = it.get("srd52") or it.get("srd")   # the name the SRD gives it: Melf's Acid Arrow is Acid Arrow there
            if group == "off" and isinstance(alias, str):
                db.setdefault("srd_alias", set()).add(f"{'item' if t == 'baseitem' else t}|{alias.strip().lower()}")


def fet_add_pc(db, data, labels, group):
    """Classes and subclasses: only their tables (slots, Rages, Focus Points…), for a phone's own trackers."""
    if not isinstance(data, dict):
        return
    def tables(groups):
        out = []
        for g in groups or []:
            if not isinstance(g, dict):
                continue
            rows = g.get("rows") or g.get("rowsSpellProgression")
            if isinstance(rows, list) and isinstance(g.get("colLabels"), list):
                out.append({"t": g.get("title", ""), "c": g["colLabels"], "r": rows, "sp": 1 if g.get("rowsSpellProgression") else 0})
        return out
    for c in data.get("class", []) or []:
        if not isinstance(c, dict) or not c.get("name") or c.get("isSidekick"):
            continue
        src = str(c.get("source", ""))
        hd = (c.get("hd") or {}).get("faces") if isinstance(c.get("hd"), dict) else None
        db["pc_cls"][fet_key(c["name"], src)] = {"n": c["name"], "s": src, "l": labels.get(src.lower(), src), "g": group, "hd": hd,
                                                  "cp": c.get("casterProgression") or "", "tb": tables(c.get("classTableGroups")),
                                                  "re": fet_reprint_of(json.dumps({"reprintedAs": c.get("reprintedAs") or []}, separators=(",", ":")))}
    for sc in data.get("subclass", []) or []:
        if not isinstance(sc, dict) or not sc.get("name"):
            continue
        src = str(sc.get("source", ""))
        key = fet_key(sc.get("className", "") + "|" + str(sc.get("classSource", "")) + "|" + sc["name"], src)
        db["pc_sub"][key] = {"n": sc["name"], "sn": sc.get("shortName") or sc["name"], "s": src, "l": labels.get(src.lower(), src), "g": group,
                             "cn": sc.get("className", ""), "cs": sc.get("classSource", ""), "cp": sc.get("casterProgression") or "",
                             "tb": tables(sc.get("subclassTableGroups")), "as": fet_always_spells(sc.get("additionalSpells"))}


def fet_always_spells(add):
    """81: the spells a subclass or feat keeps always prepared, as [level, name, source]; "_" means from the start.
    Spell lists a player only may choose from ("expanded") are not these."""
    out, seen = [], set()
    if not isinstance(add, list) or not add or not isinstance(add[0], dict):
        return out

    def walk(lvl, v):
        if isinstance(v, str):
            n = v.split("#", 1)[0]
            n, _, src = n.partition("|")
            n = n.strip()
            if n and n.lower() not in seen:
                seen.add(n.lower())
                out.append([lvl, n, src.upper()])
        elif isinstance(v, list):
            for y in v:
                walk(lvl, y)
        elif isinstance(v, dict) and "choose" not in v:
            for y in v.values():
                walk(lvl, y)

    for key in ("prepared", "innate"):
        m = add[0].get(key)
        if not isinstance(m, dict):
            continue
        for k, v in m.items():
            k2 = str(k)[1:] if str(k).startswith("s") else str(k)
            walk(int(k2) if k2.isdigit() and int(k2) > 0 else 1, v)
    out.sort(key=lambda r: (r[0], r[1]))
    return out


def fet_build_pc(db, sig):
    """What a phone may read to build its trackers: class tables, and the names of feats and class options."""
    feats = []
    for k, raw in db["refs"].items():
        t = k.split("|", 1)[0]
        if t not in ("feat", "optionalfeature"):
            continue
        it = json.loads(raw)
        ft = ",".join(str(x) for x in it.get("featureType") or []) if t == "optionalfeature" else str(it.get("category", ""))
        rp = fet_reprint_of(raw)
        old = 1 if rp and f"{t}|{fet_key(*rp)}" in db["refs"] else 0
        always = fet_always_spells(it.get("additionalSpells")) if t == "feat" else []
        feats.append([t, it.get("name", ""), str(it.get("source", "")), db["ref_label"].get(k, ""), ft, db["ref_group"].get(k, "off"), old, always or None])
    feats.sort(key=lambda r: (r[1].lower(), r[6]))
    db["pcdata"] = json.dumps({"sig": sig, "cls": sorted(db["pc_cls"].values(), key=lambda c: (c["n"].lower(), c["s"])),
                               "sub": sorted(db["pc_sub"].values(), key=lambda c: (c["cn"].lower(), c["n"].lower(), c["s"])), "feats": feats},
                              ensure_ascii=False, separators=(",", ":")).encode("utf-8")


FET_IMG_EXT = (".webp", ".png", ".jpg", ".jpeg")


def fet_add_fluff(db, data):
    for it in (data or {}).get("monsterFluff", []) or []:
        if isinstance(it, dict) and it.get("name"):
            db["fluff"][fet_key(it["name"], str(it.get("source", "")))] = it


def fet_fluff(name, src, depth=0):
    """A monster's lore and pictures, with what it copies from (Young Red Dragon → Red Dragons)."""
    db = fet["db"]
    it = db and db["fluff"].get(fet_key(name, src))
    if not it or depth > 4:
        return {"entries": [], "images": []}
    out = {"entries": list(it.get("entries") or []), "images": list(it.get("images") or [])}
    cp = it.get("_copy")
    if isinstance(cp, dict):
        base = fet_fluff(cp.get("name", ""), cp.get("source", ""), depth + 1)
        out = {"entries": base["entries"] + out["entries"], "images": out["images"] or base["images"]}
        for k, mod in (cp.get("_mod") or {}).items():
            if k not in ("entries", "images"):
                continue
            for m in mod if isinstance(mod, list) else [mod]:
                if not isinstance(m, dict):
                    continue
                items = m.get("items") if isinstance(m.get("items"), list) else [m.get("items")] if m.get("items") else []
                if m.get("mode") == "prependArr":
                    out[k] = items + out[k]
                elif m.get("mode") == "appendArr":
                    out[k] = out[k] + items
                elif m.get("mode") == "replaceArr":
                    out[k] = items
    return out


def fet_img_path(im):
    href = im.get("href") if isinstance(im, dict) else None
    p = href.get("path") if isinstance(href, dict) and href.get("type") == "internal" else None
    return p.lower() if isinstance(p, str) else None


def fet_img_read(path):
    db = fet["db"]
    hit = db and db["imgs"].get(str(path).lower())
    if not hit:
        return None
    zp, member = hit
    if zp is None:
        with open(member, "rb") as f:
            return f.read()
    with zipfile.ZipFile(zp) as z:
        return z.read(member)


def fet_add_lgroups(db, data):
    """Legendary groups: a boss's lair actions and regional effects."""
    for g in (data or {}).get("legendaryGroup", []) or []:
        if isinstance(g, dict) and g.get("name"):
            db["lgroups"][fet_key(g["name"], g.get("source", ""))] = json.dumps(g, ensure_ascii=False, separators=(",", ":"))


def fet_add_spell_sources(db, data):
    """spells/sources.json: which classes have each spell on their list."""
    for src, spells in (data or {}).items():
        if not isinstance(spells, dict):
            continue
        for name, v in spells.items():
            cl = ((v.get("class") or []) + (v.get("classVariant") or [])) if isinstance(v, dict) else []   # classVariant: Tasha's expanded lists
            letters = "".join(sorted({FET_SPELL_CLASS.get(str(c.get("name", "")).lower(), "") for c in cl if isinstance(c, dict)}))
            if letters:
                db["spell_cls"][fet_key(name, src)] = letters
            # the 2014 class lists: everything but the 2024 Player's Handbook classes
            old = "".join(sorted({FET_SPELL_CLASS.get(str(c.get("name", "")).lower(), "") for c in cl
                                  if isinstance(c, dict) and str(c.get("source", "")).lower() != "xphb"}))
            db["spell_cls14"][fet_key(name, src)] = old


def fet_spell_dur(sp):
    """("1 min", concentration) the way the app writes durations."""
    durs = sp.get("duration") or []
    conc = any(isinstance(d, dict) and d.get("concentration") for d in durs)
    d = durs[0] if durs and isinstance(durs[0], dict) else {}
    ty = d.get("type")
    if ty == "timed":
        x = d.get("duration") or {}
        n, u = x.get("amount", 1), x.get("type", "")
        txt = {"round": f"{n} round" + ("s" if n != 1 else ""), "minute": f"{n} min", "hour": f"{n} h",
               "day": f"{n} day" + ("s" if n != 1 else ""), "turn": f"{n} turn" + ("s" if n != 1 else ""),
               "week": f"{n} week" + ("s" if n != 1 else ""), "year": f"{n} year" + ("s" if n != 1 else "")}.get(u, f"{n} {u}")
    elif ty == "permanent":
        txt = "Until dispelled"
    elif ty == "special":
        txt = "Special"
    else:
        txt = "Instant"
    return txt, conc


def fet_build_spells(db, sig):
    """The spell list the phones get: name, level, concentration, battlefield, duration, classes, book. Nothing else."""
    rows = []
    for k, raw in db["refs"].items():
        if not k.startswith("spell|"):
            continue
        sp = json.loads(raw)
        name, src = sp.get("name", ""), str(sp.get("source", ""))
        dur, conc = fet_spell_dur(sp)
        area = 1 if dur != "Instant" and FET_AREA_TAGS & set(sp.get("areaTags") or []) else 0
        cls = db["spell_cls"].get(fet_key(name, src), "")
        cls14 = db["spell_cls14"].get(fet_key(name, src), cls)
        rp = fet_reprint_of(raw)
        old = 1 if rp and f"spell|{fet_key(*rp)}" in db["refs"] else 0
        ritual = 1 if (sp.get("meta") or {}).get("ritual") else 0
        lvl = sp.get("level", 0) if isinstance(sp.get("level"), int) else 0
        rows.append([name, lvl, 1 if conc else 0, area, dur, cls, db["ref_label"].get(k, src), src, db["ref_group"].get(k, "off"), old, ritual, cls14])
    rows.sort(key=lambda r: (r[1], r[0].lower(), r[9]))
    db["spells"] = json.dumps({"sig": sig, "list": rows}, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def fet_build_refindex(db, sig):
    """Every rule, spell, item… by name, for the DM's Ctrl+K search."""
    rows = []
    for k, raw in db["refs"].items():
        t = k.split("|", 1)[0]
        it = json.loads(raw)
        rp = fet_reprint_of(raw)
        old = 1 if rp and any(f"{tt}|{fet_key(*rp)}" in db["refs"] for tt in ((t, "item", "baseitem") if t in ("item", "baseitem") else (t,))) else 0
        rows.append([t, it.get("name", ""), str(it.get("source", "")), db["ref_label"].get(k, ""), old, db["ref_group"].get(k, "off")])
    db["refindex"] = json.dumps({"sig": sig, "list": rows}, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def fet_reprint_of(raw):
    """("Name", "SOURCE") from 5e.tools' reprintedAs: the newest printing (the 2024 books)."""
    m = re.search(r'"reprintedAs":\[\s*(?:"([^"]+)"|\{[^}]*"uid":"([^"]+)")', raw)
    if not m:
        return None
    parts = (m.group(1) or m.group(2)).split("|")
    return (parts[0], parts[1]) if len(parts) >= 2 else None


def fet_newest(db, k, ty):
    """We play the 2024 rules: a 2014 spell, condition or item opens as its reprint."""
    for _ in range(4):
        rp = fet_reprint_of(db["refs"][k])
        if not rp:
            break
        for t in ((ty, "item", "baseitem") if ty in ("item", "baseitem") else (ty,)):
            nk = f"{t}|{fet_key(*rp)}"
            if nk in db["refs"]:
                k, ty = nk, t
                break
        else:
            break
    return k, ty


def fet_ref(t, name, source):
    k, ty = fet_ref_exact(t, name, source)
    return fet_newest(fet["db"], k, ty) if k else (None, "")


def fet_ref_exact(t, name, source):
    db = fet["db"]
    if not db:
        return None, ""
    types = {"item": ("item", "baseitem"), "condition": ("condition", "status", "disease"),
             "status": ("status", "condition", "disease")}.get(t, (t,))
    for ty in types:
        if source:
            k = f"{ty}|{fet_key(name, source)}"
            if k in db["refs"]:
                return k, ty
        srcs = db["ref_src"].get(f"{ty}|{name.strip().lower()}", [])
        for pref in FET_REF_PREF.get(ty, ()):
            if pref in srcs:
                return f"{ty}|{fet_key(name, pref)}", ty
        if srcs:
            return f"{ty}|{fet_key(name, srcs[0])}", ty
    return None, ""


def fet_find_monster(name, source):
    db = fet["db"]
    if not db:
        return -1

    def newest(j):
        for _ in range(4):
            rp = fet_reprint_of(db["mons"][j]["raw"])
            k = db["by_key"].get(fet_key(*rp)) if rp else None
            if k is None:
                break
            j = k
        return j
    for s in ([source] if source else []) + ["xmm", "mm", "mpmm"]:
        j = db["by_key"].get(fet_key(name, s))
        if j is not None:
            return newest(j)
    low = name.strip().lower()
    j = next((i for i, m in enumerate(db["mons"]) if m["name"].lower() == low), -1)
    return newest(j) if j >= 0 else -1


def fet_add_file(db, data, labels, group):
    if not isinstance(data, dict):
        return
    for m in data.get("monster", []) or []:
        src = str((m or {}).get("source", ""))
        fet_add(db, m, labels.get(src.lower(), src), group)
    for t in data.get("monsterTemplate", []) or []:
        if isinstance(t, dict):
            db["templates"][fet_key(t.get("name", ""), t.get("source", ""))] = json.dumps(t, separators=(",", ":"))
    fet_add_lgroups(db, data)


def _labels(data):
    return {str(x.get("json", "")).lower(): x.get("full") or x.get("json", "")
            for x in ((data or {}).get("_meta") or {}).get("sources", []) if isinstance(x, dict)}


def fet_read_backup(db, path):
    """Walk the site's backup one homebrew at a time: only async.HOMEBREW_2_STORAGE is used."""
    with open(path, "rb") as f:
        text = f.read().decode("utf-8")
    dec, ws = json.JSONDecoder(), re.compile(r"[\s,:]*")
    i = ws.match(text, 0).end()
    if text[i] != "{":
        raise ValueError("not a 5e.tools backup")

    def walk_obj(i, want):
        """i is at '{'; returns the position of the value of key `want`, or -1."""
        i = ws.match(text, i + 1).end()
        while text[i] != "}":
            key, i = dec.raw_decode(text, i)
            i = ws.match(text, i).end()
            if key == want:
                return i
            _, i = dec.raw_decode(text, i)
            i = ws.match(text, i).end()
        return -1

    a = walk_obj(i, "async")
    h = walk_obj(a, "HOMEBREW_2_STORAGE") if a >= 0 else -1
    if h < 0 or text[h] != "[":
        raise ValueError("no homebrew in this backup")
    i = ws.match(text, h + 1).end()
    while text[i] != "]":
        doc, i = dec.raw_decode(text, i)
        i = ws.match(text, i).end()
        body = doc.get("body") if isinstance(doc, dict) else None
        if isinstance(body, dict):
            group = "own" if (doc.get("head") or {}).get("isEditable") else "hb"
            labels = _labels(body)
            fet_add_file(db, body, labels, group)
            fet_add_refs(db, body, labels, group)
            fet_add_pc(db, body, labels, group)
    del text


def fet_load(sig):
    db = {"mons": [], "by_key": {}, "templates": {}, "files": [], "counts": {},
          "refs": {}, "ref_label": {}, "ref_src": {}, "ref_names": {"spell": set(), "condition": set()},
          "ref_group": {}, "spell_cls": {}, "spell_cls14": {}, "lgroups": {}, "pc_cls": {}, "pc_sub": {}, "fluff": {}, "imgs": {}, "img_src": []}
    files, _ = fet_files()
    errors = []
    for p in files:
        if p == SRD_FILE:
            continue
        try:
            if os.path.isdir(p):
                for n in sorted(os.listdir(p)):
                    if n.startswith("bestiary-") or n == "template.json":
                        with open(os.path.join(p, n), encoding="utf-8") as f:
                            fet_add_file(db, json.load(f), {}, "off")
                    elif n == "legendarygroups.json":
                        with open(os.path.join(p, n), encoding="utf-8") as f:
                            fet_add_lgroups(db, json.load(f))
                    elif n.startswith("fluff-bestiary-") and n.endswith(".json"):
                        with open(os.path.join(p, n), encoding="utf-8") as f:
                            fet_add_fluff(db, json.load(f))
                data = os.path.dirname(p)
                img = os.path.join(os.path.dirname(data), "img", "bestiary")
                for root, _, names in os.walk(img) if os.path.isdir(img) else []:
                    for n in names:
                        if n.lower().endswith(FET_IMG_EXT):
                            full = os.path.join(root, n)
                            db["imgs"][os.path.relpath(full, os.path.dirname(img)).replace(os.sep, "/").lower()] = (None, full)
                if os.path.isdir(img):
                    db["img_src"].append(os.path.relpath(img, HERE).replace(os.sep, "/"))
                sp_src = os.path.join(data, "spells", "sources.json")
                if os.path.isfile(sp_src):
                    with open(sp_src, encoding="utf-8") as f:
                        fet_add_spell_sources(db, json.load(f))
                spells = os.path.join(data, "spells")
                refs = [os.path.join(spells, n) for n in sorted(os.listdir(spells)) if n.startswith("spells-")] if os.path.isdir(spells) else []
                for rf in refs + [os.path.join(data, n) for n in FET_REF_FILES]:
                    if os.path.isfile(rf):
                        with open(rf, encoding="utf-8") as f:
                            fet_add_refs(db, json.load(f), {}, "off")
                cdir = os.path.join(data, "class")
                for n in sorted(os.listdir(cdir)) if os.path.isdir(cdir) else []:
                    if n.startswith("class-") and n.endswith(".json"):
                        with open(os.path.join(cdir, n), encoding="utf-8") as f:
                            fet_add_pc(db, json.load(f), {}, "off")
            elif p.lower().endswith(".zip"):
                n = pics = 0
                with zipfile.ZipFile(p) as z:
                    for name in z.namelist():
                        low = name.lower()
                        if low.endswith(FET_IMG_EXT) and "bestiary/" in low:   # the 5e.tools pictures, if you have them
                            db["imgs"][low[low.find("bestiary/"):]] = (p, name)
                            pics += 1
                            continue
                        i = name.find("data/bestiary/")
                        rest = name[i + 14:] if i >= 0 else ""
                        if rest == "legendarygroups.json":
                            fet_add_lgroups(db, json.loads(z.read(name).decode("utf-8")))
                            continue
                        if rest.startswith("fluff-bestiary-") and rest.endswith(".json"):
                            fet_add_fluff(db, json.loads(z.read(name).decode("utf-8")))
                            continue
                        if "/" in rest or not (rest.startswith("bestiary-") or rest == "template.json"):
                            continue
                        fet_add_file(db, json.loads(z.read(name).decode("utf-8")), {}, "off")
                        n += 1
                    for name in z.namelist():
                        i = name.find("data/")
                        rest = name[i + 5:] if i >= 0 else ""
                        if (rest.startswith("spells/spells-") and rest.endswith(".json")) or rest in FET_REF_FILES:
                            fet_add_refs(db, json.loads(z.read(name).decode("utf-8")), {}, "off")
                        elif rest == "spells/sources.json":
                            fet_add_spell_sources(db, json.loads(z.read(name).decode("utf-8")))
                        elif rest.startswith("class/class-") and rest.endswith(".json"):
                            fet_add_pc(db, json.loads(z.read(name).decode("utf-8")), {}, "off")
                if pics:
                    db["img_src"].append(os.path.basename(p))
                if not n and not pics:
                    raise ValueError("no bestiary in this zip")
            else:
                with open(p, "rb") as f:
                    head = f.read(400)
                if b'"fileType"' in head:
                    fet_read_backup(db, p)
                else:
                    with open(p, encoding="utf-8") as f:
                        data = json.load(f)
                    fet_add_file(db, data, _labels(data), "own")
                    fet_add_refs(db, data, _labels(data), "own")
                    fet_add_pc(db, data, _labels(data), "own")
            db["files"].append(p)
        except Exception as e:  # a broken file shouldn't stop the others
            errors.append(f"{os.path.basename(p)}: {e}")
    if SRD_FILE in files:
        try:
            fet_add_srd(db)
        except Exception as e:
            errors.append(f"SRD: {e}")
    img = os.path.join(HERE, "5etools", "img", "bestiary")   # pictures in the 5etools folder, whatever form the data has
    before = len(db["imgs"])
    for root, _, names in os.walk(img) if os.path.isdir(img) else []:
        for n in names:
            if n.lower().endswith(FET_IMG_EXT):
                full = os.path.join(root, n)
                db["imgs"][os.path.relpath(full, os.path.dirname(img)).replace(os.sep, "/").lower()] = (None, full)
    if len(db["imgs"]) > before and "5etools/img/bestiary" not in db["img_src"]:
        db["img_src"].append("5etools/img/bestiary")
    mons = db["mons"]
    for m in mons:   # copies keep their original's CR and type for the search
        cur, depth = m, 0
        while (not m["cr"] or not m["type"]) and isinstance(cur.get("copy"), dict) and depth < 6:
            j = db["by_key"].get(fet_key(cur["copy"].get("name", ""), cur["copy"].get("source", "")))
            if j is None:
                break
            cur = mons[j]
            m["cr"] = m["cr"] or cur["cr"]
            m["type"] = m["type"] or cur["type"]
            depth += 1
    for m in mons:
        db["counts"][m["group"]] = db["counts"].get(m["group"], 0) + 1
    db["counts"]["srd"] = db.get("srd_n", 0)
    db["counts"]["srd_spells"] = db.get("srd_spells", 0)
    def newer(m):   # 1 when a newer printing of this monster is among the files (the MM14 Lich next to the MM24 one)
        rp = fet_reprint_of(m["raw"])
        return 1 if rp and fet_key(*rp) in db["by_key"] else 0
    fet_build_spells(db, sig)
    fet_build_refindex(db, sig)
    fet_build_pc(db, sig)
    db["index"] = json.dumps({"sig": sig, "list": [[i, m["name"], m["label"], m["group"], m["cr"], m["type"], newer(m)] for i, m in enumerate(mons)]},
                             ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    with fet_lock:
        if fet["sig"] != sig:
            return
        fet.update(db=db, state="ready" if mons or not errors else "error", error="; ".join(errors))
    c = db["counts"]
    print(f"  Game data: {c.get('srd', 0)} SRD monsters built in, {c.get('off', 0) - c.get('srd', 0)} official and "
          f"{c.get('own', 0) + c.get('hb', 0)} homebrew from your files", flush=True)


def fet_add_srd(db):
    """84: the built-in SRD, under everything else: a monster, spell, item or rule the DM's own files already have is left out."""
    with open(SRD_FILE, encoding="utf-8") as f:
        data = json.load(f)
    have = {m["name"].strip().lower() for m in db["mons"] if m["group"] == "off"}
    n = 0
    for m in data.get("monster", []) or []:
        if isinstance(m, dict) and m.get("name") and m["name"].strip().lower() not in have:
            fet_add(db, m, SRD_LABEL, "off")
            n += 1

    has_off = any(g == "off" for g in db["ref_group"].values())

    def known(t, nm, it):
        if f"{t}|{nm}" in db.get("srd_alias", ()):
            return True
        if has_off and t == "item" and (it.get("weapon") or it.get("armor")):   # Flame Tongue Longsword…: the DM's files make these themselves
            return True
        for ty in ((t, "baseitem") if t == "item" else (t,)):
            if any(db["ref_group"].get(f"{ty}|{fet_key(nm, s)}") == "off" for s in db["ref_src"].get(f"{ty}|{nm}", [])):
                return True
        return False
    refs = {t: [it for it in data.get(t, []) or [] if isinstance(it, dict) and it.get("name") and not known(t, it["name"].strip().lower(), it)]
            for t in FET_REF_TYPES if data.get(t)}
    fet_add_refs(db, refs, {"srd52": SRD_LABEL}, "off")
    db["srd_n"], db["srd_spells"] = n, len(refs.get("spell", []))
    db["files"].append(SRD_LABEL + " (built in)")


def fet_import(name, body):
    """86: one homebrew file, checked and kept in 5etools/imported. Returns what it holds, or raises ValueError."""
    base = re.sub(r"[^A-Za-z0-9 ._()-]", "", os.path.basename(str(name or ""))).strip()[:80]
    if not base.lower().endswith(".json"):
        base = (base or "homebrew") + ".json"
    try:
        data = json.loads(body.decode("utf-8-sig"))
    except Exception:
        raise ValueError("That isn't a JSON file the app can read.")
    if not isinstance(data, dict):
        raise ValueError("That file doesn't hold monsters, spells or rules.")
    kinds = {k: len(data[k]) for k in ("monster",) + FET_REF_TYPES if isinstance(data.get(k), list) and data[k]}
    if not kinds:
        raise ValueError("That file has no monsters, spells, items or rules in the homebrew format.")
    os.makedirs(IMPORT_DIR, exist_ok=True)
    with open(os.path.join(IMPORT_DIR, base), "wb") as f:
        f.write(body)
    return base, kinds


def fet_imported():
    try:
        return sorted(n for n in os.listdir(IMPORT_DIR) if n.lower().endswith(".json"))
    except OSError:
        return []


def fet_monster(i):
    db = fet["db"]
    if not db or not (0 <= i < len(db["mons"])):
        return None
    chain, tmpl, cur = [db["mons"][i]["raw"]], [], db["mons"][i]
    for _ in range(8):
        c = cur.get("copy")
        if not isinstance(c, dict):
            break
        for t in c.get("_templates", []) or []:
            raw = db["templates"].get(fet_key(t.get("name", ""), t.get("source", "")))
            if raw:
                tmpl.append(raw)
        j = db["by_key"].get(fet_key(c.get("name", ""), c.get("source", "")))
        if j is None:
            break
        cur = db["mons"][j]
        chain.append(cur["raw"])
    m = db["mons"][i]
    lg = None   # the boss's lair actions and regional effects
    for raw in chain:
        g = json.loads(raw).get("legendaryGroup")
        if isinstance(g, dict):
            lg = db["lgroups"].get(fet_key(g.get("name", ""), g.get("source", "")))
            break
    return ('{"chain":[' + ",".join(chain) + '],"templates":[' + ",".join(tmpl) + '],"label":' +
            json.dumps(m["label"], ensure_ascii=False) + ',"group":"' + m["group"] + '"' + (',"lgroup":' + lg if lg else "") + '}').encode("utf-8")


def main():
    fet_status()   # starts reading a 5etools folder in the background, if there is one
    try:
        srv = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    except OSError:
        print(f"Port {PORT} is already in use. Is the server already running in another window?")
        input("Press Enter to exit...")
        sys.exit(1)
    if HAS_TLS:
        try:
            tls = ThreadingHTTPServer(("0.0.0.0", HTTPS_PORT), Handler)
            ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            ctx.load_cert_chain(CERT, KEY)
            tls.socket = ctx.wrap_socket(tls.socket, server_side=True)
            threading.Thread(target=tls.serve_forever, daemon=True).start()
        except Exception as e:
            print(f"  (https didn't start: {e})")
    dm_url = f"http://127.0.0.1:{PORT}/"
    print("=" * 60)
    print("  Roundkeeper is running")
    print(f"  DM (this laptop):              {dm_url}")
    print(f"  Players (tablet and phones):  {PLAYER_URL}")
    for u in OTHER_URLS:
        print(f"  or try:                        {u}")
    if HTTPS_URL:
        print(f"  https (phones):                {HTTPS_URL}")
        print("  (the first time, the browser warns about the certificate: Advanced -> Proceed)")
    print("  Close this window to stop the server.")
    print("  When the tablet or a phone opens the page, it shows up here.")
    print("=" * 60)
    threading.Timer(0.8, lambda: webbrowser.open(dm_url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
