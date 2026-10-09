# Running the server on a Raspberry Pi

Written from the server's actual behaviour (`packages/server`). The parts that depend on your Pi (model, OS, drive) are marked **check**. Nothing here has been run on a real Pi yet. Report anything that does not match and this file gets fixed.

## 0. What you need
- A Pi 64-bit OS (Raspberry Pi OS 64-bit / Debian 12+). The server is plain Node, so any model that runs it works; downloads and ffmpeg are the slow part on older Pis.
- **Node 22.13 or newer.** The server uses the built-in `node:sqlite`, which needs no native compile but is still labelled experimental by Node (it prints a warning, silenced by the flag in the unit below). Debian's own `nodejs` package is too old. Install Node 22 with [nvm](https://github.com/nvm-sh/nvm) for the service user (see `docs/TESTING.md` step 0) or from NodeSource. **check:** `node -v`.
- `ffmpeg` (`sudo apt install ffmpeg`) and **yt-dlp** (section 4) for audio downloads.
- An external drive, ideally formatted **ext4**. exFAT/NTFS have no unix permissions or symlinks, so the token file cannot be locked down (the server tolerates this) and `pnpm install` must not run on that drive.

## 1. Mount the drive
Find it with `lsblk -f`, note the UUID, create a mount point and add it to `/etc/fstab`:
```
sudo mkdir -p /mnt/curator
# /etc/fstab (ext4). nofail so a missing drive does not stop the Pi booting
UUID=<your-uuid>  /mnt/curator  ext4  defaults,nofail  0  2
sudo mount -a
sudo mkdir -p /mnt/curator/data && sudo chown -R curator:curator /mnt/curator/data   # after creating the user below
```
The server stores everything under `CURATOR_DATA_DIR`: `curator.db` (+ `-wal`/`-shm`), `files/` (audio and images, named by sha256), `tmp/`, `token`.

## 2. Install the app
```
sudo useradd --system --create-home --shell /usr/sbin/nologin curator
sudo -u curator -H bash       # then, as that user:
git clone <your repo url> ~/music-curator && cd ~/music-curator
pnpm install --ignore-scripts --filter @curator/core --filter @curator/server --filter @curator/web
pnpm --filter @curator/web build      # the server serves apps/web/dist at /
```
Install pnpm with `npm install -g pnpm` (needs Node first). `--ignore-scripts` is required: the legacy root app's postinstall fails otherwise.

Import your old library once (optional, idempotent), exactly as in `docs/TESTING.md` step 2, with `CURATOR_DATA_DIR=/mnt/curator/data`.

## 3. systemd service
`/etc/systemd/system/curator.service` (adjust the `node` path: `which node` as the curator user; with nvm it is under `~/.nvm/versions/node/v22.x/bin/node`):
```
[Unit]
Description=Music Curator server
After=network-online.target mnt-curator.mount
Wants=network-online.target
RequiresMountsFor=/mnt/curator

[Service]
User=curator
WorkingDirectory=/home/curator/music-curator/packages/server
Environment=CURATOR_DATA_DIR=/mnt/curator/data
# Environment=CURATOR_PORT=47813
# Environment=CURATOR_HOST=127.0.0.1      # only if everything goes through Tailscale/a reverse proxy (section 5)
# Environment=CURATOR_YTDLP=/usr/local/bin/yt-dlp
ExecStart=/usr/bin/node --experimental-strip-types --disable-warning=ExperimentalWarning src/index.ts
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
```
```
sudo systemctl daemon-reload
sudo systemctl enable --now curator
journalctl -u curator -f          # first start prints the token; also in /mnt/curator/data/token
```
`RequiresMountsFor` makes the service wait for the drive, so it never creates a fresh empty database on the SD card by accident. The unit name `mnt-curator.mount` follows the mount path; with another path use `systemd-escape -p --suffix=mount /your/path`.

Open `http://<pi-address>:47813`, paste the token in Settings → Server, Save & sync.

