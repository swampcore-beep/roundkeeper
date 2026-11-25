# Roundkeeper: notes for Claude

A free, offline combat tracker for in-person 5e (2024 rules). The DM runs it on a laptop; a tablet on the table, a TV and the players' phones open pages from the same local server over Wi-Fi. Public repo, AGPL-3.0. The owner writes in Croatian, so reply in Croatian; the app, README and code comments are in English.

## Files

| Path | What |
|---|---|
| `src/` | The app's source in parts (`NN-name.css`, `.js`, `.html`): **edit these** |
| `initiative.html` | The whole app in one file, put together from `src/` by `tools/build.py`; never edit it by hand (the programs embed it) |
| `go/main.go`, `go/fivetools.go` | The server, built into `Roundkeeper.exe` and the Mac and Linux programs (the Python server was removed in 1.2); `go/open_windows.go` / `go/open_other.go` open the browser |
| `go/winres/winres.json` | Icon, version, publisher and manifest of `Roundkeeper.exe`; the release makes `go/rsrc_windows_amd64.syso` from it with go-winres (the committed one says 0.0.0) |
| `srd/srd-5.2.1.json` | The built-in SRD (made by `tools/srd_from_open5e.py`) |
| `dice/dice-box.js` | The 3D dice (@3d-dice/dice-box-threejs 0.0.12 with three.js and cannon-es, MIT, unchanged; see `THIRD-PARTY-NOTICES.txt`), served as `/dice/dice-box.js` and loaded only by a screen set to 3D |
| `media/` | README pictures and GIFs (regenerate with `dev/media/`) |
| `dev/` | Test servers, test suites, media scripts: see `dev/README.md` |
| `.github/workflows/release.yml` | A `v*` tag builds the Windows exe, the Mac program (universal, joined by `tools/makefat.py`), and the Linux programs, and attaches them to the release |
| `.github/workflows/check.yml` | Every pull request: `initiative.html` must match `src/`, the Windows program must build with its resources, and all SRD test suites must pass (`dev/test.sh -j 4`) |
| `.claude/agents/` | The helper agents (see Models and helpers) |
| `dev/tools/testmap.py` | Which test suites cover a file (`--changed`: what differs from `origin/main`) |

### Inside the app (`src/`)

`python3 tools/build.py` joins `src/*` in the order of their numbers into `initiative.html` (`--check` only compares). `dev/serve.sh` and `dev/test.sh` build first, so a test always runs the current `src/`. Commit the built `initiative.html` together with the `src/` change. The parts are pieces of one file, not modules: `00-head.html` opens the page and the `<style>`, `10-`…`30-` are the CSS (DM, tablet, phone, status effects, frames, themes, TV…), `40-body.html` is the markup, `50-qrcode.js` the QR code library (MIT, leave it as it is), and `60-`…`86-` are the app, one IIFE from `(function(){` (first line of `60-data.js`; `dev/serve.sh` adds the test hook there) to `})();` at the end of `86-boot.js`. A new part takes a free number between its neighbours. Keep lines under about 160 characters (long HTML strings and data URIs may run over); `node dev/wrap/wrap.js` breaks long ones where whitespace means nothing and proves the JS tree and CSS rules didn't change. Find things by name with Grep in `src/`:

- Mode and sync: `const MODE` ("dm" or "player"), `meName` ("*" on the tablet/TV), `commit()` → `finish()` → POST /state. Phones send actions to POST /player.
- DM screen: `renderDM`, statblocks `parseStatblock` / `sbSheet`, Hit several `mtStart` / `mtRender`, Ctrl+K `qkLoad` / `qk…`, Atmosphere `atmoSheet`, conditions `condSheet`, Game data `gdSheet`, monster search `fetBoxHtml` / `fetRedraw`, rules cards `refGet`.
- Tablet and phones: `renderPlayer`; phone sheets `renderPSheet`; spells `spLoad`; class data `pcLoad`.
- TV: `tvRender`. Scenes: `SCENES`, `THEMES`, the `Scene` engine, `sceneReact`.
- One delegated click handler in `85-events.js`: `document.addEventListener('click'`, keyed by `data-act` (search for `case "name"` or the name in quotes).

### Server

Settings → Updates: `/update/check` (`updateCheck` in `main.go`, the computer running the server only) asks GitHub for the latest release; the release workflow writes the tag into `main.version` (`dev` otherwise, which never offers an update). The release description is shown to users there, so draft release notes for users. Tests use a fake GitHub (`t34`).

