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

## Graphics
The window is painted by the GPU when Chromium can use one. On Linux its built-in block list leaves GPU painting off for many drivers, so the app starts with `--ignore-gpu-blocklist --enable-gpu-rasterization`. Electron falls back to software rendering silently when the GPU process cannot start, so the app reads back what it got:

- the terminal prints one line shortly after the window opens, e.g. `[curator] graphics: Hardware accelerated` or `Software rendering: Chromium found no usable GPU or GL driver`;
- Settings > Desktop app shows the same line, with the GL implementation (or GL renderer string) beside it;
- a crash of the GPU process is printed as it happens.

Chromium reports `gpu_compositing: enabled` even with no GPU (it composites on the CPU through its own GL), so the check also looks at the GL implementation (`gl=none`), a software GL (SwiftShader, llvmpipe) and whether a GPU with a vendor id was found. Measured in a container with no GPU: it reports software, as it should. A real GPU has not been tried from the sandbox.

If it says software on a computer with a GPU: check the driver (`glxinfo -B`, `vulkaninfo --summary`), then try `CURATOR_SOFTWARE_RENDERING=1` only to confirm the GPU is the problem (it turns the GPU off on purpose). Two switches that other Electron users report helping (not tried here): `--ozone-platform=x11` when the GPU process exits at start-up under Wayland, and `--disable-gpu-sandbox` for NVIDIA's proprietary driver errors ("Can't initialize nvrm channel"). Pass them to `electron .` or to the installed app, and check the line above again.


## Window, menu and icon (2026-10-11)
- **No menu bar.** Everything it held is in Settings > This app (library folder, show folder) and the shortcuts still work: Ctrl+R / F5 reload, Ctrl+Shift+I / F12 developer tools, F11 full screen, Ctrl +/-/0 zoom.
- **Window decorations from the theme** (Settings > This app, off by default, restarts the app): the page draws the title bar and the minimise/maximise/close buttons (`components/WindowFrame.tsx`) from the current UI style's dialog variables; macOS-like styles put the buttons on the left. `desktop.json` keeps the choice (`customFrame`).
- **Wayland icon.** The window's identity on Wayland is its app id, which Electron takes from `desktopName`. It was missing, so the launcher's icon and the window were two different things (a second, generic window icon). `package.json` now has `"desktopName": "music-curator.desktop"`, the deb's `StartupWMClass` is `music-curator`, and `app.setDesktopName()` sets it at run time. If an old install still shows two icons, remove stale copies in `~/.local/share/applications/` and reinstall the .deb. Not verified on a real Wayland session from here.
- **Discord** needs a Discord application behind the scenes (the protocol cannot connect without one, in any language or wrapper). `BUILT_IN_DISCORD_CLIENT_ID` in `src/desktopConfig.ts` is the project's own: register one application at discord.com/developers/applications once (name = what appears after "Listening to", art asset `logo`), paste its id there, and nobody else has to do anything. Until then the setting tells the user so and offers their own id under "Use my own Discord application".
