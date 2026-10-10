# Desktop app (Electron)

`apps/electron` is the web client in its own window, **with the server inside it**. It runs the same server as the Raspberry Pi
(`packages/server`) on `127.0.0.1:47814`, keeps the library (database, audio, pictures) in a folder, and shows the web client from it.
So everything works unchanged: import from YouTube (needs yt-dlp and ffmpeg on the computer, see YTDLP_COOKIES.md), upload, ranking, themes, Play on a device.

- A fresh install is already connected to its own server (the app hands the token to the page), so there is nothing to type.
- **Library folder:** default is inside the app's user-data folder. File > Library folder... (or Settings > Desktop app) picks another, for example a big drive; the app restarts. The old library is not moved: copy its contents over first if you want to keep it.
- **Use your Pi instead:** Settings > Server, enter the Pi's address and token. The window then syncs with the Pi (and Play on a device sees the Pi's devices); the embedded server just serves the app. The two libraries are separate, so choose one as home. To move the local library to the Pi, use Backup (export, then import on the Pi).
- The port stays fixed (47814, `CURATOR_DESKTOP_PORT` to change it) because the window's storage belongs to that address.
- Sound keeps playing with the window in the background, media keys work (MPRIS on Linux), links open in your browser.

## Build and run
```
pnpm install --ignore-scripts --filter @curator/electron --filter @curator/web --filter @curator/server --filter @curator/core
node apps/electron/node_modules/electron/install.js   # downloads the Electron binary (the install script is skipped above)
pnpm --filter @curator/web build
pnpm --filter @curator/electron start                  # bundle + run
pnpm --filter @curator/electron dist                   # installers in apps/electron/release (AppImage + deb, nsis, dmg)
```
`dist` builds with electron-builder for the platform you run it on. The main process is bundled with esbuild (`scripts/build.mjs`: `dist/main.mjs` includes the server, `dist/preload.cjs`);
the web client is copied into the app as `resources/web`. Needs Node 22.5+ for `node:sqlite`; Electron 44 ships Node 24.

On Linux as root (containers, CI) add `--no-sandbox`; headless: `xvfb-run -a`.
