# Packaging and releases (plan)

Status: **plan, nothing below the "Done" section is built yet.** Decisions below were agreed with the owner on 2026-10-12.

## Done
- Every release asset has a lowercase name: `music-curator-<version>-<os>-<arch>.<ext>`
  - Linux: `music-curator-<version>-linux-<arch>.AppImage`, `music-curator-<version>-linux-<arch>.deb`
  - Windows app: `music-curator-<version>-windows-<arch>-setup.exe`
  - Windows server: `music-curator-server-<version>-windows-<arch>-setup.exe`
  - Android: `music-curator-<version>-android-beta.apk`
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


## Decisions (owner, 2026-10-12)
- **Formats:** `.deb` is Debian-family only; `.AppImage` is its own platform. **Each of them gets three builds: full, server, app.** So Linux ships six files, Windows three, Android the app (beta).
  Names: `music-curator[-server|-app]-<v>-linux-<arch>.deb|.AppImage`, `music-curator[-server|-app]-<v>-windows-<arch>-setup.exe`, `music-curator-<v>-android-beta.apk`.
- **Android is labelled beta** (the asset name says so; do the same in the app's About line).
- **Mesh = one switchable primary with replicas.** Exactly one server accepts writes (the primary); replicas pull from it and can serve files and play. "Make this the primary" is a deliberate switch: the old primary first becomes a replica of the new one. Last-writer-wins sync already makes the data side safe; what is new is the role flag, the replica list, and re-pointing clients (the pairing code already carries the address).
- **Android server through Termux, hidden from the user.** No terminal commands for the user: the app installs and drives Termux itself (Termux's `RUN_COMMAND` intent needs the user to allow it once in Termux's settings; the app explains that screen in one step). The user sees only a Server switch with a status line. Termux must come from F-Droid or GitHub (the Play Store build is abandoned), so the app has to offer that download. Unverified here: whether the intent-based flow can be made to need no manual Termux step.
- **Signing, free and with no ongoing effort:**
  - Android: already signed with the committed key (`apps/android/curator.keystore`).
  - Linux apt repository and AppImages: sign with a GPG key generated once and stored as a repository secret (free).
  - Windows: [SignPath Foundation](https://signpath.org/terms) signs open-source projects for free (needs an OSI licence, which the MIT licence is; a public repo; a fully automated build; a one-time application by the owner, and they approve each release request unless set otherwise). This is the only step that needs the owner once. Without it Windows keeps showing "Windows protected your PC". A self-signed certificate does not remove that warning.

## Updating a .deb on Kubuntu: what the research says
- electron-updater's `.deb` updater needs root to run `dpkg` ([electron-builder docs](https://www.electron.build/docs/features/auto-update)), which is why it uses `pkexec`; that fails without a polkit agent or when the process is started with `no_new_privs` (sudo and pkexec are setuid, so the kernel refuses them, see the [kernel's no_new_privs page](https://docs.kernel.org/5.10/userspace-api/no_new_privs.html)). `no_new_privs` is inherited by every child, so a terminal started by the app cannot run `sudo` either. It is set by whatever launched the app, not by the app: check with `grep NoNewPrivs /proc/$(pgrep -o music-curator)/status`.
- **Best long-term answer: a signed apt repository**, the way Chrome, VS Code and Signal do it. Hosted on GitHub Pages (free), built by the release workflow (`apt-ftparchive` + `gpg`, see [this walk-through](https://pgxn.org/dist/pg_replica/packaging/README.html)), added by the package's `postinst` as `/etc/apt/sources.list.d/music-curator.sources` with a `Signed-By` key in `/usr/share/keyrings`. Then Discover and `apt upgrade` update it with the system's own authorisation, the app needs no privileges, and `no_new_privs` is irrelevant. The app only has to say "an update is available; your software updater will install it".
- `pkcon install-local` (PackageKit) also avoids sudo, but PackageKit on Ubuntu-family systems asks for an admin password and the polkit rule that skips it is a security downgrade, so it is not the primary route ([discussion](https://seclists.org/oss-sec/2018/q2/64)).
- Until the repository exists the app does this: if `no_new_privs` is set it opens the install terminal through `systemd-run --user` (outside its own process tree) so `sudo` works; otherwise `pkexec`, then a terminal, then a copyable command. The AppImage needs none of this.
- Build order for the repository: (1) generate the GPG key, add the secret `APT_GPG_PRIVATE_KEY`; (2) a `release.yml` job builds `Packages`/`Release`/`InRelease` and publishes them to Pages; (3) the `.deb` gets a `postinst` that installs the source; (4) the app detects that source and stops offering its own install button.
