# Music Curator

A personal music library manager for one person who owns their music files and cares about **ranking and curating** them. It keeps your library (artists, albums, releases, tracks, playlists, eras, notes) and ranks your tracks by asking one simple question over and over: *which of these two is better?*

Your answers become an Elo score for every track, shown as a 0–10 rating. Playback follows rules you define ("always play B right after A"), and everything keeps working offline.

It runs as a **web app** (desktop and phone browsers, installable as a PWA), as a **desktop app** (Electron, with the server built in) and as an **Android app** (with Android Auto), all talking to one small **server** that can live on a Raspberry Pi with an external drive. Each client is local first: it holds the whole library itself and syncs when a server is reachable.

> The app that still lives in the repo root (`src/`, `server/`) is the **legacy** version (generated with Dyad). It stays until the new one is confirmed to do everything; everything described here is the new code in `packages/` and `apps/`. The legacy look is kept as the *Toolbar* UI style and *Zinc* colours (see [Appearance](#appearance)).

## What it does

**Ranking**
- **Head-to-head votes.** "Which is better?" shows two tracks; you pick one, call them equal, or skip. By default only tracks that have audio are used (a checkbox turns that off; changing it keeps the pair on screen unless it holds a track without audio). Each card buffers a 15-second mid-track preview as soon as the pair appears and says "Loading preview…" until it can start at once. Keyboard: ← or → previews that side and the same arrow again picks it, ↑ skips, ↓ is equal. On a touch screen swipe a card right to pick it.
- **Thumbs up/down** in the player is a half-weight vote for the playing track. Votes are an append-only log; Elo, comparison counts and the 0–10 rating are *derived* by replaying it, so voting from several devices merges cleanly.

**Library**
- **Hierarchy:** Era (a collection of albums and singles, e.g. a phase of an artist) › Album › Release (a specific edition, with its own cover, date and tracklist) › Track. Singles are tracks on no album, with their own cover. Each album has a cover pool and a default release.
- **Credits are the artist.** There is no "artist" field: the *Lead artist* credit is the artist; producer, writer, featured and any role you invent are credits too. An album's credits, genres and cover flow down to its tracks until you change them.
- **Filtering** with Discord-style chips (`artist:`, `album:`, `era:`, `genre:`, `before:`, `after:`, `rating:`, `has:`) plus free text, sortable tables, search, stats, and a **library health** page that finds missing covers, links, dates and lead credits and fixes them in bulk.
- **Notes:** write-ups tied to any number of artists, albums, tracks, releases, eras or playlists, with categories you make yourself, shown on each entity's page. A journal on the home page records what you did.

**Playback**
- A real queue (play next, add, reorder, shuffle that keeps rule pairs together), playback rules, play history per track, a bass boost, media keys and lock-screen controls.
- **Play on a device:** every device using your server appears in the player; move playback to another one or use this one as its remote ([docs/CONNECT.md](docs/CONNECT.md)).
- **Offline:** keep any album or playlist's audio on the device, within a storage limit you set.

**Getting music in**
- Import a whole album from a YouTube / YouTube Music link (yt-dlp on the server, with cover art), add audio files from your device, or add tracks by hand. The server can download missing audio for tracks that have a YouTube link.
- Backup and restore of the database and files from Settings, and a one-time migration from a legacy database.

## The apps

| App | What it is | Guide |
|---|---|---|
| **Web** (`apps/web`) | Vite + React 19 + Tailwind 3 + zustand + IndexedDB. Served by the server at `/`, or from the dev server. Installable as a PWA on https or localhost. | below |
| **Desktop** (`apps/electron`) | The web client in its own window with the server inside it (`127.0.0.1:47814`), the library in a folder you choose. Media keys, Discord "listening to", self-update, and it says in Settings whether the GPU is painting the window. Windows and Linux installers. | [docs/ELECTRON.md](docs/ELECTRON.md) |
| **Android** (`apps/android`) | The web client in a WebView plus a native Media3 service so **Android Auto** can browse and play the library; updates itself from GitHub releases. Never compiled in the sandbox that wrote it: CI is the first real build. | [docs/ANDROID.md](docs/ANDROID.md) |
| **Server** (`packages/server`) | Hono + `node:sqlite` (no native build), meant for a Raspberry Pi. Sync API, content-addressed audio and image storage with HTTP range, yt-dlp import and download, backup, Play-on-a-device relay. Token auth. | [docs/DEPLOY_PI.md](docs/DEPLOY_PI.md) |
| **Core** (`packages/core`) | Pure TypeScript shared by all of them: ids (UUIDv7), Elo and vote replay, queue and playback rules, the sync record and its merge rule, entity shapes. | |

**Sync model.** Every row is a record `{table, id, updatedAt, deviceId, deleted, data}`. The server hands out an increasing sequence number; clients pull from their last cursor and push their outbox. The newest `updatedAt` wins (a tie goes to the higher `deviceId`); deletes are tombstones; votes, play logs and journal entries are append-only. Files are immutable and addressed by SHA-256, and records refer to files by hash, never by path.

## Appearance

Settings → Appearance has two independent choices with a live preview you can hover through:

- **Colour theme:** the app's own *Default*, *Classic* and *Light*, *System* (follows your OS), 17 more themes (Daylight, Sand, Slate, Midnight, Ocean, Forest, Plum, Crimson, Ember, Graphite, AMOLED black, Nord, Dracula, Mocha, Tokyo Night, Gruvbox, Solarized), and palettes copied from real systems: Adwaita, Breeze, Windows 11/10/7/XP/98, macOS, Mac OS X Aqua, Android Holo, Winamp, LG UX, Fortnite chapters 1–6 and Material You, plus **Zinc**, the first version's colours.
- **UI style:** shape, type, depth, motion and, for one style, layout: Default, GTK 4, KDE Breeze, Windows 11, 10, 7 (Aero), XP (Luna) and 98, macOS, macOS Liquid Glass (real refraction in Chromium and Electron), Mac OS X Aqua, Android Holo, Winamp 2, LG UX, Fortnite Ch 1 / 2–3 / 4 / 5–6, Material 3, and **Toolbar**, the first version's layout (a six-item side bar, text links and a pill search in a full-width toolbar, bordered cover tiles, uppercase headings, a three-column player). "Use matching colours" pairs a style with its palette.
- An optional **wallpaper** (generated per theme or your own picture, with a darkness slider). Everything is per device.

How it works: a colour theme is a set of CSS variables written onto `<html>` by `apps/web/src/lib/theme.ts`; a UI style is a block of variables in `apps/web/src/ui-styles.css` read by generic component rules, so adding either needs no component changes. See [docs/appearance/](docs/appearance/README.md) (the rules, every theme and style, Liquid Glass, and [TOOLBAR.md](docs/appearance/TOOLBAR.md) for the first version's look).

## Running it

You need **Node 22.13+** and **pnpm** ([docs/TESTING.md](docs/TESTING.md) has nvm instructions). From the repo root:

```bash
# once, and after each update (--ignore-scripts: the legacy app's youtube-dl-exec postinstall fails otherwise)
pnpm install --ignore-scripts --filter @curator/core --filter @curator/server --filter @curator/web
pnpm --filter @curator/web build

# start the server; it serves the built web client at /
cd packages/server
CURATOR_DATA_DIR=/path/to/data pnpm start
```

The server prints its address and a token (also in `<data dir>/token`). Open the address in a browser and paste the token in Settings → Server (leave the URL empty when the page is served by the server itself). Default port **47813**. For development run `pnpm --filter @curator/web dev`; it proxies `/api` to `CURATOR_SERVER` (default `http://localhost:47813`).

**Desktop app:** `pnpm install --ignore-scripts --filter @curator/electron …`, `node apps/electron/node_modules/electron/install.js` once, then `pnpm --filter @curator/electron start` (details and installers in [docs/ELECTRON.md](docs/ELECTRON.md)). **Android:** download the APK from the newest [release](https://github.com/TurboNZL/Curator/releases), or build with Gradle ([docs/ANDROID.md](docs/ANDROID.md)).

**Server settings** (environment variables):

| Variable | Default | Meaning |
|---|---|---|
| `CURATOR_DATA_DIR` | `./data` | Where the database, files and token live (the external drive on a Pi). |
| `CURATOR_PORT` / `CURATOR_HOST` | `47813` / `0.0.0.0` | Listen address. |
| `CURATOR_TOKEN` | generated into `<data>/token` | The access token. |
| `CURATOR_MAX_UPLOAD_MB` | `1024` | Largest single file accepted. |
| `CURATOR_YTDLP`, `CURATOR_FFMPEG_DIR` | found on `PATH` | Tools for YouTube import and downloads. |
| `CURATOR_YTDLP_COOKIES`, `CURATOR_YTDLP_ARGS` | none | A cookies file and extra arguments for yt-dlp ([docs/YTDLP_COOKIES.md](docs/YTDLP_COOKIES.md)). |
| `CURATOR_WEB_DIR` | `apps/web/dist` | The client build to serve. |

Desktop app only: `CURATOR_DESKTOP_PORT` (default 47814) and `CURATOR_SOFTWARE_RENDERING=1` (turn the GPU off, for diagnosing a driver).

To bring an old library across: `CURATOR_DATA_DIR=… node --experimental-strip-types --disable-warning=ExperimentalWarning packages/server/src/cli-migrate.ts --db <old>/data/curator.db [--public <old>/public]` (idempotent).

## Updating and releases

- **Server on a Pi:** one command, [docs/UPDATING.md](docs/UPDATING.md) (`scripts/update.sh`).
- **Desktop and Android apps** update themselves from GitHub releases. Push a tag such as `v2026.10.2`; `.github/workflows/release.yml` builds the Windows and Linux installers and the signed APK and attaches them. The apps use the newest published release, **including ones marked pre-release**. Settings → App updates shows the state; a token is only needed if the repository is private.

## Guides

[docs/TESTING.md](docs/TESTING.md) (try it with your own library) · [docs/DEPLOY_PI.md](docs/DEPLOY_PI.md) (Raspberry Pi, systemd, Tailscale/HTTPS, backups) · [docs/UPDATING.md](docs/UPDATING.md) · [docs/ELECTRON.md](docs/ELECTRON.md) · [docs/ANDROID.md](docs/ANDROID.md) · [docs/CONNECT.md](docs/CONNECT.md) · [docs/YTDLP_COOKIES.md](docs/YTDLP_COOKIES.md) · [docs/appearance/](docs/appearance/README.md) · [docs/PROJECT_BRIEF.md](docs/PROJECT_BRIEF.md) (vision, rules, roadmap) · [CLAUDE.md](CLAUDE.md) (current state, decisions and gotchas).

## Tests

```bash
pnpm --filter @curator/web test          # library derivation, ranking pairs, stats, health, themes, helpers
pnpm --filter @curator/electron test     # config, Discord, graphics detection
cd packages/core && npx vitest run       # Elo, queue rules, sync merge
cd packages/server && npx vitest run && npx tsc --noEmit
cd apps/web && npx tsc --noEmit
```

The Android logic that does not need a device (which requests the app answers itself, which release counts as newest) has JVM unit tests in `apps/android/app/src/test`; `gradle test` in the Android project runs them.

Passing unit tests are not enough here: the server and the web client have been run for real (real server, real audio, a real browser), Electron under a virtual display, and that is how most bugs were found. **Not yet verified:** real YouTube import and downloads, the Android app on a device (including Android Auto), the desktop app on a machine with a GPU, and the Liquid Glass lens outside Chromium.

## Notes

- Browsers can't hold gigabytes: the web client has a storage limit (and optional "make room automatically"); Electron and Android are meant to hold full offline copies.
- Service workers (installable/offline PWA) need HTTPS or `localhost`; over plain HTTP on a LAN the app works online only. Use Tailscale or an HTTPS proxy (see the Pi guide).
- YouTube import needs `yt-dlp` and `ffmpeg` on the machine running the server, and recent yt-dlp also needs a JavaScript runtime for YouTube (see the Pi guide).
