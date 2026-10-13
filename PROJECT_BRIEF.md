# TurboMusic: Project Brief

**Audience:** every future Claude instance (and the user) picking this project up cold.
**Purpose:** explain *what we are building, why, for whom, and how we work*. This is the vision and context document.
**Not this file's job:** day-to-day state. That lives in `/CLAUDE.md` (decisions table, what is built, gotchas, next steps). When the two disagree about *current state*, `CLAUDE.md` wins; when they disagree about *intent*, this file wins. Update both as things change.

> How to start a session: (1) read this file, (2) read `CLAUDE.md`, (3) run `git log --oneline -15` and `git status` and diff against what `CLAUDE.md` claims, because the user edits things too and may have changed code or docs outside a session, (4) run the tests, (5) only then plan work. Never assume the repo matches the docs without checking.

---

> **Status snapshot (kept short on purpose; the authoritative, detailed state is `CLAUDE.md`).** The project is **feature complete**: `@curator/core`, `@curator/server`, the web client (`apps/web`), the Electron desktop app and the Android app (with Android Auto) are built and on `main`, with local-first sync, voting with the exact rating rules, full editing (credits are the artist), album import from YouTube and Spotify, library health, a theme system (colour themes × UI styles, wallpaper), offline audio, Play-on-a-device, stats and listening history, lyrics, and a Pi deployment guide. What remains is fixing what real use turns up. Unverified against the real services/devices: YouTube (import, album search, downloads), Spotify/Soloist, Cloudflare Access, the Android build on a device, Android Auto in a car. Sections 6 and 10 below describe the original intent and the legacy behaviour used as the spec; the glossary (section 4) is current.

## 1. The one-paragraph version

TurboMusic is a **personal music library for one person** who owns their music files and cares deeply about *ranking and curating* them. Its distinguishing feature is a head-to-head "This or That" voting system that turns thousands of small choices into a trustworthy 0 to 10 rating for every track, alongside rich metadata (credits and roles, releases, relational bios, a curation journal). The user wants to **use it in place of Spotify**, including **in the car via Android Auto**. So it must play their own files, work offline on a phone, and optionally sync with a home server (a Raspberry Pi with an external hard drive). It currently exists as a fragile AI-generated web app (built in "Dyad" with Gemini) that has to be rebuilt into a clean, local-first, multi-platform system that is *easy to iterate on*.

## 2. Who the user is and how to work with them

- One user, the owner and only real consumer. Email on file: owner@example.com. This is a hobbyist/power-user project, not a product for the public. Do not over-engineer for multi-tenant scale; do engineer for **correctness of their data** and **ease of change**.
- They have strong opinions about **UI and theming** ("I'm a big fan of UI theming and options built in"), like parts of the old UI a lot (the "UI rules are really nice and fine tuned"), and found other parts lacking in UX. The **rating UI** was a long struggle to keep an earlier AI from changing; treat it as precious.
- They write casually. **Reply in normal, properly capitalised prose.** Casual input does not mean they want lowercase or slangy output. (Stated explicitly.)
- **Don't waste their usage.** Fact-check and double-check things yourself; use web search heavily for anything factual (platform limits, APIs, licences, versions). Don't ask questions that can be resolved from the code, the data, or the docs. Make a recommendation instead of surveying options. If you must ask, ask once, batch it, and say what you'll assume otherwise.
- They said they "lost" the old `public/` folder. They give real artefacts when asked (they uploaded their database). Ask for real data when it would remove guesswork.
- They are not necessarily watching the session live. Write summaries so they can be read cold: what changed, what was verified (and how), what was *not* verified, what you need from them.

**Verification culture (important):** earlier in this project, automated tests passed while the real program crashed (see Gotchas in `CLAUDE.md`). The user explicitly values double-checking. Therefore: run the real thing (boot the server, hit it with curl, drive the UI in Chromium via Playwright and look at screenshots), run it against **the user's real data shape**, and report honestly what you could and could not verify. Never claim "works" for something only unit-tested.

## 3. Why this exists: product philosophy

