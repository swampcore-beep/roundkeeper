#!/bin/bash
# Run the browser test suites, each on a fresh server. One line per suite; details only when something fails.
#   dev/test.sh [go|py|both] [suite ...]      e.g.  dev/test.sh go t29     dev/test.sh both
# Default suites need nothing but the repo. Suites that need non-free files run only when those are set:
#   RK_PRIVATE=folder with sb/gyreguard.md and sb/lich.md (2024 statblocks)  -> t5 t7 t8
#   RK_5ETOOLS=a 5e.tools data folder                                       -> t16..t28, ui, hov
# Logs: dev/.work/out/<server>-<suite>.log
cd "$(dirname "$0")/.." || exit 1
ROOT=$PWD; OUT=$ROOT/dev/.work/out; mkdir -p "$OUT"
SRD="verify t2 t4 t9 t10 t11 t12 t13 t14 t15 rulestest_v2 mob2_v2 t29"
PRIVS="t5 t7 t8"; DATA="t16 t17 t18 t19 t20 t21 t22 t23 t24 t25 t26 t27 t28 ui hov"
which=${1:-go}; shift 2>/dev/null
case $which in go|py) servers=$which;; both) servers="go py";; *) set -- "$which" "$@"; servers=go;; esac
if [ $# -gt 0 ]; then suites="$*"; else
  suites=$SRD
  [ -f "${RK_PRIVATE:-$ROOT/dev/.work/private}/sb/gyreguard.md" ] && suites="$suites $PRIVS"
  [ -d "$RK_5ETOOLS" ] && suites="$suites $DATA"
fi
bad=0
for s in $servers; do for t in $suites; do
  mode=srd; case " $DATA " in *" $t "*) mode=data;; esac
  bash dev/serve.sh "$s" "$mode" > /dev/null 2>&1 || { echo "$s $t: server did not start"; bad=1; continue; }
  log=$OUT/$s-$t.log
  (cd "$OUT" && timeout 400 python3 "$ROOT/dev/tests/$t.py" > "$log" 2>&1); rc=$?
  n=$(grep -cE "^ *FAIL|FAIL " "$log")
  if [ "$rc" = 0 ] && [ "$n" = 0 ] && ! grep -q Traceback "$log"; then echo "$s $t: ok"
  else bad=1; echo "$s $t: FAILED (exit $rc, $n FAIL) - $log"; grep -E "FAIL|Error|Traceback" "$log" | head -6 | sed 's/^/    /'; fi
done; done
pkill -x ti-linux 2>/dev/null; pkill -f "python3 [s]erver.py" 2>/dev/null
exit $bad
