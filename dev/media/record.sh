#!/bin/bash
# Make the README media in one go, each part on a fresh SRD-only server (dev/serve.sh go).
#   dev/media/record.sh [what ...]          default: stills pictures
#   stills     screenshots                                    -> stills/*.png
#   pictures   backdrop, four screens, social preview, phones (needs stills; made first if missing)
#   gifs       the four GIFs                                  -> gifs/*.gif
#   four       the four-screens video                         -> roundkeeper-four-screens.mp4
#   dm table phone   the three tours                          -> roundkeeper-<name>.mp4
#   videos     four dm table phone;   all   everything
# Everything is made in dev/.work/media as before. The finished files are also gathered in dev/.work/media/out:
# out/readme holds what dev/media/publish.py would put in media/ (README names and sizes), out/videos the mp4s,
# out/stills the screenshots. The "Record media" workflow uploads out/ as an artifact; nothing is committed.
cd "$(dirname "$0")/../.." || exit 1
ROOT=$PWD; M=$ROOT/dev/.work/media; OUT=$M/out
want=" ${*:-stills pictures} "
want=${want// all / stills pictures gifs videos }
want=${want// videos / four dm table phone }
for w in $want; do
  case $w in stills|pictures|gifs|four|dm|table|phone) ;; *) echo "record: unknown part '$w' (stills pictures gifs four dm table phone videos all)"; exit 1;; esac
done
has(){ case "$want" in *" $1 "*) return 0;; esac; return 1; }
step(){ echo "record: $*"; }
fresh(){ bash dev/serve.sh go > /dev/null 2>&1 || { echo "record: the server did not start"; exit 1; }; }
run(){ python3 "$@" || { echo "record: failed: $*"; exit 1; }; }
rm -rf "$OUT"; mkdir -p "$OUT/readme" "$OUT/videos" "$OUT/stills"
vid(){ cp "$M/$1" "$OUT/videos/" || { echo "record: $1 is missing"; exit 1; }; }
bash dev/serve.sh build || exit 1
export RK_NOBUILD=1

if has stills || { has pictures && [ ! -d "$M/stills" ]; }; then step stills; fresh; run dev/media/stills.py; fi
if has pictures; then
  step pictures; fresh
  run dev/media/backdrop.py; run dev/media/four.py; run dev/media/social.py; run dev/media/phones.py
fi
if has gifs; then step gifs; fresh; run dev/media/gifs.py; fi
if has four; then
  for s in dm tablet tv phone; do step "four-screens video: $s"; fresh; run dev/media/video_four_rec.py "$s"; done
  run dev/media/video_four.py; vid roundkeeper-four-screens.mp4
fi
if has dm; then for s in dm tablet phone; do step "DM tour: $s"; fresh; run dev/media/video_dm_rec.py "$s"; done; run dev/media/video_make.py dm; vid roundkeeper-dm.mp4; fi
if has table; then for s in tablet tv; do step "table tour: $s"; fresh; run dev/media/video_table_rec.py "$s"; done; run dev/media/video_make.py table; vid roundkeeper-table.mp4; fi
if has phone; then for s in phone tablet; do step "phone tour: $s"; fresh; run dev/media/video_phone_rec.py "$s"; done; run dev/media/video_make.py phone; vid roundkeeper-phone.mp4; fi
bash dev/serve.sh stop > /dev/null 2>&1

# gather: publish.py writes into media/, so give it a copy of the repo's media/ and keep only what it changed
tmp=$(mktemp -d); cp -r media "$tmp/before"
python3 dev/media/publish.py > "$OUT/publish.txt" 2>&1 || { cat "$OUT/publish.txt"; echo "record: publish failed"; }
for f in media/*; do
  [ -f "$f" ] || continue
  cmp -s "$f" "$tmp/before/$(basename "$f")" || cp "$f" "$OUT/readme/"
done
cp -r "$tmp/before/." media/; rm -rf "$tmp"   # media/ in the working tree stays as it was
has stills && cp "$M"/stills/*.png "$OUT/stills/" 2>/dev/null
for d in readme videos stills; do rmdir "$OUT/$d" 2>/dev/null; done
step "done:"; (cd "$OUT" && find . -type f ! -name publish.txt | sort | sed 's|^\./|  |')
# a README video goes up as a comment attachment: 10 MB at most on a free GitHub plan
for v in "$OUT"/videos/*.mp4; do
  [ -f "$v" ] || continue; b=$(stat -c %s "$v")
  echo "record: $(basename "$v") $(awk -v b="$b" 'BEGIN{printf "%.1f MB",b/1048576}')$( [ "$b" -gt 10485760 ] && echo ' — over the 10 MB limit')"
done