What players may see is decided in `publicView`, and player actions in `playerAction` (both in `main.go`); change them with care and cover the change in a test.

## Rules that must not break

- Players, the tablet and the TV never receive: hidden enemies, monster `hp`/`hpMax`/`thp`/`hpLog`/`sb`/`ib` (except a player's own companion), player HP `php`, `sheets`, `clog`, `cstat`, `tstat`, `nstat`, secret clocks. Only the DM (localhost, or a device paired with the `ti_dm` cookie) changes state or reads the library.
- No PIN, no accounts, no login on player devices. Bloodied and Down stay manual.
- Never bundle, download or commit 5e.tools data, 5etools images, or non-SRD statblocks. The SRD 5.2.1 (CC BY 4.0) is the only built-in content.
- No setting names (Forgotten Realms etc.) in labels, sample data or media (internal keys such as `avernus` stay); screenshots come from the SRD-only server (`dev/serve.sh go`).
- No "D&D" in product names or headlines; say "5e".

## Working on it

- Start a test server with `dev/serve.sh go`. Run tests with `dev/test.sh` (one line per suite); while working run just the suites that cover what you changed: `dev/test.sh $(python3 dev/tools/testmap.py --changed)`. Every pull request's Check runs all SRD suites (`dev/test.sh -j 4`, logs as an artifact when it fails), so wait for it there instead of running the whole set locally; `dev/test.sh -j 2` runs the whole set here when you need it.
- Never put the string `ti-linux` in a shell command line together with the serve or test scripts: they stop the server with `pkill`, which would match your own shell.
- Work on a branch and open a pull request with `gh api repos/swampcore-beep/roundkeeper/pulls`; never push to `main` (it is protected). Merge only when the owner says so (`gh api -X PUT …/pulls/N/merge -f merge_method=merge`). Tags, releases, repo settings and branch deletion are done by the owner in the GitHub UI.
- Commit as the owner with the Claude committer so commits show as Verified and no personal email appears:
  `GIT_AUTHOR_NAME=swampcore-beep GIT_AUTHOR_EMAIL=swampcore-beep@users.noreply.github.com git -c user.name=Claude -c user.email=noreply@anthropic.com commit …`
- When the owner asks a question, answer it; build only when asked.

## Models and helpers

The owner has given standing permission (10. 11. 2026, widened 25. 11. 2026) to hand routine work to the helper agents below without asking each time. Say briefly in the reply what was handed off.

Order of preference: a script or CI first (no tokens, same result every time: the tests run in Check, `dev/tools/testmap.py` picks suites), then a helper, then the main session. Hand work to a helper only when its brief is shorter than the work and its answer is short; do small things yourself.

| Agent | Model | Tools | For | Answers with |
|---|---|---|---|---|
| `rk-search` | Haiku | read only | where something is, what calls what, which suite covers it | up to 15 `path:line` lines |
| `rk-media` | Sonnet | shell, pictures | screenshots and videos with `dev/media/` on the SRD server, and looking at them | the files, what looks wrong, at most 2 to look at |
| `rk-writer` | Sonnet | read only | release notes (English, for users), PR descriptions, project notes (Croatian) | the text, ready to use |
| `rk-review` | Opus | read only | a fresh review of the diff before a PR: what players receive, licensing, names, new bugs | problems with `path:line`, or "Clean." |

- Their instructions are in `.claude/agents/<name>.md`. If the session lists the agent type, use it with a one- or two-sentence brief. If it does not (agents load when a session starts), start a general-purpose agent with that model and the brief "Follow `.claude/agents/<name>.md` (skip its front matter). Task: …".
- Pictures are the costliest thing in the main session's context: let `rk-media` look at them and read its text; open a picture yourself only for a design decision or the final check.
- Run helpers in the background while you go on. Two independent helpers can run at once.
- `rk-review` reviews every change to `go/main.go`, `publicView`, `playerAction` or anything sent to players, and any change larger than about 200 lines, before the pull request.
- Helpers never commit, push or open pull requests. Review a helper's work (diff, text, report) before you use it.
- Keep design decisions, hard bugs, what players may see, and licensing questions in the main session. If a helper fails twice at the same thing, do it yourself.

If a task looks too hard for the model this session runs on, or a helper's result isn't good enough, ask the owner to switch to a stronger model instead of pushing on.
