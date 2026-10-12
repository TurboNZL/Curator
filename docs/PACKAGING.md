# Packaging and releases (plan)

Status: **plan, nothing below the "Done" section is built yet.** Written 2026-10-12 so the next session can start from agreed decisions and open questions.

## Done
- Every release asset has a lowercase name: `music-curator-<version>-<os>-<arch>.<ext>`
  - Linux: `music-curator-<version>-linux-<arch>.AppImage`, `music-curator-<version>-linux-<arch>.deb`
  - Windows app: `music-curator-<version>-windows-<arch>-setup.exe`
  - Windows server: `music-curator-server-<version>-windows-<arch>-setup.exe`
  - Android: `music-curator-<version>-android.apk`
- No transition period was needed. Installed apps never look for a file name: electron-updater reads `latest*.yml` (which lists whatever name the build produced) and the Android updater takes the first asset ending in `.apk`.
- The displayed product name ("Music Curator") and the installed app's folder are unchanged.

## Goal
One program, three platforms (Windows, Linux, Android), each in **two halves** that install separately and fit together:

| Half | What it is | Runs where |
|---|---|---|
| **Server** | library, files, sync, downloads (yt-dlp), Connect hub. Headless, or with a tray/status window. | Pi, PC, always-on box, (Android, see below) |
| **App** (GUI) | the web client in a window (Electron / WebView), local copy of the library | desktop, phone |

"Full" = both halves in one installer. Installing only the server and later adding the app (or the reverse) must end in the same state as installing the full package.

## Proposed approach
1. **Keep one repo and one version number.** Every release publishes, per platform: `full`, `server`, `app`. Names: `music-curator-<v>-<os>-<arch>[-server|-app].<ext>`; `full` has no suffix.
2. **Linux:** three `.deb` packages from one source: `music-curator-server` (systemd unit, no GUI deps), `music-curator-app` (Electron window, depends on the server package only as *Recommends* so it can also talk to a remote server), and the meta-package `music-curator` (Depends on both). Uninstalling either half is plain `apt remove`. The AppImage stays as the no-root "full" build.
3. **Windows:** the existing two installers (app, server) already are the two halves; add a third "full" installer that runs both. The installer pages must say they are halves of one program, and each must be uninstallable on its own from Settings > Apps (separate app ids already: `app.musiccurator.desktop`, `app.musiccurator.server`).
4. **Android:** the APK stays the app (GUI). A server half on Android is a separate decision (below).
5. **Switching host temporarily** (Pi -> PC): needs "clone from another Curator server": the new server pulls records and files from the old one over the existing sync protocol (`/api/sync/pull`, `/api/files`), then the clients are re-pointed (the pairing code already carries address + token). This is the "network clone" and the base for a mesh later: each node is a client of the others, files are content-addressed so any node can serve any file.

## Server on Android: feasibility
- Possible: embed Node (e.g. [nodejs-mobile](https://code.janeasystems.com/nodejs-mobile)) in a foreground service, or run the existing server under Termux. A third-party app listing shows the foreground-service pattern working ([example listing](https://apkcombo.com/node-js-server/bans.njsServer/)).
- Unverified / risks: nodejs-mobile is community-maintained now; whether its Node version includes `node:sqlite` (the server's database) was **not confirmed**; yt-dlp and ffmpeg are not available on Android without Termux; a foreground service shows a permanent notification and Doze/battery-optimisation settings can still stop it.
- Power: idle cost is small (a sleeping HTTP server); the drain comes from downloads, ffmpeg and sync bursts. Mitigation: run only while charging or on Wi-Fi by default, and show the cost on the Health card.
- Drive-health warning (requested): the server already measures fsync latency and disk state (`/api/admin/health`). Add a rolling "bytes written in the last 24 h" counter for downloads and flag it when a drive's write rate or fsync time degrades while downloading, with a plain-sentence notification in the app.
- Recommendation: do **not** start with Android server. Ship the Linux/Windows halves and the network clone first; prototype the Android server as an opt-in experiment once `node:sqlite` on nodejs-mobile is checked.

## Order of work
1. (done) lowercase assets.
2. Windows "full" installer + halves wording in both installers; uninstall of one half leaves the other working.
3. Linux three-package split.
4. Network clone / "become the server" flow (server import from another server, repoint clients).
5. Android server experiment with the drive-health notification.

## Open questions for the owner
- Is a signed installer wanted (Windows SmartScreen, Android Play)? None of the current ones are signed.
- Should "full" on Linux be the meta `.deb` only, or also an AppImage that contains both halves (current AppImage already does)?
- Mesh: peer-to-peer (every node equal) or one primary with replicas? Replicas are far simpler with the current last-writer-wins sync.
