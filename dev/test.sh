#!/bin/bash
# Run the browser test suites, each on a fresh server. One line per suite; details only when something fails.
#   dev/test.sh [-j N] [go] [suite ...]      e.g.  dev/test.sh t29     dev/test.sh     dev/test.sh -j 4
#   -j N   run N suites at once, each with its own server (ports 8771, 8781, …; folders dev/.work/srv-<port>).
#          Default 1: one suite after another on 8765, as before. CI uses -j 4.
#   (go, and both from before 1.2, still work and mean the same: there is one server)
# Default suites need nothing but the repo. Suites that need non-free files run only when those are set:
#   RK_PRIVATE=folder with sb/gyreguard.md and sb/lich.md (2024 statblocks)  -> t5 t7 t8
#   RK_5ETOOLS=a 5e.tools data folder                                       -> t16..t28, ui, hov
# Logs: dev/.work/out/<server>-<suite>.log
cd "$(dirname "$0")/.." || exit 1
ROOT=$PWD; OUT=$ROOT/dev/.work/out; mkdir -p "$OUT"
SRD="verify t2 t4 t9 t10 t11 t12 t13 t14 t15 rulestest_v2 mob2_v2 t29 t30 t31 t32 t33 t34 t35 t36 t37 t38 t39 t40 t41 t43 t44 t45 t46 t47"
PRIVS="t5 t7 t8"; DATA="t16 t17 t18 t19 t20 t21 t22 t23 t24 t25 t26 t27 t28 t42 ui hov"
jobs=1; if [ "$1" = -j ]; then jobs=${2:-1}; shift 2; fi
which=${1:-go}; shift 2>/dev/null
case $which in go|both) ;; py) echo "test: the Python server is gone since 1.2; use dev/test.sh"; exit 1;; *) set -- "$which" "$@";; esac
if [ $# -gt 0 ]; then suites="$*"; else
  suites=$SRD
  [ -f "${RK_PRIVATE:-$ROOT/dev/.work/private}/sb/gyreguard.md" ] && suites="$suites $PRIVS"
  [ -d "$RK_5ETOOLS" ] && suites="$suites $DATA"
fi
bash dev/serve.sh build || exit 1   # initiative.html from src/ and the server, once, before any server starts
export RK_NOBUILD=1

one(){   # one suite on the server at $RK_PORT; prints its line; returns 1 if it failed
  local t=$1 mode=srd log=$OUT/go-$1.log rc n
  case " $DATA " in *" $t "*) mode=data;; esac
  if [ $mode = data ] && [ ! -d "$RK_5ETOOLS" ]; then echo "go $t: skipped (needs RK_5ETOOLS)"; return 0; fi
  case " $PRIVS " in *" $t "*) [ -f "${RK_PRIVATE:-$ROOT/dev/.work/private}/sb/gyreguard.md" ] || { echo "go $t: skipped (needs RK_PRIVATE)"; return 0; };; esac
  if [ $t = t34 ]; then export ROUNDKEEPER_UPDATE_URL=http://127.0.0.1:8799/latest ROUNDKEEPER_VERSION=v1.0.7   # a fake GitHub, see t34
  else unset ROUNDKEEPER_UPDATE_URL ROUNDKEEPER_VERSION; fi
  bash dev/serve.sh go "$mode" > /dev/null 2>&1 || { echo "go $t: server did not start"; return 1; }
  (cd "$OUT" && timeout 400 python3 "$ROOT/dev/tests/$t.py" > "$log" 2>&1); rc=$?
  n=$(grep -cE "^ *FAIL|FAIL " "$log")
  if [ "$rc" = 0 ] && [ "$n" = 0 ] && ! grep -q Traceback "$log"; then echo "go $t: ok"; return 0; fi
  { echo "go $t: FAILED (exit $rc, $n FAIL) - $log"; grep -E "FAIL|Error|Traceback" "$log" | head -6 | sed 's/^/    /'; } | (flock 9; cat) 9>"$OUT/.print.lock"
  return 1
}

if [ "$jobs" -le 1 ]; then
  bad=0; for t in $suites; do one "$t" || bad=1; done
  bash dev/serve.sh stop > /dev/null 2>&1
  exit $bad
fi

# -j N: N workers take the next suite from a shared list until it is empty
Q=$OUT/.queue; echo $suites | tr ' ' '\n' > "$Q"; rm -f "$OUT"/.bad-*
worker(){
  export RK_PORT=$((8761 + 10 * $1)); local t
  while :; do
    t=$( (flock 9; t=$(head -n1 "$Q"); [ -n "$t" ] && sed -i 1d "$Q"; echo "$t") 9>"$Q.lock")
    [ -z "$t" ] && break
    one "$t" || touch "$OUT/.bad-$t"
  done
  bash dev/serve.sh stop > /dev/null 2>&1
}
for k in $(seq 1 "$jobs"); do worker "$k" & done
wait
ls "$OUT"/.bad-* > /dev/null 2>&1 && exit 1
exit 0