1. **Owning files beats streaming.** The user wants a library they control: their own audio files, their own metadata, their own data, no algorithm. Spotify is the thing being replaced, but the Spotify *links* remain stored per track as reference metadata (443 of 444 tracks have one).
2. **Ranking is the heart.** Most music apps give you stars or likes. This one asks "which of these two do you prefer?" repeatedly, uses Elo to infer a global ordering, and maps it to a 0 to 10 scale. The result is a rating that is *relative to the user's own library*, which makes the top of the list meaningful. Every design decision should protect the integrity of the vote log, because it is the user's accumulated effort (1,950 votes so far).
3. **Curation is a hobby, so the app rewards maintenance.** A "Cleanup" area generates a queue of small metadata chores (add a cover, add a release date, add Genius link, fix credits) and lets the user knock them out like a to-do list, alternating with voting. A "Journal" (timeline) records the library's story. "Relational bios" attach narrative context ("ICEMAN Drop: Drake released two surprise albums on one night...") to groups of artists/albums/tracks.
4. **It should feel good.** The user cares about look and feel as much as function. Stylish, thematable, nice to live in.
5. **It must be easy to iterate on.** The original code is hard to change (AI-generated sprawl, duplicated logic, 20 hand-rolled route files, a god-store). A major goal of the rebuild is that new features and themes are cheap to add, with tests protecting the data-critical parts.

## 4. Glossary (domain concepts)

