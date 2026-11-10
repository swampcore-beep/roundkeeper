# Roundkeeper: notes for Claude

A free, offline combat tracker for in-person 5e (2024 rules). The DM runs it on a laptop; a tablet on the table, a TV and the players' phones open pages from the same local server over Wi-Fi. Public repo, AGPL-3.0. The owner writes in Croatian, so reply in Croatian; the app, README and code comments are in English.

## Files

| Path | What |
|---|---|
| `initiative.html` | The whole app in one file (~9000 lines, long lines: use Grep with a pattern, then Read with offset/limit around the hit; never read it whole) |
| `server.py` | Python server, standard library only (Mac/Linux and the Python zip) |
| `go/main.go`, `go/fivetools.go` | Go server, the same behaviour, built into `Roundkeeper.exe` |
| `srd/srd-5.2.1.json` | The built-in SRD (made by `tools/srd_from_open5e.py`) |
| `media/` | README pictures and GIFs (regenerate with `dev/media/`) |
| `dev/` | Test servers, test suites, media scripts: see `dev/README.md` |
| `.github/workflows/release.yml` | A `v*` tag builds the Windows exe and both zips and attaches them to the release |

### Inside `initiative.html`

Lines 15–1857 are CSS, then the markup. The first `<script>` is the QR code library (MIT). The app is the second script, one IIFE from `(function(){` (about line 4251) to the end. Find things by name:

- Mode and sync: `const MODE` ("dm" or "player"), `meName` ("*" on the tablet/TV), `commit()` → `finish()` → POST /state. Phones send actions to POST /player.
- DM screen: `renderDM`, statblocks `parseStatblock` / `sbSheet`, Hit several `mtStart` / `mtRender`, Ctrl+K `qkLoad` / `qk…`, Atmosphere `atmoSheet`, conditions `condSheet`, Game data `gdSheet`, monster search `fetBoxHtml` / `fetRedraw`, rules cards `refGet`.
- Tablet and phones: `renderPlayer`; phone sheets `renderPSheet`; spells `spLoad`; class data `pcLoad`.
- TV: `tvRender`. Scenes: `SCENES`, `THEMES`, the `Scene` engine, `sceneReact`.
- One delegated click handler: `document.addEventListener('click'`, keyed by `data-act` (search for `case "name"` or the name in quotes).

### Servers

Both servers must behave the same. Any change to routes, `public_view` (what players may see) or player actions (`_player_action` in `server.py`, `playerAction` in `main.go`; `public_view` / `publicView`) goes into both, and the tests run on both.

## Rules that must not break

- Players, the tablet and the TV never receive: hidden enemies, monster `hp`/`hpMax`/`thp`/`hpLog`/`sb`/`ib` (except a player's own companion), player HP `php`, `sheets`, `clog`, `cstat`, `tstat`, `nstat`, secret clocks. Only the DM (localhost, or a device paired with the `ti_dm` cookie) changes state or reads the library.
- No PIN, no accounts, no login on player devices. Bloodied and Down stay manual.
- Never bundle, download or commit 5e.tools data, 5etools images, or non-SRD statblocks. The SRD 5.2.1 (CC BY 4.0) is the only built-in content.
- No setting names (Forgotten Realms etc.) in labels, sample data or media (internal keys such as `avernus` stay); screenshots come from the SRD-only server (`dev/serve.sh go`).
- No "D&D" in product names or headlines; say "5e".

## Working on it

- Start a test server with `dev/serve.sh go` (or `py`). Run tests with `dev/test.sh` (one line per suite); run just the suites you touched while working, and `dev/test.sh both` before a pull request.
- Never put the strings `ti-linux` or `python3 server.py` in a shell command line together with the serve or test scripts: they stop servers with `pkill`, which would match your own shell.
- Work on a branch and open a pull request with `gh api repos/swampcore-beep/roundkeeper/pulls`; never push to `main` (it is protected). Merge only when the owner says so (`gh api -X PUT …/pulls/N/merge -f merge_method=merge`). Tags, releases, repo settings and branch deletion are done by the owner in the GitHub UI.
- Commit as the owner with the Claude committer so commits show as Verified and no personal email appears:
  `GIT_AUTHOR_NAME=swampcore-beep GIT_AUTHOR_EMAIL=swampcore-beep@users.noreply.github.com git -c user.name=Claude -c user.email=noreply@anthropic.com commit …`
- When the owner asks a question, answer it; build only when asked.
