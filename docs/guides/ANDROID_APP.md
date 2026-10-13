# Android app

The Android app is Curator in a full-screen window with a proper media player: notification and lock-screen controls, Bluetooth and car buttons, and Android Auto. The server module below is a beta.

## Install
1. Open the newest [release](https://github.com/TurboNZL/Curator/releases/latest) on your phone and download `music-curator-<version>-android.apk`.
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

## Server module (beta): run the server on the phone
**Settings → This app → Server module** turns the phone into a Curator server for your other devices. It runs inside **Termux**, which the app sets up and controls, so you never type commands except one pasted line, once.

1. **Get Termux** from F-Droid or its GitHub releases (not the Play Store version).
2. **One-time step in Termux:** press *Copy the line*, open Termux, paste it (long-press → Paste), press Enter. This switches on Termux's own "allow other apps to run commands" setting, which can only be changed from inside Termux.
3. **Allow** this app to run commands in Termux (Android asks once).
4. **Install the server.** Termux downloads Node, ffmpeg, yt-dlp and the server (a few minutes). When it says *Running*, press *Use it on this phone*.

After that the app starts the server when it opens (you can turn that off), shows whether it is running, and has Stop, Start, Update/repair and Remove. Your other devices connect to the phone's address on port 47813 with the token the app made (use *Pair a device* in Settings → Server).

Things to know: it uses battery while downloading or converting, and Android may pause Termux when the screen is off unless you tick *Keep the phone awake*. The library lives inside Termux's private storage on the phone. Removing the module keeps the library unless you choose to delete it.
