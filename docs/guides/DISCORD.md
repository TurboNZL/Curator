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

## Using Discord in a browser or as an installed web app (PWA)
A browser tab, and Discord's "install as app" window, cannot talk to a program on your computer, so on their own they never show a status. The fix is **arRPC**, a small background program that pretends to be Discord's desktop app: TurboMusic talks to arRPC exactly as it would to Discord, and arRPC hands the status to the Discord web page through a **browser add-on or plugin** that is connected to it. So there are always three parts, and all three must be up:

```
TurboMusic desktop app  ->  arRPC (a program on your computer)  ->  add-on in the browser  ->  your Discord web page
```
This was checked here up to the middle: arRPC 3.6.0 was started, the same Discord library TurboMusic uses connected to its socket, and the status arrived on arRPC's bridge (`ws://127.0.0.1:1337`). The last hop (the add-on inside a real Discord page) could not be run from the sandbox.

**Easiest:** use **Vesktop** or **Legcord** instead of the browser. They have arRPC built in (turn it on in their settings), no daemon, no add-on.

**For the browser or PWA:**
1. **Run arRPC** (needs Node 18 or newer) in a terminal and leave it open: `npx arrpc`. It prints three lines: `bridge listening on 1337`, `ipc listening at …/discord-ipc-0` and `websocket listening on 6463`. If those lines are not there, nothing else can work.
2. **Real Discord desktop must not be running.** Two programs cannot both be Discord. (If it is, arRPC takes `discord-ipc-1` instead and TurboMusic talks to the real Discord, so the web page sees nothing.)
3. **Connect the web page to arRPC.** Either:
   - **Vencord** (browser extension or userscript from vencord.dev): Settings → Vencord → Plugins → enable **WebRichPresence (arRPC)**. It connects to `ws://127.0.0.1:1337`. It tries once, shows "Failed to connect to arRPC, is it running?" with a Retry button if the server was not up, and **never reconnects by itself**: if you restart arRPC, reload the Discord page.
   - or, with no add-on, open Discord's web page → DevTools (Ctrl+Shift+I) → Console, and paste the contents of `examples/bridge_mod.js` from the arRPC repository (it has to be done again after every page reload, and Discord's page rules can block it).
4. In TurboMusic: Settings → This app → Discord → tick the box and paste your Application ID (above). Play a song. The Settings line should say **Connected** (that is arRPC answering).
5. Discord → User Settings → Activity Privacy → **Share your detected activities** on (without it nobody sees anything).

**When "the extension and daemon" did not work, check in this order:**
- **Is arRPC really listening?** Run `curl -i http://127.0.0.1:1337` while it runs: a reply (even an error page) means yes, "connection refused" means no. Windows: `netstat -ano | findstr 1337`.
- **Does TurboMusic see it?** The Discord line in Settings must say Connected. If not, arRPC's socket is missing: on Linux it is `$XDG_RUNTIME_DIR/discord-ipc-N` (or `/tmp`), on Windows the pipe `\\?\pipe\discord-ipc-N`. Start arRPC from the same user account as TurboMusic.
- **Did the web page connect?** In the arRPC terminal you should see `bridge web connected` when the plugin starts, and `bridge web disconnected` when you close the tab. Never seeing "web connected" means the add-on cannot reach `127.0.0.1:1337`: a browser may ask for permission to reach devices on your local network (Chrome 142 and newer do, for the site) and a "Block" answer silently breaks it; privacy add-ons, VPN "block local network" options and Safari can also stop it. Also look at the page's DevTools console for a blocked-connection message.
- **A PWA window has its own add-on state.** Vencord installed in the browser is not necessarily inside the installed-app window (a PWA is its own window and can ignore extensions). Test in a normal tab first; if it works there and not in the PWA window, use the tab, or Vesktop.
- **A second arRPC or a leftover one** (an old terminal) makes the new one take `discord-ipc-1`: close the old one, or kill the process, and start a single arRPC.
- **After a restart of anything, reload the Discord page** (the plugin does not reconnect).
- It says *Connected* but the status is missing: privacy setting (step 5), or you are looking at a different Discord login than the page that has the plugin.
- arRPC calls itself experimental. If it misbehaves, the project's issue list is at github.com/OpenAsar/arrpc; the plugin is Vencord's `arRPC.web`.

Sources: the [arRPC README](https://github.com/OpenAsar/arrpc) and Vencord's WebRichPresence (arRPC) plugin source.

## Rate limit and what the app tells you
Discord accepts a few activity updates per 20 seconds, so the app sends at most one every 4 seconds (the newest state wins); skipping through tracks quickly shows the last one a moment later. While it cannot connect, **Settings > This app > Discord** says why in a sentence: either no `discord-ipc` socket exists in the folders it looked in (Discord is not running, or it is a sandboxed Flatpak/Snap one, or you use Discord in a browser and have not set up arRPC: see the browser section above), or it found one and could not talk to it.

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
