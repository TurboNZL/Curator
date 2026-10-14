# Discord: show what you are playing

The desktop app can show the song you are playing on your Discord profile, as **"Listening to <name>"** with the title, the artist, the app's logo and a progress bar. Pause and it says *Paused*. Only the **desktop app** does this (a browser or the phone cannot talk to Discord's desktop program), and **Discord's desktop app has to be running on the same computer**.

## Quick path (if your build already has a Discord application)
1. Open the desktop app → **Settings → This app → Discord**.
2. Tick **Show what I'm playing on Discord**. The line under it says what is happening:
   - *Waiting for Discord to be running…*: start Discord. It connects by itself within about 20 seconds.
   - *Connected*: play something; your profile updates within a few seconds.
3. In Discord: **User Settings → Activity Privacy** (under Activity Settings) → turn on **Share your detected activities with others** (the wording differs slightly between Discord versions). Without it, nobody sees anything, including you.

If the Discord card says *Not set up: this build has no Discord application*, make your own in the next section. It takes two minutes and is free.

## Make your own Discord application (the one time setup)
Discord only lets a program show a status **under the name of a Discord application**, so there is always one behind the scenes. Its name is what appears after "Listening to".

1. Go to **https://discord.com/developers/applications** and log in.
2. **New Application** → name it (for example `TurboMusic`, or your own name for it) → accept the terms → **Create**.
3. On **General Information**, copy the **Application ID** (a long number). It is not a secret.
4. *(Optional, for the picture.)* **Rich Presence → Art Assets → Add Image(s)**: upload a square image (at least 512×512; `apps/web/public/icon-512.png` in the repository is the app's icon) and name it exactly **`logo`** (lower case). It can take a few minutes before Discord shows it.
5. In the app: **Settings → This app → Discord → "Use my own Discord application"**, paste the Application ID, and make sure the box above is ticked.

## Rate limit and what the app tells you
Discord accepts a few activity updates per 20 seconds, so the app sends at most one every 4 seconds (the newest state wins); skipping through tracks quickly shows the last one a moment later. While it cannot connect, **Settings > This app > Discord** says why in a sentence: either no `discord-ipc` socket exists in the folders it looked in (Discord is not running, or it is a sandboxed Flatpak/Snap one), or it found one and could not talk to it.

## It does not show up
Work down this list; each step rules out one cause.
1. Is Discord's **desktop** app running (not just discord.com in a browser), and are you logged in on it?
2. Settings → This app → Discord says **Connected**? If it says *Waiting for Discord*, the program cannot find Discord (steps 4 and 5).
3. Discord → **Activity Privacy → Share your detected activities** is on. Also check **Settings → Connections / Registered Games** do not hide it, and that you are not set to *Invisible* (invisible hides activities).
4. **Only one Discord program** should run. A second client (Vesktop, a browser tab with another login) can take the connection.
5. **Flatpak or Snap Discord on Linux** runs in a sandbox, so the program cannot see its socket:
   - *Flatpak:* the socket is under `$XDG_RUNTIME_DIR/app/com.discordapp.Discord/`. Link it to where programs look: `ln -sf $XDG_RUNTIME_DIR/app/com.discordapp.Discord/discord-ipc-0 $XDG_RUNTIME_DIR/discord-ipc-0` (it has to be repeated after a reboot; a `tmpfiles.d` entry makes it permanent), and give Discord access to that folder with Flatseal (*Filesystem → `xdg-run/app/com.discordapp.Discord`*).
   - *Snap:* the sandbox blocks it. Use the Discord `.deb` or your distribution's package instead.
   These steps follow what other Rich Presence programs report; they have not been tried with TurboMusic.
6. Image missing but text fine: the art asset must be named `logo` and can take up to ten minutes to appear.
7. Still nothing: close the app, start Discord first, then the app, and look at the terminal the app was started from for lines starting `[turbomusic]`.

## What is sent
The title, artist, album name (as the picture's hover text), the position and the length of the playing track, and the Application ID. Nothing else, and nothing leaves your computer except to your own Discord. Turn it off with the same box; the status disappears at once.
