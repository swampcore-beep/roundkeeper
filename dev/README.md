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
dev/serve.sh go data     # with a 5e.tools data folder: RK_5ETOOLS=/path/to/5etools
dev/serve.sh go srd keep # keep state.json and library.json from the last run
```

Each run stops whatever is on port 8765 and starts fresh in `dev/.work/srv`. The page gets a test hook, `window.__t(js)`, which runs code inside the app, so tests can set up a fight in one call.

The server treats this computer (127.0.0.1) as the DM. Tests open player pages (the tablet, phones) on this computer's LAN address, which `dev/rk.py` works out. Set `RK_LAN` if it guesses wrong.

## Tests

```bash
dev/test.sh              # every suite that needs only the repo, on the Go server
dev/test.sh t29 t4       # just some suites
```

One line per suite (`go t4: ok`). A failing suite shows its first FAIL lines and the path to its full log in `dev/.work/out/`.

Two groups need files that can't be in a public repo, and run only when you point to them:

| Suites | Needs |
|---|---|
| t5, t7, t8 | `RK_PRIVATE=folder` with `sb/gyreguard.md` and `sb/lich.md` (2024 statblocks as Markdown) |
| t16–t28, t42, ui, hov | `RK_5ETOOLS=folder` with 5e.tools data (`data/bestiary/…`, `data/spells/…`) |

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
| t35 | the DM screen of v1.1: the grouped header, the ⋯ menus (stop turns, New combat, Clear all), one End/New combat button, Players can edit, HP placeholders and lined-up columns, the statblock that follows the turn and the line for what waits under it |
| t36 | 1.3: the DM screen's tool look (turn tiles, the countdown tile, condition icons; the Classic look went in 1.4), boss phases on the TV and tablet, the tablet's frames by side, the phone's class colour, and handouts (the editor, where each one shows, players never getting the saved ones) |
| t37 | 1.4: the DM screen on a laptop (1920×1080 and 1536×864): the turn in one row, nothing covers the order, columns line up, empty cells (Set HP, AC, a person outline), the lair action on one line, Hit several in the Init column, toasts up top, the panel by phase, the drawer under 1100 px; the phone's dock and four tabs with nothing under 12 px. With `dev/.work/axe.min.js` (from `npm i axe-core`) it also runs axe, WCAG 2.2 AA |
| t38 | 1.4 on the phones: the Your turn screen and its switch, the table's roll log (E18) and what it carries to the players, the aura reminder in a save roll call (E19), Bless and Bane on saves and attacks, the HP sheet's preview |
| t39 | 1.4.1 on the TV: Bloodied, Down, Stable and Dead on the spotlight, on deck and in the order; "Up next" when the creature on turn is hidden or already defeated; a roll call with no answers yet; the end card without minutes |
| t40 | 1.4.8: the rules of play the app works out (2024, SRD 5.2.1): temp HP, healing, Concentration (DC, 0 HP, Incapacitated, a new spell ends the old one, undo), immunity, resistance, vulnerability and half on a save, lair action ties, Legendary Actions and Recharge, Bless and spell durations, condition ends and saves, death saves (natural 1 and 20, damage at 0 HP, a critical hit, Stable, instant death), Exhaustion, short and long rests, sheet numbers, advantage and critical damage on the phone sheet and in roll calls, Bless and Bane on monsters, advantage on a target's save in Hit several, 2024 multiclass spell slots |
| t41 | 1.5: the new character sheet: subclass, background, size and weapon notes (entry and paste), the sheet as a card in the DM's drawer (band, AC, HP from the phone, abilities and saves, skills, spellcasting, attacks, spells; rolls), the phone's sheet with Main (sections that open and are remembered), Spells (slots as boxes, casting time and range) and Features (tracked features, class and subclass features up to your level, feats), the spell list's time and range, and that players never get sheets |
| t42 | 1.5, needs RK_5ETOOLS: feats on the sheet from the 5e.tools files: the list, the choices a feat asks for, Add and apply / Add only, taking a feat off, Alert, Tough, War Caster, Durable, feat uses as trackers, the feats on the DM's card |
| t43 | 1.6: dice on the screens: shared rolls carry their dice and the server keeps only real ones, the DM's 3D / Light / Off for the TV, the tablet and the phones and a player's own choice on their phone, 3D dice that land on the rolled faces (WebGL in software), Light without WebGL and in the TV's Light mode, Off with reduced motion |
| t44 | 1.7: the side panel: Fight and Prep tabs by the phase and by hand, quick add at the foot of Fight, titles that say what is in each section, a fight that fits 1536×864, Settings and files in a window, the sun and moon switch, button edges of 3:1 in both themes |
| t45 | 1.7: one look per role on the DM screen: toolbar, header, turn bar and statblock buttons with an edge of 3:1, End combat red, Players can edit a toggle, the picked attack roll and Statblock/Picture raised, quiet row icons at 4.5:1, the statblock hint behind ?, HP's tint under the mouse, in both themes |
| t46 | 1.7: the Spell effect window with a saving throw (SRD): Fireball from a statblock prefilled (level 6, 11d6 fire, DEX, DC 20, half) and handed to Hit several with saves rolled and a roll call; Hold Person keeps only those who fail, its DC remembered for a player, saved again at the end of a turn or on the phone; Bless without a save; the DM loads the spells despite a tablet mark in the browser; a spell card near the bottom stays inside the window |
| t47 | 1.7: the DM screen under the mouse, both themes: HP, initiative, AC and the name get a soft tint with no edge and do not move; HP keeps 10px before its number, its bar under the number and a pencil; AC keeps its shield; every button in the toolbar, header, turn bar, rows, side panel and statblock changes under the mouse (except what shows the pick) |
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

The README's four videos are uploaded to GitHub, not kept in the repo. Each stays under a minute. Their look is in `look.py` (since 1.4): a matte, warm table surface with grain, plain device bodies with contact shadows, plain captions in Atkinson Hyperlegible, real keycaps, one clay accent for clicks and taps, and left-aligned cards with the name in Alegreya SC. No gradients, glows, vignettes or centred gold titles; keep it that way so the videos don't look generated.

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
