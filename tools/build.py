#!/usr/bin/env python3
"""Put initiative.html together from the parts in src/.

The app ships as one file (the exe embeds it, the Python server serves it, a newer copy next to the exe
replaces the built-in one), but it is edited in parts: src/NN-name.css|js|html, joined in the order of
their numbers. The parts are pieces of that one file, not modules: the CSS parts sit inside one <style>,
the app's JS parts inside one function, (function(){ in 60-data.js to })(); in 86-boot.js.

  python3 tools/build.py          write initiative.html
  python3 tools/build.py --check  only check that initiative.html matches src/ (exit 1 if not)
  python3 tools/build.py --force  write it even when initiative.html was changed by hand

Edit src/, never initiative.html: a change made only in initiative.html is lost at the next build, so
the build refuses to overwrite one that is newer than every part and different from them.

Standard library only.
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
OUT = os.path.join(ROOT, "initiative.html")


def parts():
    names = sorted(n for n in os.listdir(SRC) if re.match(r"^\d\d-[a-z0-9-]+\.(css|js|html)$", n))
    if not names:
        sys.exit("build: no parts in src/")
    return names


def build():
    out = []
    for n in parts():
        with open(os.path.join(SRC, n), encoding="utf-8", newline="") as f:
            t = f.read()
        if not t.endswith("\n"):
            sys.exit(f"build: src/{n} must end with a newline")
        out.append(t)
    return "".join(out)


def main():
    html = build()
    if "--check" in sys.argv:
        with open(OUT, encoding="utf-8", newline="") as f:
            cur = f.read()
        if cur != html:
            sys.exit("build: initiative.html is not built from src/; run python3 tools/build.py")
        print("build: initiative.html matches src/")
        return
    if os.path.exists(OUT) and "--force" not in sys.argv:
        with open(OUT, encoding="utf-8", newline="") as f:
            cur = f.read()
        if cur == html:
            if "--quiet" not in sys.argv:
                print("build: initiative.html is up to date")
            return
        newest = max(os.path.getmtime(os.path.join(SRC, n)) for n in parts())
        if os.path.getmtime(OUT) > newest:
            sys.exit("build: initiative.html was changed by hand after src/; move the change into src/ "
                     "(or run python3 tools/build.py --force to throw it away)")
    with open(OUT, "w", encoding="utf-8", newline="") as f:
        f.write(html)
    if "--quiet" not in sys.argv:
        print(f"build: initiative.html from {len(parts())} parts, {len(html.encode('utf-8')):,} bytes")


if __name__ == "__main__":
    main()
