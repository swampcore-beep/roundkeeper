# Developer tools

Everything here is for working on Roundkeeper, not for running it at the table. You need Python 3 with Playwright (`pip install playwright pillow fonttools brotli`, then `playwright install chromium`), Go 1.24, ffmpeg (for the media) and curl.

All output goes to `dev/.work/`, which git ignores.

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

The two videos at the top of the README are uploaded to GitHub, not kept in the repo:

```bash
for s in dm tablet tv phone; do python3 dev/media/video_four_rec.py $s; done && python3 dev/media/video_four.py
for s in dm tablet phone; do python3 dev/media/video_dm_rec.py $s; done && python3 dev/media/video_dm.py
```

Each screen is recorded in its own pass because a two-core machine can't record four at once smoothly. The passes are lined up by the captions' marks. To put a new video in the README, drag the mp4 into a comment on a pull request, then use the link GitHub gives.

`scene.py` holds the party and the fight every script starts from. The names in it are invented ("Scourge of the Ashen Peaks"), so keep setting names out of it.
