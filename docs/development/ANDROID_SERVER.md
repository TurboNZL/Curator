# Running the server on the phone: why Termux, and what else could work

The server is Node.js (`node:sqlite`, Hono), plus yt-dlp (Python) and ffmpeg. The Android app is a WebView shell with a native player. The beta server module runs all of that in **Termux** and the app drives it (`TermuxServer.kt`).

## Why the app cannot simply start the server itself
- **Android 10+ forbids running a program from the app's own data folder** (a W^X rule for apps targeting API 29+; the app targets 35). The only executable code an app may run is what is packaged inside the APK (native libraries in `jniLibs`, installed to `nativeLibraryDir`). Termux is exempt because it is built for this (it targets an old API on purpose).
- So Node, Python, ffmpeg and yt-dlp would all have to be shipped inside the APK as native libraries.

## Options, honestly
| Option | What it takes | Verdict |
|---|---|---|
| **Termux** (today) | the user installs Termux, one pasted line, then the app does the rest | works, but three moving parts the user sees |
| **Node embedded in the APK** (nodejs-mobile: Node as a library in an app) | the server runs in-process as a background thread in a foreground service | the project is community-maintained and tracks old Node lines; the server needs `node:sqlite` (Node 22.5+). Not verified for any nodejs-mobile build; likely means replacing the database layer. |
| **yt-dlp + ffmpeg inside the APK** (`youtubedl-android`: Python 3.x, yt-dlp and ffmpeg as libraries) | add the library, call it from Kotlin | the library exists and needs `extractNativeLibs=true`; this part is realistic |
| **Rewrite the server for Android** (Kotlin: sync, files, import using the library above) | a second implementation of every server route | the clean answer, a large project |

A real "service inside TurboMusic" is the last two rows together: no Termux, one app. It is weeks of work and two server code bases to keep equal, so it is a decision for the owner, not a patch.

## What Termux needs (and what we got wrong)
- The calling app declares `com.termux.permission.RUN_COMMAND`, the user grants it (App info > Permissions), and `allow-external-apps = true` is set inside Termux. Target SDK 30+ also needs `<queries><package android:name="com.termux"/></queries>` (present). Termux's wiki states these three; nothing documents an install-order rule.
- An earlier version here claimed Android ignores the permission "when Termux was installed after this app" and blocked the card on `getPermissionInfo`. That claim had no source, and it stopped a user whose Termux was installed first. The card now asks anyway, and **Test** runs a harmless command: if it runs, permission and switch are both proven. The card also prints what Android reports (Termux version, API level, declared / listed / granted / tested) so the next report is diagnosable.