| Term | Meaning |
|---|---|
| **Artist** | A person or group, with a name and an image. There is no "artist" field on albums or tracks: the artist is whoever has the **Lead artist** credit. |
| **Credit** | `{artistId, role: string[]}`. Roles come from **Role Categories** ("Lead artist", "Featured artist", "Producer", "Writer", anything you add). Lead credits make the artist (several leads are allowed); a **Featured artist** credit is shown after the leads ("A feat. X") with its own link but does not make the track part of that artist's albums. |
| **Era** | A collection of albums and singles (a phase of an artist's career). Eras overlap: an album can be in several. Notes can attach to them. |
| **Album** | A conceptual container of tracks with `credits`, `genres`, a **cover pool** (every image it has; the default release's cover is shown unless one is picked) and an optional explicit `trackOrder`. Genres and credits flow down to tracks that have `syncWithAlbumCredits`. |
| **Release** | A specific edition of an album with its own cover, `releaseDate` and ordered tracklist. An album can have several; `defaultReleaseId` picks the one shown first. A release's **name** comes from the reusable *release names* list (picked or created like an artist); a blank name means the release is called after the album. (Release *tags* were replaced by names; old tags stay in the data and in the `tag:` filter.) |
| **Single** | A track on no album. It has its own cover and release date and can later be put on an album (or an album with one song can be converted to a single). |
| **Track** | One song (the canonical recording): title, credits, genres, a source `file` (content hash), links (Spotify, several allowed; Genius; YouTube Music), `bitrate`, `memories`, `initialRating`, playback rule, and, set by the server, a `youtubeDead` mark when its YouTube link is gone. |
| **Vote** | One decision: `{trackAId, trackBId, winnerId \| null, isEqual, timestamp}`, or a **boost** (thumbs up/down, half a win/loss against an equal opponent). Append-only; the source of truth for ranking. The home page's questions record ordinary votes. |
| **Elo** | Per-track score starting at 1000, K=32, **derived** by replaying votes in time order. Never stored. |
| **Rating (balanced)** | Elo scaled so min..max over all tracks = 0..10, floored by `initialRating`. Derived. |
| **Initial rating ("unbalanced")** | A manual rating before enough votes exist; a floor for the balanced rating. |
| **Playback rule** | "When track A plays, play track B right after" (`playFirstOnShuffle`, `applyToAlbumSource`). For songs that must go back-to-back. |
| **User queue vs active queue** | The user queue is what you explicitly queued; the active queue is the rest of the album or list being played. The user queue plays first. |
| **Note** | One thing, stored in the `groups` table (code and old docs also call it a *relational bio*): a title, text, your own **category** (created inline) and ties to one or more artists, albums, tracks, releases, eras or playlists. The first note on a thing starts with its name and kind as defaults. |
| **Journal (timeline)** | Dated entries on the home page: your own plus automatic ones (new album, import, note). Filterable by text and kind. |
| **Listening history (play log)** | Every play, from TurboMusic's own player or imported from Spotify (`imported: 'spotify'`, matched to library tracks by link, then by title and artist). Skips are logged too. |
| **Memories** | An integer on a track, flagging sentimental songs. |
| **Pair code** | `CUR1-…`: server address, access token and Cloudflare Access service token in one string that sets up another device. |

## 5. The rating system in detail (must be preserved exactly)

**Math** (in `packages/core/src/elo.ts`, verified against the user's real data to zero difference):
- Expected score `E = 1 / (1 + 10^((Rb - Ra)/400))`. Update `R' = R + 32 * (S - E)`, where S is 1 / 0 / 0.5 for win / loss / equal.
- Replay all votes sorted by `(timestamp, id)`. **Votes against since-deleted tracks still count**, because the surviving track's score was shaped by them; "ghost" opponents participate but aren't output.
- Balanced rating = `((elo - minElo) / (maxElo - minElo)) * 10` with min/max taken over **all** tracks (including untouched ones sitting at 1000), `5` if all equal, then `max(rating, initialRating ?? 0)`.

**Presentation rules from the legacy `Rating.tsx` (this is the part the user guards)**:
- *Effective rating* shown = the balanced rating **only if the track has >= 3 comparisons and rating > 0.001**; otherwise the `initialRating` if > 0.001; otherwise 0.
- If effective rating is ~0 **and** comparisons < 3 → show `?` (unrated).
- If effective rating >= 9.9999 **and** comparisons > 0 → it is a "10-star" track and displays as its **rank among all 10-star tracks, ordered by Elo descending**: `#1`, `#2`, ... (so the very top of the library is a ranked list, not a pile of tens).
- Otherwise display one decimal, e.g. `7.4`.
- Colour: grey for 0/unrated, **blue** for ranked 10s, **green** >= 7, **yellow** >= 4, **red** below 4.
- It renders as a small pill: star icon, value, and a faint comparison count; sizes sm/md/lg. In a Cleanup context it is non-interactive. (The legacy +1/-1 buttons were deliberately removed.)
- Because balanced rating is derived, the new client computes it from the vote log (via `@curator/core`) and applies these presentation rules in the UI layer. Keep these rules in a small, well-tested pure function in core so every client (web, Electron, Android) shows identical numbers.

**The voting UI ("This or That", legacy `/cleanup`)**: show two random distinct tracks; each can play a **15-second snippet starting from the middle of the track** (`start = max(0, duration/2 - 7.5)`); choose A, B, or "equal". After each vote, pick a new random pair. Option to shuffle pairing. Possible improvement (not yet requested): smarter pair selection (e.g. prefer tracks with few comparisons or close Elo), but only if the user wants it; keep random available.

## 6. What the legacy app does (feature inventory)

The legacy app (generated with Dyad; it was at the repo root until it was deleted after the port, and is in the git history) was the *specification by example*. Navigation: sidebar "CURATOR": Artists, Albums, Tracks, Playlists; top toolbar: Journal, Cleanup, Stats, Queue, global search ("Search catalog..."), Settings; persistent bottom player.

- **Journal (home, `/`)**: "Curation Journal" timeline entries (create/delete), a **Rating Distribution** chart, **Edit History**, and **Catalog Health** summary.
- **Artists / Artist detail**: grid of artists; detail has image, **Discography**, **Top Rated Tracks**, an "all tracks" modal, **Relational Bios**, edit/create modals.
- **Albums / Album detail**: grid with search; detail shows tracks (ordered), releases, covers, credits, genres, relational bios, album editing (artist credit roles, genres), release creation/editing.
- **Tracks**: "Global Tracks" table with search by title/artist/album; right-click menu and dropdown (add to playlist, edit, stats for nerds, etc.).
- **Playlists**: create/edit/delete, cover, description, search-to-add tracks.
- **Cleanup**: (a) **This or That** voting; (b) a **Task Queue** auto-generated from the library: missing artist image, missing album cover, incomplete album/track metadata (lists what's missing), missing release date, missing Spotify / Genius / YouTube Music links (Spotify tasks are *grouped per album* with a bulk resolution modal), with per-type filters, shuffle, and "load more"; (c) a **Low quality tracks** modal (bitrate < 192 kbps) for re-sourcing.
- **Stats**: "Playback Analytics": top tracks by engagement, recent activity, now-playing info.
- **Queue**: Now Playing, Next in Queue (user queue then active), "Playing from source"; reorder/remove/clear/merge/shuffle.
- **Settings**: Visual defaults (default artist/album image), **Back-to-Back Rules** (the playback rules editor, search tracks A and B), **Role Category Management**, database management (factory reset; cleanup of unused files, genres and roles).
- **Player (bottom)**: cover, title, lead-artist line, bitrate badge, rating pill, prev/play/next, seek bar, volume, queue popover, track menu, "Stats for nerds". Logs playback (duration, source, skip) to the server.
- **Import album from URL** (`ImportAlbumModal`): paste a YouTube/YouTube Music URL → server uses yt-dlp+ffmpeg to fetch audio and a cover → **review modal** (suggested title/artist/tracks/bitrate) → creates album/tracks. Must be kept, made cross-platform, and ideally *review before downloading*.
- **Theming today**: only `theme`/`accentColor` fields exist on the profile; the actual look is hard-coded dark zinc. There is no real theme system yet.

**Legacy look (to be preserved as the "Classic" theme)**: near-black backgrounds (`bg-black` shell, `zinc-950` panels, `zinc-900` borders), light-zinc text, **very heavy uppercase micro-typography** (`font-black uppercase tracking-widest` labels at 8 to 10 px), big tracked uppercase headings (`text-4xl font-black uppercase tracking-tight`), pill buttons, rounded-2xl popovers/cards, blue as the main accent, colour-coded status text (emerald/yellow/red/blue), a fixed 6rem bottom player with a 3-column layout (track info | transport + seek | tools + volume). Layout: fixed left sidebar, top toolbar, scrolling main area with generous bottom padding for the player.

## 7. The target system

### 7.1 Principles
- **Local-first.** Every client owns a full working copy of the *metadata* and works with no server. The server is an optional peer for sync and a host for files the device doesn't have locally.
- **Server is optional and self-contained.** Single Node process, one data directory (relocatable to an external drive), obscure default port (47813), token auth. Runs on a Raspberry Pi. No cloud dependency.
- **Derived data is never stored as truth.** Elo, comparisons, ratings, per-album genre inheritance, etc. are computed. Stored truth is: entities, the vote log, the play log.
- **One logic implementation, many shells.** All rules (Elo, queue/rules, rating presentation, sync conflict rule, credit display) live in `@curator/core` (pure TypeScript, heavily tested). Web and Electron import it directly. **Android cannot import TypeScript**; it must reimplement the same rules in Kotlin, driven by shared **test vectors** generated from core (see 7.5). This is a known cost; plan for it from day one.
- **Boring, inspectable storage.** SQLite on the server; content-addressed files (`sha256`) on disk. Everything exportable.

### 7.2 Components
```
packages/core      @curator/core    pure TS rules + types (BUILT)
packages/server    @curator/server  Hono + node:sqlite + file store + sync + migrate + acquire (BUILT)
apps/web           React web client, thematable, local IndexedDB mirror + sync (BUILT; see CLAUDE.md)
apps/electron      Desktop shell around apps/web with real local storage, optional in-process server (LATER)
apps/android       Native Kotlin + Media3 app, Room mirror, same sync protocol, Android Auto (LATER)
```

### 7.3 Data and sync model
- Every entity is a `SyncRecord {table, id, updatedAt, deviceId, deleted, data}` (see `packages/core/src/sync.ts`, shapes in `model.ts`). Server stamps a monotonically increasing `seq`; clients `pull?since=<cursor>` and `push` their changes; **last-writer-wins by `updatedAt`, tie → higher `deviceId`**; deletes are tombstones; `votes`, `playbackLogs`, `timeline` are append-only.
- IDs are UUIDv7 (offline-safe, time-sortable). (Legacy ids are short random strings and are preserved as opaque strings.)
- Whole-record LWW is deliberately simple. It can lose a field-level edit if two devices edit *different fields of the same record* offline. Acceptable for a single user; revisit with per-field merge only if it bites. Document this in the UI copy for "sync" if relevant.
- **Files** (audio, images) are immutable blobs addressed by sha256: `PUT/GET/HEAD /api/files/:hash` with Range support. Entities reference **hashes**, never paths/URLs. A client resolves a hash to: a local blob/file if cached, else the server URL (`?token=`), else "unavailable offline".
- **"Keep on this device"**: per track/album/playlist, a client downloads the audio so it plays offline. Clients track which hashes are local. The server is the full library host; devices hold a subset.
- **Storage limits**: web client has a configurable quota with a **capacity bar** (browser storage is limited, evictable, and can't hold GBs reliably; use OPFS/IndexedDB + `navigator.storage.estimate()` and request persistence). Electron and Android use the real filesystem with a user-chosen limit/location.

### 7.4 The server (what it must remain)
Self-contained; boots with no config; `CURATOR_DATA_DIR` for the external drive; prints its LAN URLs and token at startup; reports free disk space; verifies upload hashes; never trusts client-supplied paths; token compared in constant time. Background job queue for **audio acquisition** via yt-dlp (+ffmpeg) for tracks that have a source URL but no file. See `CLAUDE.md` for routes and env vars. Do not add native-compiled dependencies casually (the Pi is arm64 and the reason for `node:sqlite`).

**Transport security (unresolved, must be addressed before real use):** the server speaks plain HTTP. Consequences to verify and handle: (a) a web client served over HTTPS cannot call an HTTP server (mixed content); (b) Android 9+ blocks cleartext HTTP by default unless the app's network security config allows it for the user's host; (c) tokens travel in the clear on the LAN. Options: Tailscale (encrypted overlay, simplest for a personal setup and also enables remote access), a reverse proxy with a real certificate, or a self-signed cert pinned in the Android app. Pick one with the user, document it in the Pi deployment guide, and test it end to end.

### 7.5 Cross-platform parity
Anything that affects what the user *sees or hears* must be identical on web/Electron/Android: rating numbers, the "10-star rank" display, queue order with back-to-back rules, credit display names. Strategy: pure functions in core + a **fixtures file** (JSON inputs and expected outputs produced by core's tests) that the Kotlin implementation's tests also consume. Do this when starting Android, but design core functions with plain-data in/out now so fixtures are easy.

### 7.6 The web client (built; this section is the intent, `CLAUDE.md` has the as-built detail)
- Stack as built: Vite + React 19 + TypeScript + Tailwind 3 + zustand + `idb` (no shadcn dependency in the new client). Prefer **small focused modules** and a clear data layer over one giant store (the legacy `useMusicStore.ts` is 770 lines of everything and refetches *all* tables after nearly every mutation; do not reproduce that).
- **Data layer**: IndexedDB mirror of records; reads come from the local mirror (instant, offline); writes apply locally, are queued, and are pushed when a server is reachable; a pull loop merges remote changes. Derived selectors (ratings, album genres, display credits) are memoised pure functions from core.
- **Theme system**: design tokens as CSS variables (colours, radii, density, typography, shadows), multiple named themes selectable in Settings, persisted per profile/device. Ship **two** at first: the new default and **Classic** (faithful recreation of the legacy look, including the exact rating pill behaviour). Architect so adding a third theme is "add one token file". Also consider accent colour, density, and light/dark.
- **New default theme direction (user's words)**: "really stylish", **not too dense**. Plan: generous cover-art grids for browsing (Artists, Albums, Playlists, Home), **compact table rows for track lists** where the user ranks/edits (they need information density there), strong typographic hierarchy, restrained colour with one accent, smooth but tasteful motion, a polished persistent player that adapts to mobile widths. "Medium density" is the target. Use screenshots in Chromium at desktop and phone widths to judge it; iterate visually, don't ship unseen UI.
- **Mobile-first responsive**: the web client is also the mobile browser experience; layout must work at ~360 px. Note a web app cannot do Android Auto (see 7.7).
- **Audio**: standard `<audio>` + Media Session API (lock-screen controls, metadata) for the web client; seek via Range.

### 7.7 Android and Android Auto (critical requirement)
The user wants to use this *instead of Spotify in the car*. Verified facts (sources: developer.android.com/training/cars/media, /training/cars/testing):
- Android Auto media apps must expose a **`MediaBrowserService`/`MediaLibraryService` (Media3 preferred) plus a `MediaSession`**; Android Auto renders the browse list and now-playing UI itself. **Custom HTML/web UIs, PWAs, and plain WebView wrappers cannot appear in Android Auto.** Therefore: **native Kotlin + Media3**.
- **No Play Store required for personal use.** Android Auto has a developer option that allows media/messaging/parked apps from unknown sources: on the phone, Android Auto settings → About → tap "Version and permission info" 10× → accept → overflow menu → Developer settings → enable **Unknown sources**. This does **not** apply to apps built on the Cars App Library. Distribute the APK by sideloading.
- Driving restrictions: only the standard templates while driving; no custom playback UI. **Verified browse-tree limits** (developer.android.com/training/cars/media/create-media-browser/content-hierarchy): at most **4 root tabs** (root children must be browsable, not playable; read `BROWSER_ROOT_HINTS_KEY_ROOT_CHILDREN_LIMIT`, default 4); Android Auto "has strict limits on how many media items can be displayed at each level" (the docs do **not** state the number, so test on the DHU/car and design small lists); **no pagination** (do not rely on `page`/`pageSize` in `onGetChildren`); no depth limit is stated. So plan roots like: Recent, Playlists, Artists, Albums (or Top Rated), and make big levels (e.g. 444 tracks) reachable via browsing down (artist → album → track) or search rather than flat lists.
- **Voice** ("play X"): verified for the legacy `MediaSessionCompat.Callback.onPlayFromSearch(query, extras)` (extras may include artist/album/genre/playlist/title; handle an **empty query** by playing something sensible; do not block, set `STATE_CONNECTING` and search on another thread). The Media3 equivalent path (search query arriving via the session's request metadata / `onAddMediaItems`, plus `MediaLibrarySession.Callback.onSearch` for browsable search) was **not** verified here; check the Media3 docs when implementing.
- The app must play **offline** from local storage when the phone has no connection (driving), with the server used when reachable. Cache-by-hash on device storage; show storage use and let the user choose what to keep.
- Android app responsibilities: Room (SQLite) mirror of records; the same sync protocol; Media3 `ExoPlayer` + `MediaLibraryService`; playback logging; applying back-to-back rules in the queue; voting UI is secondary on phone but nice (This or That on the couch).
- Things to verify early on a real device/emulator with the Desktop Head Unit (DHU): the browse tree, artwork loading from local files, and that unknown-sources works with the user's phone/Android Auto version. We cannot test this in the cloud sandbox; budget for the user testing builds.

### 7.8 Electron
Wraps `apps/web`. Reason: real filesystem storage for GBs of offline audio, no browser quota. May optionally spawn the Node server in-process so "host from my PC" is a toggle. Keep the web app free of Electron-specific assumptions behind a small platform-adapter interface (`storage`, `files`, `server`), so the same UI runs in browser, Electron (and potentially Capacitor later).

### 7.9 Audio acquisition and imports
- The legacy library's files were lost. Every legacy track has a source URL (YouTube watch URL), so **`POST /api/acquire`** re-downloads audio via yt-dlp+ffmpeg on the server machine. Real downloads have not yet been exercised (sandbox lacks yt-dlp/network); the first user run is the test. Surface job status and per-track failures in the UI, with retry.
- Covers/artist images are lost. **Built:** the library-health page can fill missing album covers from YouTube thumbnails (maxres, then hq) through `/api/import/cover`, trimming black bars client-side. These are video frames, so quality varies; YouTube Music square art may be better and is not used. Artist images need manual upload (a health check flags them). Not exercised against real YouTube from the cloud sandbox.
- **Album import (built):** paste URL → `POST /api/import/preview` (yt-dlp `--flat-playlist`, metadata only) → **review/edit** → confirm → records created → downloads queued via `/api/acquire`. Fetching metadata first is a deliberate improvement over the legacy "download everything, then review". Tested with a fake `yt-dlp`; real yt-dlp has never run in the sandbox.
- Legal note for the user's awareness, no lecture: downloading from YouTube may violate its terms of service; this is the user's own-use tool and decision. Don't build features whose only purpose is redistribution.

## 8. The user's data (what the migration produced)

Details and verification are in `CLAUDE.md`. Summary: 444 tracks / 33 albums / 38 releases / 10 artists (Drake, Kendrick Lamar, J Cole, Travis Scott, Don Toliver, Isaiah Rashad, Metro Boomin, Freddie Gibbs, PARTYNEXTDOOR, JACKBOYS, plus a created "Jorja Smith") / 1,950 votes / 99 play logs / 1 playlist / 1 group (relational bio) / 4 genres (Hip Hop, Diss Track, R&B, Dance) / 2 roles (Lead artist, Writer). Tracks are mostly 320 kbps (410); 34 are below 192 kbps (all ~127 to 152 kbps) and will show up in the low-quality list; 1 has an unknown bitrate. **Gotcha:** legacy `album_tracks.order` is 0 for almost every row, so track order within an album comes from the default (else longest) release's order, or from `album.trackOrder` once the user edits it. The migrator `cli-migrate.ts` is idempotent; the real `curator.db` is **not** in the repo and must never be committed. When you need real data for testing, ask the user for the file again or use a synthetic fixture; never fabricate that the real data was checked.

## 9. How we work: engineering rules

1. **Tests where data is at stake** (Elo, sync, migration, queue rules, rating presentation, file store). UI gets Playwright smoke tests plus screenshots reviewed by eye.
2. **Run it for real before saying it works.** Boot the server (`pnpm start`), curl it, run the migrator on a copy of real-shaped data, open the web app in Chromium. State clearly what was *not* verified.
3. **Typecheck and lint cleanly.** `erasableSyntaxOnly` is on for server code so it runs under Node type-stripping. Use explicit `.ts` import extensions in core/server.
4. **Small, reviewable commits with the required trailers** (see `CLAUDE.md`). Push to the existing branch/PR. **Do not open new PRs** and do not create a PR unless asked. Never commit the user's database, tokens, or media.
5. **Keep docs current.** Update `CLAUDE.md` (state/decisions/gotchas) in the same commit as the change that invalidates it. Update this brief only when *intent* changes.
6. **Don't re-ask decided questions** (decisions table in `CLAUDE.md`). Do ask when a genuinely new fork appears that changes direction, and batch the questions.
7. **Prefer deleting to accumulating.** The legacy app is a spec, not a base: port behaviour, not code. Once a feature is ported and verified against the legacy behaviour, delete the old file. End state: the legacy root app is gone.
8. **Safety basics on the server:** no path built from client input, validate with schemas at the boundary, constant-time token compare, cap upload sizes, never pass user strings to a shell (yt-dlp is spawned with an argument array and `--` before the URL).
9. **Dependencies:** pnpm workspace with `minimumReleaseAge: 1440`. The legacy app, whose `youtube-dl-exec` postinstall failed offline, is removed; `--ignore-scripts --filter ...` is still the documented install.

## 10. Roadmap with "done" criteria

Status key: DONE / PARTIAL / TODO. (Detailed as-built state: `CLAUDE.md`.)

1. **Web client MVP**: **DONE** (verified by driving it in Chromium against a real server and the migrated real library; the user has run it). Original criteria, kept for regression checks: loads the migrated library, plays acquired audio, votes persist and sync, a second browser sees them, both themes reviewed at desktop and phone width.
2. **Feature parity with the legacy app (section 6)**: **DONE** (the legacy app has been removed; the list below is how it was reached). Ported: browse pages, playlists, relational bios, notes, journal/home, stats, settings (rules editor, roles), voting, queue, album import with review, image upload, cover-from-thumbnail. The legacy Cleanup *task queue* was deliberately replaced by the **library-health** page (in-use-aware checks; it must never offer to remove roles/genres/artists that are in use, which the legacy cleanup did). *Remaining before the legacy root app can be deleted:* confirm nothing in section 6 is missing (the per-track play history, queue reordering and column sorting gaps are now closed; the low-bitrate check already lives in `lib/health.ts`), then remove the legacy `src/`, `server/` and root Vite/Nitro config.
3. **Electron app**: **DONE** (`apps/electron`, [ELECTRON.md](docs/development/ELECTRON.md)). *Done when:* offline library on disk, optional embedded server toggle, packaged build for the user's OS (their legacy binary names suggest Windows; they have also run the web stack on Linux, so ask which).
4. **Android app + Android Auto**: **BUILT, unverified on a device** ([ANDROID.md](docs/development/ANDROID.md); CI compiles it, a car test is still owed). *Done when:* installs via sideload, plays offline, syncs, appears in Android Auto with Unknown sources enabled, browse tree and voice search work on the user's phone/car (DHU first). Needs the user's device testing.
5. **Pi deployment guide**: **WRITTEN, untested on a Pi** (`docs/guides/DEPLOY_PI.md`). Original scope: systemd unit and/or Docker, installing yt-dlp + ffmpeg on arm64, external-drive mount/permissions (exFAT/NTFS lack unix modes; symlink caveat is already in `docs/development/TESTING.md`), backups of `curator.db` + `files/`, HTTPS/Tailscale (7.4), updating. Note: **service workers (PWA install/offline shell) need HTTPS or localhost**, so over plain-HTTP LAN the web app works online but is not installable; this makes the HTTPS/Tailscale decision more pressing.
6. **Polish**: **DONE.** Offline-cache eviction, themes, smarter pair selection and home-page questions, keyboard shortcuts on Rank, backup and export, lyrics and the full-screen view.

## 11. Open questions and risks (track these; resolve with evidence)

- **HTTPS/cleartext strategy** (7.4): decide with the user; test with real Android and a browser.
- **`node:sqlite` is experimental** in Node 22 and prints a warning. Pinned to the `process.getBuiltinModule` workaround. Re-check stability/API on the Node version the Pi will run (verify the Pi's Node version; Node 22.5+ required). Fallback: `better-sqlite3` (has arm64 prebuilds) behind the same `Store` interface.
- **yt-dlp reliability**: YouTube changes break yt-dlp regularly; the Pi needs an easy "update yt-dlp" path. Real downloads untested.
- **Whole-record LWW** may drop concurrent edits to different fields (7.3). Acceptable now.
- **Web storage quota/eviction** on mobile browsers; `persist()` may be denied. Prefer APK for phone offline use (user's stated preference: APK if the web app can't do local storage).
- **Cross-language parity** (7.5): rating/queue logic must match between TypeScript and Kotlin.
- **Parallel sessions.** Several sessions have worked on this repo (PRs #1 to #5; #1 and #2 were closed unmerged but their commits reached `main` through #3). Before starting, fetch `origin/main` and read `CLAUDE.md` there; this branch's docs can lag. Always diff against `main`, and ask the user to push anything that matters.
- **OS of the user's PC** (for Electron packaging; evidence points to both Windows and Linux) and **Pi model/Node version** are unknown. Ask once when needed.
- Legacy features I have not read in full (modals, `Stats` internals, `AlbumDetail` editor) must be read when ported, since this brief's feature inventory is from headings and key components, not every line.

## 12. Things NOT to do

- Don't rebuild a mandatory hosted backend/frontend split. Clients must work without the server.
- Don't store Elo, comparisons or ratings as authoritative fields.
- Don't reference media by server-relative path in entities; use hashes.
- Don't port the legacy store/route structure or its bugs (list in `CLAUDE.md`).
- Don't change the rating pill's rules or colours in the Classic theme without being asked.
- Don't make the new default theme dense or uppercase-heavy; that is Classic's character.
- Don't claim Android Auto works from the web app, and don't promise it without a device/DHU test.
- Don't commit data, secrets, or the user's `curator.db`. Don't open new PRs. Don't spend the user's usage on speculative sprawling changes; do the next roadmap step well and verify it.
