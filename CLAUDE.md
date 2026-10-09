# Music Curator: project handoff

Read this first. It replaces the earlier chat history. Update it whenever a decision or the state changes.

## What this is
A personal music library manager for one user (owner@example.com): library (artists, albums, releases, tracks, playlists, "relational bios" = `groups`, timeline, notes) plus a **ranking system** (head-to-head votes → Elo → 0–10 rating) and playback queue rules ("play B right after A"). Originally generated with Dyad/Gemini (hence odd comments, `dyad-*` files). Being refactored heavily. The goal is that it is easy to iterate on.

## User preferences (how to work with them)
- Don't waste their usage. Fact-check and double-check yourself; use web search liberally.
- They write casually; reply in normal capitalized prose, not lowercase or slang.
- Put effort into verifying against real data and real runs, not only unit tests.
- Open PR: https://github.com/TurboNZL/music-curator/pull/2 (branch `claude/eloquent-darwin-6q1rf2`; PR #1 is merged). Push to that branch; don't open new PRs.
- Commit trailers required: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and the `Claude-Session: <this session's URL>` line given by the harness.

## Decisions made (don't re-ask)
| Topic | Decision |
|---|---|
| Shape | Local-first. The server is optional: clients work alone and sync to it when connected. No mandatory frontend/backend split. |
| Server | Self-contained Node server for a **Raspberry Pi + external HDD**. Custom storage location (`CURATOR_DATA_DIR`). Default port **47813** (user asked for something obscure, not 8080). Token auth. |
| Clients | Web (desktop + mobile browser), **Electron** desktop app (real local storage), **native Kotlin + Media3 Android app** (needed for Android Auto). |
| Web storage | Browser can't hold GBs: web client gets a **storage capacity bar/limit**; Electron/Android hold full offline copies. Files copy server → local for offline use; server hosts songs not saved locally. |
| Android Auto | Verified: works **only** for a native media app (`MediaLibraryService`/`MediaBrowserService` + `MediaSession`); PWA/WebView cannot. No Play Store needed for personal use: enable Android Auto developer mode (tap "Version and permission info" 10×) → "Unknown sources". Doesn't apply to Cars App Library apps. Android Auto draws the UI itself; no custom media UI while driving. Sources: developer.android.com/training/cars/media and /training/cars/testing. |
| UI / theming | New **default theme**: stylish, **medium density** (spacious cover-art grids for browsing + compact table rows for ranking/editing lists). Must **not** be "too dense". Current look is preserved as an alternate **"Classic"** theme. Build a real theme system (CSS variables) and user options; the user loves theming. The old **rating UI** was painful to get right with the AI; preserve its behaviour/look in Classic. |
| Keep intact | Elo voting, playback rules, relational bios, yt-dlp album import (make cross-platform, move to server). |
| Elo storage | Elo/comparisons/rating are **derived** by replaying the append-only `votes` log, never stored. Makes multi-device voting mergeable. |

## Repo layout (monorepo, pnpm workspace; root `pnpm-workspace.yaml` lists `.`, `packages/*`, `apps/*`)
```
/                    LEGACY app (Vite+React19+shadcn+Zustand + Nitro API in server/). Untouched so far. To be ported, then deleted.
packages/core        @curator/core  pure TS: ids (UUIDv7), elo, queue/rules, sync types+LWW rule, model.ts (canonical entity shapes)
packages/server      @curator/server  Hono server, node:sqlite, files, sync, migration, acquire (yt-dlp)
apps/web             @curator/web  Vite + React 19 + Tailwind 3 + zustand + idb. The new client (see below)
apps/                planned next: electron, android
```
Legacy files worth reading before porting UI: `src/store/useMusicStore.ts` (all client logic), `src/components/layout/BottomPlayer.tsx`, `src/pages/*`, `src/components/ui/Rating.tsx`, `src/components/modals/*`.

## What exists and is tested (state as of last commit)
**core**: `newId` (UUIDv7); `replayVotes` / `balancedRatings` / `applyVote`; `startTrack` / `advance` / `shuffleWithRules` (Fisher-Yates) / `pushHistory`; `SyncRecord` + `wins()` last-writer-wins (higher `updatedAt`, ties → higher `deviceId`); record tables list; `model.ts` entity types. 10 tests.

