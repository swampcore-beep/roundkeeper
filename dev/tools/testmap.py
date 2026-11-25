#!/usr/bin/env python3
"""Which test suites cover a file, worked out from the code (nothing to keep up to date by hand).

    python3 dev/tools/testmap.py src/84-sheets.js          # suites for these files
    python3 dev/tools/testmap.py --changed                  # suites for what differs from origin/main (commits and working tree)
    python3 dev/tools/testmap.py --why src/84-sheets.js     # and the names that tie each suite to the file
    dev/test.sh $(python3 dev/tools/testmap.py --changed)

How: each file in src/ defines names (functions, top-level consts, data-act values, ids, CSS classes). A suite covers
the file when its text uses one of the names that are the file's own: defined in at most three parts, at least four
characters, and used by at most 40% of the suites (so .row or .btn tie nothing). A guide for picking suites while
working, not a proof: the pull request's Check still runs everything.
"""
import os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TESTS = os.path.join(ROOT, "dev", "tests")
HELPERS = {"cap", "scene"}   # imported by suites, not suites
SKIP = {"function", "return", "const", "class", "string", "number", "button", "input", "hidden", "active",
        "label", "title", "value", "items", "small", "focus", "hover", "after", "before", "light", "theme"}

def suites():
    return sorted(f[:-3] for f in os.listdir(TESTS) if f.endswith(".py") and f[:-3] not in HELPERS)

def names_in(path):
    t = open(path, encoding="utf-8").read()
    n = set()
    if path.endswith(".js"):
        n |= set(re.findall(r"\bfunction\s+([A-Za-z_$][\w$]*)", t))
        n |= set(re.findall(r"^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=", t, re.M))
        n |= set(re.findall(r'data-act="([\w-]+)"', t))
        n |= set(re.findall(r'\bid="([\w-]+)"', t))
        if path.endswith("85-events.js"):
            n |= set(re.findall(r'case\s+"([\w-]+)"', t))
    elif path.endswith(".css"):
        sel = re.sub(r"\{[^{}]*\}", "{}", re.sub(r"/\*.*?\*/", "", t, flags=re.S))   # selectors only
        n |= set(re.findall(r"[.#]([A-Za-z][\w-]*)", sel))
        n |= set(re.findall(r'data-act=["\']?([\w-]+)', sel))
    elif path.endswith(".html"):
        n |= set(re.findall(r'\bid="([\w-]+)"', t))
        n |= set(re.findall(r'data-act="([\w-]+)"', t))
    return {x for x in n if len(x) >= 4 and x.lower() not in SKIP}

def build():
    src = os.path.join(ROOT, "src")
    parts = {f"src/{f}": names_in(os.path.join(src, f)) for f in sorted(os.listdir(src)) if f.endswith((".js", ".css", ".html"))}
    owners = {}
    for p, ns in parts.items():
        for x in ns:
            owners.setdefault(x, set()).add(p)
    texts = {s: open(os.path.join(TESTS, s + ".py"), encoding="utf-8").read() for s in suites()}
    for h in HELPERS:   # a suite that imports a helper uses its names too
        hp = os.path.join(TESTS, h + ".py")
        if os.path.exists(hp):
            ht = open(hp, encoding="utf-8").read()
            for s, t in texts.items():
                if re.search(rf"\bfrom {h} import|\bimport {h}\b", t):
                    texts[s] = t + ht
    used = {}
    for x in owners:
        pat = re.compile(rf"(?<![\w$-]){re.escape(x)}(?![\w$-])")
        used[x] = {s for s, t in texts.items() if pat.search(t)}
    limit = 0.4 * len(texts)
    cover = {p: {} for p in parts}
    for x, ps in owners.items():
        if len(ps) > 3 or not used[x] or len(used[x]) > limit:
            continue
        for p in ps:
            for s in used[x]:
                cover[p].setdefault(s, set()).add(x)
    return cover

def for_file(f, cover):
    f = os.path.relpath(os.path.abspath(f), ROOT) if os.path.exists(f) else f
    if f in cover:
        return cover[f]
    if f.startswith("dev/tests/") and f.endswith(".py") and os.path.basename(f)[:-3] not in HELPERS:
        return {os.path.basename(f)[:-3]: {"(the suite itself)"}}
    if f.startswith(("go/", "srd/", "dev/serve.sh", "dev/test.sh", "dev/rk.py", "tools/build.py", "dev/tests/")):
        return {s: {"(server, build or test tooling: run them all)"} for s in suites()}
    return {}

def changed():
    out = set()
    for cmd in (["git", "diff", "--name-only", "origin/main...HEAD"], ["git", "status", "--porcelain"]):
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
        for line in r.stdout.splitlines():
            out.add(line[3:].strip() if cmd[1] == "status" else line.strip())
    return sorted(x for x in out if x)

def main(a):
    why = "--why" in a
    files = changed() if "--changed" in a else [x for x in a if not x.startswith("--")]
    if not files:
        print(__doc__.strip().splitlines()[0]); return
    cover = build(); got = {}
    for f in files:
        for s, ns in for_file(f, cover).items():
            got.setdefault(s, set()).update(ns)
    if why:
        for s in sorted(got):
            print(f"{s}: {', '.join(sorted(got[s])[:8])}")
    else:
        print(" ".join(sorted(got)))

if __name__ == "__main__":
    main(sys.argv[1:])
