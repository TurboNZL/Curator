# Trying the new web client with your own library

Everything below runs on your own machine. Nothing here touches your old app or your old `curator.db` (it is only read).

## 0. What you need

You need **Node 22.13 or newer**, **pnpm**, and a copy of this repo that contains `apps/web` (the current `main` does).

Check what you have:
```
node -v      # must print v22.13 or higher
pnpm -v      # must print a version
```
`sudo apt install nodejs` usually gives a much older Node (Debian 12 ships 18), and apt has no `pnpm` package, so use nvm (installs into your home folder, no sudo):
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```
Close the terminal and open a new one, then:
```
nvm install 22
npm install -g pnpm
node -v && pnpm -v
```
(Any newer nvm release tag works in that URL; check github.com/nvm-sh/nvm/releases.)

For audio only (step 5) you also need **yt-dlp** and **ffmpeg**.

**If `pnpm install` fails with symlink / EPERM / "operation not permitted" errors:** the folder is on a drive format that cannot hold symlinks (exFAT, some NTFS mounts). Copy the repo to your home folder (`cp -r` to `~/curator`) and run everything there. The data folder in step 2 can still live anywhere.

## 1. Install and build (once, and after each update)
From the repo root (quote the path if it has spaces):
```
cd "/path/to/music-curator-main"
pnpm install --ignore-scripts --filter @curator/core --filter @curator/server --filter @curator/web
pnpm --filter @curator/web build
```
(`--ignore-scripts` skips dependency install scripts; it used to matter because the removed legacy app's `youtube-dl-exec` postinstall failed.) The build ends with `✓ built in …s`.

## 2. Import your library into a fresh data folder
Pick a folder for the new server's data (any path; later this is the external drive on the Pi).
Your old database is `data/curator.db` inside the old app folder.

Linux / macOS (bash):
```
cd packages/server
CURATOR_DATA_DIR=~/curator-data node --experimental-strip-types --disable-warning=ExperimentalWarning src/cli-migrate.ts --db "/path/to/old-app/data/curator.db"
```

PowerShell (Windows):
```
cd packages\server
$env:CURATOR_DATA_DIR = "C:\curator-data"
node --experimental-strip-types --disable-warning=ExperimentalWarning src/cli-migrate.ts --db "C:\path\to\old-app\data\curator.db"
```
You should see a table of counts (444 tracks, 33 albums, 1950 votes for the library tested so far).
It is safe to run again; it never duplicates anything.
Add `--public <old-app>/public` only if you still have the old `public/uploads` folder (audio + images); it copies them in.

## 3. Start the server
Same terminal, same `CURATOR_DATA_DIR` (bash: `CURATOR_DATA_DIR=~/curator-data pnpm start`):
```
pnpm start
```
It prints a **token** (also saved in `<data dir>/token`). Leave it running.

## 4. Open the app
Go to **http://localhost:47813**. Open **Settings**, paste the token under *Server*, press **Save & sync**.
The dot at the bottom of the sidebar turns green ("Synced") and your library appears.
On your phone (same Wi-Fi): open `http://<computer's LAN address>:47813` (the server prints it), paste the token there too.

Things worth trying:
- **Home**: the journal, ranked %, and a "Keep ranking" shortcut.
- **Albums → Import**: paste a YouTube Music album/playlist link. It looks it up first (nothing downloads), lets you fix titles/artist/genres, then imports and downloads the audio (needs step 5 set up).
- **Health**: lists what is missing or odd (no audio, no genre, no cover, duplicates, unused genres/roles/artists). "Try YouTube thumbnails" fills missing covers.
- **Album page → Edit tracks / Releases / Bios / Notes**, and **Playlists** (reorder, rename).
- The (i) button on a track row shows how it earned its rating (wins, losses, every vote).
- Albums / Artists / Tracks: browse, filter, sort. Ratings and `#1`, `#2` ranks should match your old app.
- **Rank**: vote a few times; check the vote count on Stats goes up.
- Edit a track/album/artist (pencil / Edit), upload a cover, create an artist, add a playback rule.
- Open the app in a second browser or phone: changes should appear there within about 30 seconds.
- Stop the server, keep using the app (it works offline), start it again: changes sync.

### Using it on your phone
`http://<computer's LAN address>:47813` works for browsing, ranking, editing and uploads. Browsers only allow installing the app and the offline app shell on **https or localhost**, so for that put the server behind HTTPS or Tailscale (a later docs step covers Pi deployment).

## 5. Getting audio back (the old `uploads` folder is gone)
Install **yt-dlp** and **ffmpeg** so the server can find them (or point at them):
bash: `CURATOR_YTDLP=/path/to/yt-dlp CURATOR_DATA_DIR=~/curator-data pnpm start`. PowerShell, before `pnpm start`:
```
$env:CURATOR_YTDLP = "C:\tools\yt-dlp.exe"       # only if it is not on PATH
$env:CURATOR_FFMPEG_DIR = "C:\tools\ffmpeg\bin"  # folder containing ffmpeg.exe, only if not on PATH
```
Then in the app: **Settings → Audio → Download missing audio**, and **Progress** to watch it.
Start small to check it works: the first run is the first real test of this code against YouTube.
Downloaded tracks get a play button and can be kept offline per album.

## If something is wrong
- `pnpm: command not found`: see step 0 (apt has no pnpm package; use nvm + `npm install -g pnpm`).
- Blank page / 404 at `/`: you skipped the build in step 1, or your copy has no `apps/web` folder (re-download the current `main`).
- "Wrong token": copy the token from `<data dir>/token` again.
- Counts look wrong after migrating: tell me the numbers shown and which album/track looks off.
- Run the automated checks: `pnpm --filter @curator/web test`, and `npx vitest run` inside `packages/core` and `packages/server`.