**server** (22 tests):
- `config.ts`: env `CURATOR_DATA_DIR` (default `./data`), `CURATOR_PORT` (47813), `CURATOR_HOST` (0.0.0.0), `CURATOR_TOKEN` (else generated into `<data>/token`), `CURATOR_MAX_UPLOAD_MB` (1024), `CURATOR_YTDLP`, `CURATOR_FFMPEG_DIR`.
- `db.ts` `Store`: generic `records(tbl,id,seq,updated_at,device_id,deleted,data)` + `files(hash,size,mime)`. `push` (atomic, LWW), `pull(since)` cursor pagination, `get`, `list`.
- `app.ts` routes: `GET /api/health` (open) · `GET /api/status` (counts, disk free) · `GET /api/sync/pull?since=&limit=` · `POST /api/sync/push` · `GET /api/files` · `HEAD|PUT|GET /api/files/:hash` (sha256 content-addressed, hash verified on upload, size cap, **HTTP Range**) · `POST|GET /api/acquire`. Auth: `Authorization: Bearer <token>` or `?token=` (needed for `<audio src>`).
- `migrate-legacy.ts` + `cli-migrate.ts`: imports a legacy `curator.db` (+ optional `--public` dir with `uploads/`). Idempotent.
- `acquire.ts`: yt-dlp download queue for tracks that have `youtubeMusicUrl` but no `file`.

Run: `pnpm install --ignore-scripts --filter @curator/server --filter @curator/core` (the **root** `youtube-dl-exec` postinstall fails offline, so use `--ignore-scripts`; never `--ignore-workspace`). Then in `packages/server`: `npx vitest run`, `npx tsc --noEmit`, `pnpm start`. Migration: `CURATOR_DATA_DIR=... node --experimental-strip-types --disable-warning=ExperimentalWarning src/cli-migrate.ts --db <old>/data/curator.db [--public <old>/public]`.

## Web client (`apps/web`, built this session)
Local-first: UI reads an in-memory mirror of IndexedDB; every edit is a `SyncRecord` written locally + queued in an `outbox`, pushed in the background.
- `lib/idb.ts` (IndexedDB: `records`, `outbox`, `meta`), `lib/store.ts` (zustand: rows, `put/patch/remove`, sync loop: push outbox → pull from cursor; every 30 s, on `online`, 1.5 s after edits), `lib/api.ts` (server client; `fileUrl(hash)` adds `?token=`), `lib/settings.ts` (per-device: serverUrl, token, theme, accent, storage limit; localStorage).
- `lib/library.ts` is the PURE derivation (`buildLibrary`: replays votes via core, ratings, 10-star ranks, album tracklists, genres from album when `syncWithAlbumCredits`). `lib/derive.ts` has the React hook + a rev-keyed cache (`getLibrary`). `lib/pairing.ts` picks vote pairs. `lib/player.ts` is the player (one `<audio>`, core queue + rules, MediaSession, logs `playbackLogs` incl. skips; skips tracks with no audio).
- Pages: Albums, Album, Artists, Artist, Tracks, Rank (vote; ← → ↓ S keys; 15 s mid-track preview), Queue, Playlists, Search, Settings (themes, accent, server, acquire trigger, storage bar).
- Themes = CSS-variable blocks in `index.css` (`default`, `classic`, `light`) + accent override; list in `lib/theme.ts`. Classic is only a first approximation of the old look; the old rating UI (`Rating.tsx`) behaviour IS ported (`components/Rating.tsx`).
- Dev: `pnpm --filter @curator/web dev` (proxies `/api` to `CURATOR_SERVER`, default :47813; put the token in Settings). Prod: `pnpm --filter @curator/web build`, then the server serves `apps/web/dist` at `/` automatically (override `CURATOR_WEB_DIR`); same origin, so leave Server URL empty.
- Tests: `pnpm --filter @curator/web test` (library derivation, pairing). Real-run check used: migrate the real DB, start the server, seed a few mp3s (ffmpeg sine) via `PUT /api/files/:hash` + a tracks push, drive the app with Playwright (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, global `playwright` module), screenshot, and verify no console errors. Verified: initial sync of all 13 tables, 444 tracks/33 albums, ratings and #ranks match the legacy stored ratings, play/next with real audio, voting persists to the server, a second fresh profile receives edits.
- Bugs found by running it, fixed: album track order (see data findings), `pickPair` sampled only half its candidates.

## Hard-won gotchas (don't relearn)
- **Run the real thing, not just vitest.** Vitest passed while real Node crashed: Node's `--experimental-strip-types` forbids TS parameter properties/enums. `packages/server/tsconfig.json` has `erasableSyntaxOnly` so `tsc` catches it. Also relative imports need explicit `.ts` extensions (core uses them).
- `node:sqlite` can't be imported by name under Vite/vitest → load via `process.getBuiltinModule('node:sqlite')` (done in `db.ts`, migrate, tests). It prints an ExperimentalWarning (silenced with `--disable-warning`). Chosen so the Pi needs no native compile.
- vitest picks up the root `vite.config.ts`/`postcss.config.js` → each package has its own `vitest.config.ts` with `css.postcss.plugins: []`.
- Hono normalises `../` in URLs before routing (404, not 400); file names must match `^[0-9a-f]{64}$`.
- pnpm `minimumReleaseAge: 1440` is set in `pnpm-workspace.yaml` (new packages <1 day old are refused).
- Sandbox has `ffmpeg` but **no `yt-dlp`** and likely no YouTube access: real downloads are unverified. GitHub tools can disconnect; git push over the proxy works.

