# Music Curator

A personal music library manager for one person who owns their music files and cares about **ranking and curating** them. It keeps your library (artists, albums, releases, tracks, playlists, notes, "relational bios") and ranks your tracks by asking one simple question over and over: *which of these two is better?*

Your answers become an Elo score for every track, shown as a 0–10 rating. Playback follows rules you define ("always play B right after A"), and everything keeps working offline.

> This repository is mid-rewrite. The app that lives in the repo root (`src/`, `server/`) is the **legacy** Dyad-generated version and will be deleted once the new one has full parity. Everything described here is the new code in `packages/` and `apps/`.

## What it does

- **Rank by head-to-head votes.** "This or That" shows two tracks, you pick one (or call it equal). Votes are an append-only log; Elo, comparison counts and the 0–10 rating are *derived* by replaying it, so voting from several devices merges cleanly. Keyboard: ← → pick, ↓ equal, S skip. A 15-second mid-track preview is built in, follows the player's volume and pauses whatever is playing.
- **Browse and edit a real library.** Albums (with releases/editions and an editable tracklist), artists, tracks (sortable, filterable), playlists, a search page, stats, and a **library health** page that finds missing covers, links, dates, lead credits and so on. An album's cover, genres and credits flow down to its tracks.
- **Credits are the artist.** There is no "artist" field: the *Lead artist* credit is the artist, and every other role (producer, writer, featured…) is a credit too.
- **Playback with rules and a real queue.** Play next, add to queue, reorder, shuffle that keeps rule pairs together, playback history and per-track play logs.
- **Relational bios.** Notes that connect artists, albums and tracks (a feud, a collective, an era) and show up on each entity's page, plus a journal on the home page.
- **Get music in.** Import a whole album from a YouTube / YouTube Music link (yt-dlp on the server), add audio files from your device, or add tracks by hand. The server can download missing audio for tracks that have a YouTube link.
- **Local first.** Every client keeps the whole library in its own storage and works with no server. When a server is reachable it syncs in the background (last-writer-wins per record). Audio can be kept offline per album or playlist, within a storage limit you set.
- **Make it look like yours.** See [Appearance](#appearance).

## How it is put together

| Part | What it is |
|---|---|
| `packages/core` (`@curator/core`) | Pure TypeScript shared by everything: ids (UUIDv7), Elo and vote replay, queue and playback rules, the sync record type and its merge rule, the canonical entity shapes. |
| `packages/server` (`@curator/server`) | A small self-contained Node server (Hono, `node:sqlite`, no native build) meant for a Raspberry Pi with an external drive. Sync API, content-addressed audio/image storage with HTTP range, yt-dlp acquisition, the legacy-database migration, and it serves the web client. Token auth. |
| `apps/web` (`@curator/web`) | The client: Vite + React 19 + Tailwind 3 + zustand + IndexedDB. Works in a desktop or phone browser and installs as a PWA. |
| `apps/` (planned) | An Electron desktop app, and a native Kotlin/Media3 Android app (needed for Android Auto, which only supports native media apps). |

Sync model: every row is a record `{table, id, updatedAt, deviceId, deleted, data}`; the server hands out an increasing sequence number and clients pull from their last cursor and push their outbox. Files are immutable and addressed by their SHA-256, and records refer to files by hash, never by path.

## Appearance

Settings → Appearance has two independent choices, with a live preview you can hover through before committing:

- **Colour theme**: the app's own **Default**, **Classic** (the original look, tighter, with loud uppercase headings) and **Light**, a *System* option that follows your OS, 17 more colour themes (Daylight, Sand, Slate, Midnight, Ocean, Forest, Plum, Crimson, Ember, Graphite, AMOLED black, Nord, Dracula, Mocha, Tokyo Night, Gruvbox, Solarized) and 16 palettes copied from real platforms (Adwaita, Breeze, Windows 11/10/7/XP/98, macOS, Material You, light and dark where they exist).
- **UI style**: shape, type, borders, depth and motion, independent of colour: Default, GTK 4, KDE Breeze, Windows 11, Windows 10, Windows 7 (Aero), Windows XP (Luna), Windows 98, macOS and Material 3. Any style works with any theme; "Use matching colours" picks the platform's own palette.
- **Accent colour** override (presets or any colour; text on it stays readable), and an optional **wallpaper** (a generated one per theme, or your own picture, with a darkness slider). Everything is per device.

How it works, for changing it: a colour theme is a set of CSS variables written onto `<html>` by `apps/web/src/lib/theme.ts` (the three own themes live in `index.css` instead). A UI style is a block of variables in `apps/web/src/ui-styles.css` that the generic component rules in `index.css` read, so adding a style or theme needs no component changes.

## Running it

You need **Node 22.13+** and **pnpm** (see [docs/TESTING.md](docs/TESTING.md) for nvm instructions). From the repo root:

```bash
# once, and after each update (--ignore-scripts: the legacy app's youtube-dl-exec postinstall fails otherwise)
pnpm install --ignore-scripts --filter @curator/core --filter @curator/server --filter @curator/web
pnpm --filter @curator/web build

# start the server; it serves the built web client at /
cd packages/server
CURATOR_DATA_DIR=/path/to/data pnpm start
```

The server prints its address and a token (also saved in `<data dir>/token`). Open the address in a browser, then paste the token in Settings → Server (leave the URL empty when the page is served by the server itself). The default port is **47813**.

During development run `pnpm --filter @curator/web dev`; it proxies `/api` to the server (`CURATOR_SERVER`, default `http://localhost:47813`).

**Server settings** (environment variables):

| Variable | Default | Meaning |
|---|---|---|
| `CURATOR_DATA_DIR` | `./data` | Where the database, files and token live (the external drive on a Pi). |
| `CURATOR_PORT` / `CURATOR_HOST` | `47813` / `0.0.0.0` | Listen address. |
| `CURATOR_TOKEN` | generated into `<data>/token` | The access token. |
| `CURATOR_MAX_UPLOAD_MB` | `1024` | Largest single file accepted. |
| `CURATOR_YTDLP`, `CURATOR_FFMPEG_DIR` | found on `PATH` | Tools for YouTube import and downloads. |
| `CURATOR_WEB_DIR` | `apps/web/dist` | The client build to serve. |

To bring an old library across: `node --experimental-strip-types --disable-warning=ExperimentalWarning packages/server/src/cli-migrate.ts --db <old>/data/curator.db [--public <old>/public]` (run with `CURATOR_DATA_DIR` set; it is idempotent).

More guides: [docs/TESTING.md](docs/TESTING.md) (trying it with your own library), [docs/DEPLOY_PI.md](docs/DEPLOY_PI.md) (Raspberry Pi, systemd, Tailscale/HTTPS, backups), [docs/UPDATING.md](docs/UPDATING.md) (the one command that updates the Pi), [docs/YTDLP_COOKIES.md](docs/YTDLP_COOKIES.md) (YouTube's "not a bot" error), [docs/LIQUID_GLASS.md](docs/LIQUID_GLASS.md) (the Liquid Glass UI style), [docs/PROJECT_BRIEF.md](docs/PROJECT_BRIEF.md) (vision, rules, roadmap) and [CLAUDE.md](CLAUDE.md) (current state, decisions and gotchas).

## Tests

```bash
pnpm --filter @curator/web test          # library derivation, ranking pairs, stats, health, themes, helpers
cd packages/core && npx vitest run       # Elo, queue rules, sync merge
cd packages/server && npx vitest run && npx tsc --noEmit
cd apps/web && npx tsc --noEmit
```

Passing unit tests are not enough here: the server and the client have each been run for real (real server, real audio, a real browser) while building them, and that is how most bugs were found.

## Notes

- Browsers can't hold gigabytes: the web client has a storage limit (and optional "make room automatically"). Electron and Android are meant to hold full offline copies.
- Service workers (installable/offline PWA) need HTTPS or `localhost`; over plain HTTP on a LAN the app works online only. Use Tailscale or an HTTPS proxy (see the Pi guide).
- YouTube import needs `yt-dlp` and `ffmpeg` on the server, and recent yt-dlp also needs a JavaScript runtime for YouTube (see the Pi guide).
