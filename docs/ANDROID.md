# Android app and self-updates

`apps/android` is a native Kotlin app made of two parts:

- **The app itself** (`MainActivity`): the web client (bundled in the APK) in a full-screen WebView, so everything works the same as in the browser: library, voting, offline audio, themes. Set the server (your Pi) in Settings once. Android's file picker works for uploads.
- **Android Auto / media controls** (`PlaybackService`, a Media3 `MediaLibraryService`): Android Auto can only show a native media app, so this part browses your library (Albums, Artists, Playlists, Singles) straight from the server and plays the audio, with notification / lock screen / steering-wheel controls. The web client tells it which server you use (Settings > Server). It reads the same records as the web client; ratings are not shown in the car.

To use Android Auto without the Play Store: Android Auto settings > tap "Version" 10 times > developer settings > enable "Unknown sources".

## Updates (no command line, desktop or Android)

Both apps update themselves from the newest **GitHub release**:

1. Push a tag: `git tag v0.2.0 && git push origin v0.2.0`. `.github/workflows/release.yml` builds the Windows and Linux installers (electron-builder, which also writes the update manifest) and the signed APK, and attaches them to the release.
2. The desktop app checks at start and every 6 hours, downloads in the background and installs on quit, or from Settings > App updates > "Restart to update". The Android app checks when opened (at most every 6 hours), downloads the APK, and "Install update" opens Android's installer (first time: allow "install unknown apps" for Music Curator).

**The repository is private**, so the apps need a read-only token: GitHub > Settings > Developer settings > Fine-grained tokens, only this repository, permission **Contents: read-only**. Paste it in Settings > App updates > "Private repository?" on each device. Not needed once the repository is public.

Notes:
- The APK is signed with `apps/android/curator.keystore`, committed on purpose (private repo, personal app): Android only installs an update signed with the same key as the installed app. Don't change it.
- macOS is not built: auto-update on macOS needs a paid Apple signing certificate.
- Nothing here has been run on a device. The sandbox that wrote it had no Android SDK, so the first CI run is the first compile of the Android project; expect to fix small things.
- The desktop self-update was checked up to "disabled in a development run"; real updates need an installed build and a release.

## Discord (desktop app)

Settings > Discord. Create an application at discord.com/developers/applications (its name is shown after "Listening to"), optionally add an image named `logo` under Rich Presence > Art Assets, paste the Application ID. Discord's desktop client must be running. Tested against a fake Discord IPC socket and a real Electron; not against real Discord.
