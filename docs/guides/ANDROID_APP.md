# Android app (beta)

The Android app is Curator in a full-screen window with a proper media player: notification and lock-screen controls, Bluetooth and car buttons, and Android Auto. **It is a beta**: expect rough edges and please report them.

## Install
1. Open the newest [release](https://github.com/TurboNZL/Curator/releases/latest) on your phone and download `music-curator-<version>-android-beta.apk`.
2. Open it. Android asks once to allow "install unknown apps" for your browser; allow it.
3. In **Settings → Server** enter your server's address and token (or use *Pair a device* on a connected device to make a code), then *Save & sync*.

## Updates
The app checks the newest release when opened (at most every six hours). **Settings → This app** shows the result; *Install update* opens Android's installer. Updates keep your data because every build is signed with the same key.

## Android Auto
Android Auto only shows apps that are media players, which this one is. If Android Auto does not list it: Android Auto settings → tap *Version* ten times → developer settings → enable *Unknown sources*.

## Offline
Use **Keep offline** on an album or playlist to store the audio on the phone. **Settings → Playback & storage** can limit how much.

## If it stops syncing
Open **Settings → Server → Test connection**. A wrong token, a changed address or a server that is turned off all show up there. Updating the server and the app to the same release also fixes mismatches.