## The user's real data (they uploaded `curator.db`; it is NOT in the repo, keep it that way)
444 tracks, 33 albums, 38 releases, 10 artists, 1950 votes, 99 play logs, 1 playlist, 1 group, 2 notes (test data), 4 genres. Findings (all handled in `migrate-legacy.ts`):
- JSON columns have **mixed encodings** (plain / double-stringified / NULL) → `unwrapJson`. This also made the legacy "cleanup unused role categories" delete roles in use.
- 91 votes reference deleted tracks. **Replaying all votes including deleted "ghost" opponents reproduces every stored Elo/comparisons/rating exactly**, so ghosts must stay in `replayVotes`. Rating = min..max scaling over **all** tracks, floored by `initialRating`. Verified on all 444 tracks (diff 0).
- Dangling rows dropped: 18 album_tracks, 80 release_tracks, 4 playback_logs.
- Legacy `artist_ids` mirrors the primary artist on 264 tracks; the rest are extras kept as credits (one bare name "Jorja Smith" → artist created). `track_genres` (36 tracks) merged into `track.genres`.
- All 444 tracks have a distinct `youtubeMusicUrl` (YouTube watch URL), 443 have a Spotify URL.
- **`album_tracks.order` is 0 for 460 of 462 rows** (legacy never kept album order) but `release_tracks.order` is real and every album has a release. The client orders an album's tracks by its default (else longest) release. Don't trust `track.albums[].order`.
- **The old `public/uploads` folder is LOST.** All audio, all 10 artist images and 33 album covers are gone. Audio is recoverable via `POST /api/acquire` (needs yt-dlp+ffmpeg on the machine running the server). Covers can partly come back from YouTube thumbnails (**not built yet**). Artist images must be re-uploaded.

## Known legacy bugs (the old app; fixed by the rewrite, listed so they aren't re-ported)
Partial `PUT /api/tracks/:id` wipes credits/favorite/sync flag (e.g. `incrementMemories`) · credits/genres double-JSON-encoded · `GET /api/tracks` reads `is_favorite` (snake) so favorites never show · track genres ignore `track_genres` · new tracks get `rating: 0` not null · vote handler does one UPDATE per track for the whole library · `db-migrate-paths` queries nonexistent `albums.covers` · store calls nonexistent `/api/reset` · `artists/[id].ts` uses `createError` without importing · `previousTrack()` is empty · playback logs always use source `{type:'track'}` and skips can double-log · import hardcodes `yt-dlp.exe`/`ffmpeg.exe` and downloads everything before review · IDs are `Math.random().toString(36).substring(7)` (collision-prone, unusable for sync) · biased shuffle `sort(()=>Math.random()-.5)` · no auth, binds all interfaces · `upload.post.ts` path traversal via `type` field · uploads written to `public/` at runtime (likely not served in prod build, unverified) · O(n·m) in-memory joins · duplicate files (`StatsForNerdsModal`, `ArtistAllTracksModal`) and unused deps/files (`mockData.ts`, `better-sqlite3`, `axios`, `vercel.json`).

## Sync design
Every row is a `SyncRecord {table,id,updatedAt,deviceId,deleted,data}`. Server assigns a monotonically increasing `seq`; clients pull `since=<cursor>`, push local changes. Conflicts: highest `updatedAt` wins, tie → higher `deviceId`. Deletes are tombstones. `votes`, `playbackLogs`, `timeline` are append-only (never conflict). Files are immutable, addressed by sha256; clients fetch missing hashes on demand or via "keep on this device".
Entities store **file hashes** (`image`, `cover`, `file`), never server paths. Elo/rating are never stored.

## Next steps (in order)
1. **Web client, remaining** (the core is done, see above): editing UI (edit track/album/artist, credits, genres, create artist inline, image/cover upload via `PUT /api/files/:hash`), playback-rules editor, stats page, timeline/notes/groups editing, cleanup tasks, real offline audio cache + enforcing the storage limit, album covers from YouTube thumbnails, polish Classic theme against the old look, mobile layout review, `PlaybackLog`-driven recents/home page.
2. Port remaining legacy features: groups ("relational bios") editing, timeline, yt-dlp album *import* flow (review before download).
3. **Electron** wrapper (local storage, optionally spawn the server in-process).
4. **Android** native app (Kotlin, Media3 `MediaLibraryService`, Room/SQLite mirror, same sync protocol, offline file cache; Android Auto browse tree = Artists/Albums/Playlists/Recent).
5. Docs for Pi deployment (systemd unit / Docker, installing yt-dlp+ffmpeg on arm64, reverse proxy/HTTPS or Tailscale), then delete the legacy root app.

## Open / unverified
- Real yt-dlp downloads never run here; first real run on user's machine is the test.
- Legacy "uploads served in production" behaviour unverified (irrelevant after rewrite).
- Need the user's answer only if a new fork appears; layout question is answered (medium density, stylish).
- Server is HTTP; for use outside the LAN put it behind HTTPS or Tailscale (document it).
