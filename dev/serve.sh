#!/bin/bash
# Start a fresh test server with the test hook (window.__t) in the page.
#   dev/serve.sh [go|py] [srd|data] [keep]
#   go|py  which server (default go; go is built into dev/.work/go)
#   srd    only the built-in SRD (default); data: also $RK_5ETOOLS (a 5e.tools folder)
#   keep   keep the old state.json and library.json
# The server's folder is dev/.work/srv. Stops any server already running on 8765.
cd "$(dirname "$0")/.." || exit 1
python3 tools/build.py --quiet || exit 1   # initiative.html from src/
ROOT=$PWD; W=$ROOT/dev/.work; SRV=$W/srv; kind=${1:-go}; data=${2:-srd}; keep=$3
pkill -x ti-linux 2>/dev/null; pkill -f "python3 [s]erver.py" 2>/dev/null; sleep .5
if [ "$keep" = keep ]; then find "$SRV" -mindepth 1 -maxdepth 1 ! -name state.json ! -name library.json -exec rm -rf {} + 2>/dev/null
else rm -rf "$SRV"; fi
mkdir -p "$SRV"
sed 's/^(function(){$/(function(){window.__t=(s)=>eval(s);/' initiative.html > "$SRV/initiative.html"
grep -q "window.__t" "$SRV/initiative.html" || { echo "serve: could not add the test hook"; exit 1; }
if [ "$data" = data ]; then
  [ -d "$RK_5ETOOLS" ] || { echo "serve: set RK_5ETOOLS to a 5e.tools data folder"; exit 1; }
  mkdir -p "$SRV/5etools"; for f in "$RK_5ETOOLS"/*; do ln -s "$f" "$SRV/5etools/"; done   # links per entry, so tests never write into your folder
fi
if [ "$kind" = go ]; then
  B=$W/go; mkdir -p "$B/assets"
  if [ ! -x "$B/ti-linux" ] || [ -n "$(find go initiative.html srd -newer "$B/ti-linux" -print -quit)" ]; then
    cp go/*.go go/go.mod "$B/" && cp initiative.html icon-192.png icon-512.png srd/srd-5.2.1.json "$B/assets/" && rm -rf "$B/assets/fonts" && cp -r fonts "$B/assets/fonts"
    (cd "$B" && go build -o ti-linux .) || { echo "serve: go build failed"; exit 1; }
  fi
  (cd "$SRV" && ROUNDKEEPER_DIR="$SRV" ROUNDKEEPER_NO_BROWSER=1 setsid nohup "$B/ti-linux" > "$SRV/log.txt" 2>&1 &)
else
  mkdir -p "$SRV/srd"; cp server.py icon-192.png icon-512.png "$SRV/"; cp -r fonts "$SRV/"; cp srd/srd-5.2.1.json "$SRV/srd/"
  (cd "$SRV" && setsid nohup python3 server.py > "$SRV/log.txt" 2>&1 &)
fi
for i in $(seq 1 60); do
  s=$(curl -s --noproxy '*' http://127.0.0.1:8765/5et/status | python3 -c "import json,sys;print(json.load(sys.stdin)['state'])" 2>/dev/null)
  [ "$s" = ready ] && break; sleep .5
done
echo "serve: $kind $data $s"; [ "$s" = ready ]
