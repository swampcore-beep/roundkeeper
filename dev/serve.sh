#!/bin/bash
# Start a fresh test server with the test hook (window.__t) in the page.
#   dev/serve.sh [go] [srd|data] [keep]
#   go     the server (built into dev/.work/go); the only one since 1.2, the word is kept so old commands work
#   srd    only the built-in SRD (default); data: also $RK_5ETOOLS (a 5e.tools folder)
#   keep   keep the old state.json and library.json
#   dev/serve.sh build    only build initiative.html and the server (dev/test.sh does this once before running servers side by side)
#   dev/serve.sh stop     stop the server on $RK_PORT
# The port is $RK_PORT (default 8765); its folder is dev/.work/srv (dev/.work/srv-<port> for another port).
# Starting stops the server this script started on that port before; on 8765 it also stops any other copy left running.
cd "$(dirname "$0")/.." || exit 1
ROOT=$PWD; W=$ROOT/dev/.work; PORT=${RK_PORT:-8765}; kind=${1:-go}; data=${2:-srd}; keep=$3
SRV=$W/srv; [ "$PORT" = 8765 ] || SRV=$W/srv-$PORT
B=$W/go
up(){ curl -s --noproxy '*' -m 2 "http://127.0.0.1:$PORT/5et/status" > /dev/null 2>&1; }
stop(){
  if [ -f "$SRV/pid" ]; then kill "$(cat "$SRV/pid")" 2>/dev/null; rm -f "$SRV/pid"; fi
  [ "$PORT" = 8765 ] && pkill -x ti-linux 2>/dev/null   # a copy started before 1.7, which kept no pid file
  for i in $(seq 1 20); do up || return 0; sleep .25; done
  return 1
}
build(){
  python3 tools/build.py --quiet || exit 1   # initiative.html from src/
  mkdir -p "$B/assets"
  if [ ! -x "$B/ti-linux" ] || [ -n "$(find go initiative.html srd dice -newer "$B/ti-linux" -print -quit)" ]; then
    cp go/*.go go/go.mod "$B/" && cp initiative.html icon-192.png icon-512.png srd/srd-5.2.1.json "$B/assets/" && rm -rf "$B/assets/fonts" "$B/assets/dice" && cp -r fonts "$B/assets/fonts" && cp -r dice "$B/assets/dice"
    (cd "$B" && go build -o ti-linux .) || { echo "serve: go build failed"; exit 1; }
  fi
}
case $kind in
  build) build; exit 0;;
  stop) stop; exit $?;;
  go) ;;
  *) echo "serve: only the Go server is left (dev/serve.sh go)"; exit 1;;
esac
[ -n "$RK_NOBUILD" ] || build
stop || { echo "serve: something else answers on port $PORT"; exit 1; }
if [ "$keep" = keep ]; then find "$SRV" -mindepth 1 -maxdepth 1 ! -name state.json ! -name library.json -exec rm -rf {} + 2>/dev/null
else rm -rf "$SRV"; fi
mkdir -p "$SRV"
sed 's/^(function(){$/(function(){window.__t=(s)=>eval(s);/' initiative.html > "$SRV/initiative.html"
grep -q "window.__t" "$SRV/initiative.html" || { echo "serve: could not add the test hook"; exit 1; }
if [ "$data" = data ]; then
  [ -d "$RK_5ETOOLS" ] || { echo "serve: set RK_5ETOOLS to a 5e.tools data folder"; exit 1; }
  mkdir -p "$SRV/5etools"; for f in "$RK_5ETOOLS"/*; do ln -s "$f" "$SRV/5etools/"; done   # links per entry, so tests never write into your folder
fi
# sh writes its own pid and becomes the server (setsid execs in place, as sh is no group leader), so the pid file names the server
(cd "$SRV" && ROUNDKEEPER_DIR="$SRV" ROUNDKEEPER_PORT="$PORT" ROUNDKEEPER_NO_BROWSER=1 \
  nohup sh -c 'echo $$ > "$1/pid"; exec setsid "$2"' sh "$SRV" "$B/ti-linux" > "$SRV/log.txt" 2>&1 < /dev/null &)
for i in $(seq 1 60); do
  s=$(curl -s --noproxy '*' "http://127.0.0.1:$PORT/5et/status" | python3 -c "import json,sys;print(json.load(sys.stdin)['state'])" 2>/dev/null)
  [ "$s" = ready ] && break; sleep .5
done
echo "serve: $kind $data $s"; [ "$s" = ready ]
