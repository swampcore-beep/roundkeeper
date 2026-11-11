# Developer tools

Everything here is for working on Roundkeeper, not for running it at the table. You need Python 3 with Playwright (`pip install playwright pillow fonttools brotli`, then `playwright install chromium`), Go 1.24, ffmpeg (for the media) and curl.

All output goes to `dev/.work/`, which git ignores.

## The app's source

The app ships as one file, `initiative.html`, but it is edited in parts in `src/`:

```bash
python3 tools/build.py           # join src/* into initiative.html (dev/serve.sh and dev/test.sh do it too)
python3 tools/build.py --check   # only check that initiative.html matches src/ (also run on every pull request)
```

The parts are joined in the order of their numbers and are pieces of one file, not modules: the CSS parts sit in one `<style>`, the app's JS parts in one function. Commit `initiative.html` together with the change in `src/`. Lines stay under about 160 characters; to break long ones (Node 18 or later):

```bash
cd dev/wrap && npm install && node wrap.js   # breaks long CSS and JS lines in src/, then rebuilds initiative.html
```

It breaks only where whitespace means nothing (after `;` `,` `{` and similar, never inside a string or right after `return`), and stops without writing anything unless the JS parses to the same tree, the CSS to the same rules, and only spaces and newlines differ. The QR code library and the markup are left as they are. A change made only in `initiative.html` would be lost at the next build, so the build refuses to overwrite one that was edited after `src/`.

## Servers

```bash
dev/serve.sh go          # build and start the Go server, only the built-in SRD
dev/serve.sh py          # the Python server instead
dev/serve.sh go data     # with a 5e.tools data folder: RK_5ETOOLS=/path/to/5etools
dev/serve.sh go srd keep # keep state.json and library.json from the last run
```

Each run stops whatever is on port 8765 and starts fresh in `dev/.work/srv`. The page gets a test hook, `window.__t(js)`, which runs code inside the app, so tests can set up a fight in one call.

The server treats this computer (127.0.0.1) as the DM. Tests open player pages (the tablet, phones) on this computer's LAN address, which `dev/rk.py` works out. Set `RK_LAN` if it guesses wrong.

## Tests

```bash
dev/test.sh              # every suite that needs only the repo, on the Go server
dev/test.sh both         # the same on Go, then on Python
dev/test.sh py t29 t4    # some suites on one server
```

One line per suite (`go t4: ok`). A failing suite shows its first FAIL lines and the path to its full log in `dev/.work/out/`.

Two groups need files that can't be in a public repo, and run only when you point to them:

| Suites | Needs |
|---|---|
| t5, t7, t8 | `RK_PRIVATE=folder` with `sb/gyreguard.md` and `sb/lich.md` (2024 statblocks as Markdown) |
| t16–t28, ui, hov | `RK_5ETOOLS=folder` with 5e.tools data (`data/bestiary/…`, `data/spells/…`) |

Never commit those files.

| Suite | Covers |
|---|---|
| verify | death saves, real dice, the DM asking a phone to roll |
| t2, t4 | conditions set from a phone and shown on the tablet; the phone's HP keypad |
| t5, t7, t8 | pasted statblocks, the library, the drawer's rolls, legendary actions per turn |
| t9, t10 | the phone's keypads and the spell search keyboard |
| t11–t15 | new-round and turn effects, roll calls, group initiative, labels, saves from statblocks |
| rulestest_v2, mob2_v2 | 2024 rules automation; the phone view |
| t16–t24 | the 5e.tools library: lair actions, 2014/2024 printings, effects, damage popover, Concentration, themes, Legendary Resistance, DM pairing, pictures |
| t25–t28 | the TV, round 1–3 features (player HP for the DM, character sheets, scenes and reactions) |
| t29 | the SRD with no data folder, and Settings → Game data → Import JSON |
| t30–t33 | the phone's tracker circles, UI polish (Add monsters, badges without codes), the Devices window and who is connected, TV pack 2 (dice, roll call, death saves, countdown, initiative, end of the fight) |
| t34 | Settings → Updates against a fake GitHub on port 8799 (`dev/test.sh` sets `ROUNDKEEPER_UPDATE_URL` and `ROUNDKEEPER_VERSION=v1.0.7` for this suite only): newer or not, cache, errors, links, who may ask, the window and the start-up check |
| ui, hov | the monster search sheet; hover cards for spells and rules |

## Media for the README

Run these against `dev/serve.sh go` (SRD only, so no setting names or non-free monsters appear):

```bash
python3 dev/media/stills.py        # screenshots -> dev/.work/media/stills
python3 dev/media/gifs.py          # recordings and the four GIFs -> dev/.work/media/gifs
python3 dev/media/backdrop.py      # the Northern lights backdrop for the composites
python3 dev/media/four.py          # four-screens picture
python3 dev/media/social.py        # 1280x640 social preview
python3 dev/media/phones.py        # four phones side by side (Reddit gallery)
python3 dev/media/publish.py       # copy into media/ with the README's names and sizes
```

The README's four videos are uploaded to GitHub, not kept in the repo. Each stays under a minute:

```bash
# one fight on all four screens, at the top
for s in dm tablet tv phone; do python3 dev/media/video_four_rec.py $s; done && python3 dev/media/video_four.py
# the three tours: the DM's laptop, the tablet and the TV, a player's phone
for s in dm tablet phone; do python3 dev/media/video_dm_rec.py $s; done && python3 dev/media/video_make.py dm
for s in tablet tv; do python3 dev/media/video_table_rec.py $s; done && python3 dev/media/video_make.py table
for s in phone tablet; do python3 dev/media/video_phone_rec.py $s; done && python3 dev/media/video_make.py phone
```

Each screen is recorded in its own pass because a two-core machine can't record several at once smoothly. The passes are lined up by the captions' marks. `vrec.py` has the recording helpers (the DM's drawn cursor, the phone's taps, and `present()`, which makes the Devices window show every screen and phone as connected). `video_make.py` stops if a video would run over a minute. To put a new video in the README, drag the mp4 into a comment on a pull request, then use the link GitHub gives.

`scene.py` holds the party and the fight every script starts from. The names in it are invented ("Scourge of the Ashen Peaks"), so keep setting names out of it.
