# Trying the new web client with your own library

Everything below runs on your own machine. Nothing here touches your old app or your old `curator.db` (it is only read).

## 0. What you need
- **Node 22.5 or newer** (`node -v`). Older versions lack the built-in SQLite the server uses.
- **pnpm** (`npm i -g pnpm`).
- Git, and this branch: `git fetch origin && git checkout claude/eloquent-darwin-6q1rf2`.
- For audio only (step 5): **yt-dlp** and **ffmpeg** (both must run from a terminal).

## 1. Install and build (once, and after each `git pull`)
From the repo root:
```
pnpm install --ignore-scripts --filter @curator/core --filter @curator/server --filter @curator/web
pnpm --filter @curator/web build
```
(`--ignore-scripts` matters: the legacy app's `youtube-dl-exec` postinstall fails otherwise.)

## 2. Import your library into a fresh data folder
Pick a folder for the new server's data (any path; later this is the external drive on the Pi).
Your old database is `data/curator.db` inside the old app folder.

PowerShell (Windows):
```
cd packages\server
$env:CURATOR_DATA_DIR = "C:\curator-data"
node --experimental-strip-types --disable-warning=ExperimentalWarning src/cli-migrate.ts --db "C:\path\to\old-app\data\curator.db"
```
macOS / Linux:
```
cd packages/server
CURATOR_DATA_DIR=~/curator-data node --experimental-strip-types --disable-warning=ExperimentalWarning src/cli-migrate.ts --db /path/to/old-app/data/curator.db
```
You should see a table of counts (444 tracks, 33 albums, 1950 votes for the library tested so far).
It is safe to run again; it never duplicates anything.
Add `--public <old-app>/public` only if you still have the old `public/uploads` folder (audio + images); it copies them in.

## 3. Start the server
Same terminal, same `CURATOR_DATA_DIR`:
```
pnpm start
```
It prints a **token** (also saved in `<data dir>/token`). Leave it running.

## 4. Open the app
Go to **http://localhost:47813**. Open **Settings**, paste the token under *Server*, press **Save & sync**.
The dot at the bottom of the sidebar turns green ("Synced") and your library appears.
On your phone (same Wi-Fi): open `http://<computer's LAN address>:47813` (the server prints it), paste the token there too.

Things worth trying:
- Albums / Artists / Tracks: browse, filter, sort. Ratings and `#1`, `#2` ranks should match your old app.
- **Rank**: vote a few times; check the vote count on Stats goes up.
- Edit a track/album/artist (pencil / Edit), upload a cover, create an artist, add a playback rule.
- Open the app in a second browser or phone: changes should appear there within about 30 seconds.
- Stop the server, keep using the app (it works offline), start it again: changes sync.

## 5. Getting audio back (the old `uploads` folder is gone)
Install **yt-dlp** and **ffmpeg** so the server can find them (or point at them):
PowerShell, before `pnpm start`:
```
$env:CURATOR_YTDLP = "C:\tools\yt-dlp.exe"       # only if it is not on PATH
$env:CURATOR_FFMPEG_DIR = "C:\tools\ffmpeg\bin"  # folder containing ffmpeg.exe, only if not on PATH
```
Then in the app: **Settings → Audio → Download missing audio**, and **Progress** to watch it.
Start small to check it works: the first run is the first real test of this code against YouTube.
Downloaded tracks get a play button and can be kept offline per album.

## If something is wrong
- Blank page / 404 at `/`: you skipped the build in step 1.
- "Wrong token": copy the token from `<data dir>/token` again.
- Counts look wrong after migrating: tell me the numbers shown and which album/track looks off.
- Run the automated checks: `pnpm --filter @curator/web test`, and `npx vitest run` inside `packages/core` and `packages/server`.