## 4. yt-dlp and ffmpeg
- ffmpeg: `sudo apt install ffmpeg`.
- yt-dlp: apt's version is usually stale, and YouTube breaks old versions regularly. Use the standalone binary for 64-bit ARM, `yt-dlp_linux_aarch64` from the [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases) (a 32-bit OS needs the pip or zip route instead), and let it update itself:
  ```
  sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_aarch64 -o /usr/local/bin/yt-dlp
  sudo chmod a+rx /usr/local/bin/yt-dlp
  sudo yt-dlp -U            # run this whenever downloads start failing
  ```
  Set `CURATOR_YTDLP=/usr/local/bin/yt-dlp` in the unit if it is not on the service's PATH.
- **JavaScript runtime (important).** Since yt-dlp 2025.11.12, YouTube needs an external JS runtime, otherwise many formats are missing. Deno is the default; Node 22+ also works but must be switched on. The server already needs Node, so put this in `/etc/yt-dlp.conf` (yt-dlp reads it on every run; the server needs no change):
  ```
  --js-runtimes node
  ```
  (If yt-dlp cannot find `node` because the service uses an nvm path, give the path: `--js-runtimes node:/home/curator/.nvm/versions/node/v22.x/bin/node`.) The official executables already bundle the `yt-dlp-ejs` component this relies on. See the [yt-dlp EJS docs](https://github.com/yt-dlp/ejs). Test by hand as the service user: `yt-dlp -F "<a YouTube watch URL>"` should list audio formats.
- First real run: in the app use **Settings → Audio → Download missing audio** on a handful of tracks and watch **Progress** and `journalctl -u curator`. Real yt-dlp has so far only been run against a fake script in testing.

## 5. HTTPS and reaching it away from home
The app talks plain HTTP on the LAN. That works for browsing, voting and editing, but browsers only allow installing the app and its offline shell (service workers) on **https or localhost**, and the Android app will want HTTPS for anything beyond the home network. The least-effort route is [Tailscale](https://tailscale.com/kb/1311/serve) (no port forwarding, no public exposure):
```
# on the Pi, once Tailscale is installed and logged in; enable HTTPS certificates for the tailnet in the admin console (DNS page)
sudo tailscale serve --bg 47813
tailscale serve status          # prints the https://<pi>.<tailnet>.ts.net URL
```
Open that URL on your phone (also on Tailscale). With this in place you can set `CURATOR_HOST=127.0.0.1` so the plain-HTTP port is not reachable on the LAN at all; the trade-off is that `http://<pi>:47813` stops working. Check `tailscale serve --help` on your version, the CLI changed in 1.52. Do not expose port 47813 to the public internet: the only protection is the token.

## 6. Backups
- **Files** (`files/`) are immutable and content-addressed, so a plain `rsync -a /mnt/curator/data/files/ <backup>/files/` is incremental and safe while running.
- **Database**: it is in WAL mode, so do not just copy `curator.db` while the server runs. Either `sudo apt install sqlite3` and `sqlite3 /mnt/curator/data/curator.db ".backup '/backup/curator.db'"` (consistent while running), or stop the service, copy `curator.db*`, start it again.
- Also keep `token` if you want clients to keep working after a restore (or paste the new one).
- Every client holds a full copy of what it has synced, but a client that was never online after an edit cannot restore the server, so still back up.

## 7. Updating
```
sudo -u curator -H bash -c 'cd ~/music-curator && git pull && pnpm install --ignore-scripts --filter @curator/core --filter @curator/server --filter @curator/web && pnpm --filter @curator/web build'
sudo systemctl restart curator
sudo yt-dlp -U
```
Clients pick up the new web build on their next load (when online; the app shell is fetched fresh and cached for offline).

## Troubleshooting
- Service starts then exits: `journalctl -u curator -n 50`. `Cannot find package '@hono/node-server'` means the install step was skipped or run as another user.
- `node:sqlite` not found: Node is older than 22.13 (`node -v` as the **service** user, not your login).
- Token rejected after moving the data dir: the token lives in `<data dir>/token`; set `CURATOR_TOKEN` to override.
- 404 at `/`: the web client was not built, or `CURATOR_WEB_DIR` points elsewhere.
- Downloads fail with "yt-dlp not found": set `CURATOR_YTDLP`; with ffmpeg errors, set `CURATOR_FFMPEG_DIR` to the folder containing it.
