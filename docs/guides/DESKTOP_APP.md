# Desktop app (Windows and Linux)

The desktop app is TurboMusic in its own window **with its own server inside it**, so a fresh install works with nothing to set up or connect.

## Which download
Every release has three editions of the desktop software. Pick one; you can add or remove the server part later.

| Edition | File name starts with | What it is |
|---|---|---|
| **Full** | `turbomusic-` | The window and a library server in one app. The simplest choice. |
| **App only** | `turbomusic-app-` | Just the window. Connect it to a server (yours at home, or one run by a *Server* download). In **Settings → This app** you can install the **server module** into it later, and remove it again. |
| **Server only** | `turbomusic-server-` | No window: Windows gets a tray app with a setup wizard; Linux gets a service ([server on Linux](DEPLOY_PI.md)). |

The Linux `.deb` (Debian, Ubuntu, Kubuntu) and the `.AppImage` (any distribution) each come in all three editions.

## Install
Download the installer for your system from the newest [release](https://github.com/TurboNZL/turbomusic/releases/latest). Names look like `turbomusic-<version>-<os>-<arch>.<ext>`:
- **Windows:** `…-windows-x64-setup.exe`.
- **Linux, Debian/Ubuntu/Kubuntu:** the `.deb` (installs system-wide; double-click it or `sudo apt install ./file.deb`).
- **Linux, any distribution:** the `.AppImage` (make it executable and run it; it needs no root and updates itself).

## Your library
- It lives in a folder; **Settings → This app** shows where and lets you change it (the app restarts, and starts empty in the new folder unless you copy the old folder's contents over first). Put it on a big drive: audio you keep offline is stored there too.
- To use a home server instead, enter its address and token in **Settings → Server**. Then this app syncs with that server, and the built-in one only serves the window. The two libraries are separate, so choose one as home (use **Backup** to move a library).
- Music in: **Add → Add audio files**, or **Import from YouTube** (needs yt-dlp and ffmpeg on the computer: `winget install yt-dlp ffmpeg` on Windows, `sudo apt install ffmpeg yt-dlp` on Debian-based Linux).

## The server module
In the full edition the server module is installed. In the app-only edition it is not, until you press **Settings → This app → Install the server module…**; **Remove the server module…** stops it again, and asks whether to keep or delete the library files. The window's own working copy is kept in both cases.

## Updates
- The app checks for a new version when it starts and every few hours (**Settings → This app → Check for updates**).
- **Windows and AppImage:** the update downloads in the background and installs when you press *Restart to update* or close the app.
- **.deb:** installing a package needs your administrator password. The app opens a terminal window that asks for it. If that cannot work on your system it shows a command to run yourself (`sudo apt install /path/to/file.deb`). The AppImage never needs a password.

## Window and graphics
- **Settings → This app → Graphics start-up** chooses how the window is painted. "Automatic" tries several ways on its own and remembers the first that gives hardware acceleration. The line above it says what you got.
- Optional theme-drawn window buttons and Discord status are in the same tab ([Discord status](DISCORD.md)).
- Sound keeps playing in the background, and media keys work.

## If something looks wrong
- **"Software rendering"** on a computer with a graphics card: press *Copy graphics report* and look at `features`; if WebGL and OpenGL say enabled, the picture is hardware-accelerated even when the headline says otherwise.
- **Two icons in the launcher (Wayland):** remove stale copies in `~/.local/share/applications/` and reinstall.
