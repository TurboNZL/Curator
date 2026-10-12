# Music Curator Server for Windows

The same library server the Raspberry Pi runs, as a Windows program that lives in the system tray (the icons by the clock). It has no window while it works and idles at a small amount of memory and almost no processor use: the graphics card is switched off, and the only thing drawn is the setup wizard, when you open it.

## Install

1. Download `music-curator-server-<version>-windows-x64-setup.exe` from the newest [release](https://github.com/TurboNZL/Curator/releases) and run it. Windows may say "Windows protected your PC" because the installer is not signed: choose **More info → Run anyway**.
2. The setup wizard opens by itself. It takes about five minutes (below). Reopen it any time: right-click the tray icon → **Setup and settings…**
3. Updates arrive by themselves (tray → *Check for updates*; the server restarts into the new version).

## The wizard, step by step

| Step | What it asks | Notes |
|---|---|---|
| **Folders** | Four folders: *database and settings*, *music and pictures*, *downloads in progress*, *download cache* | Put the database on a fast drive and the music on your biggest drive. The folders you leave alone stay inside the database folder. Choose empty folders. Moving a folder later copies your files first. (Windows folder links ("junctions") do this; no administrator rights are needed.) |
| **Network** | *Other devices on my home network* (on by default), the port (47813) | The first time it starts, Windows asks about its firewall: tick **Private networks** and **Allow access**, or other devices cannot reach it. |
| **YouTube tools** | Download yt-dlp, ffmpeg and Deno | Only needed to add songs from YouTube links. They are fetched from their own GitHub releases into the `tools` folder (nothing is installed system-wide) and are found by the server automatically. Press the button again later for newer versions: YouTube changes often. |
| **Spotify** | Nothing to set here: it explains the options | See below. |
| **Away from home** | Optional Cloudflare tunnel | See below. |
| **Finish** | *Start with Windows*, then **Install and start the server** | It then shows the addresses and the access token, and opens Curator in the browser. |

The tray menu has: open Curator, copy the address, copy the access token, show the library folder, setup, update, start with Windows, quit.

Connect a phone or another computer: open the server's address (for example `http://192.168.1.20:47813`) in its browser, or enter it in the Android app under **Settings → Library & server**, with the access token. Easiest: in Curator, **Settings → Library & server → Pair a device** makes a link or code that sets a device up in one go.

## Spotify, in plain words

Every option needs **Spotify Premium**, and you sign in once inside Curator under **Settings → Spotify**.

1. **Use the Spotify app you already have (the easiest; start here).** Curator becomes a remote control for Spotify on your phone, computer, smart speaker or TV. You press play in Curator and the song comes out of that device. Nothing to install on the server. The catch: the sound comes from the Spotify device, so Curator's equaliser and offline mode do not apply to those songs.
2. **Play it inside Curator itself.** In the Curator web page or desktop app a speaker called "Curator" appears and Spotify songs play right there, in the same queue as your own files. It needs a modern browser and a *secure (https)* address: a plain `http://192.168…` home address is not secure, so use it on the server computer itself (`localhost`) or through the Cloudflare tunnel below. It does not work in the Android app.
3. **A Spotify speaker run by the server (Raspberry Pi only).** Spotify's small player ("Soloist") only exists for Linux, so a Windows server cannot do this. A Raspberry Pi can ([DEPLOY_PI.md](DEPLOY_PI.md), [SPOTIFY.md](SPOTIFY.md)).

## Reaching your music away from home (optional Cloudflare tunnel)

By default only devices on your home network can connect. A Cloudflare Tunnel lets you reach the server from anywhere without opening anything on your router: the computer makes an *outgoing* connection to Cloudflare, which gives you a normal `https://` address. It is free, needs a domain you own (a few dollars a year) and also makes Spotify option 2 work.

1. Make a free Cloudflare account and add your domain to it.
2. In the dashboard: **Zero Trust → Networks → Tunnels → Create a tunnel → Cloudflared**, name it.
3. On the next page choose **Windows**. It shows a long command: copy **only the long token** (the text after `--token` or `install`) and paste it into the wizard. Do not run that command yourself; the server runs the tunnel (it downloads `cloudflared` for you and restarts it if it stops).
4. In the tunnel's **Public hostname** tab add `music.yourdomain.com` with the service **HTTP** and the URL `localhost:47813` (your port).
5. Finish the wizard (**Apply and restart**). After a minute the wizard and the tray say the tunnel is connected, and `https://music.yourdomain.com` opens your server.

The access token still protects everything: the tunnel only makes the server reachable. Do not put Cloudflare Access in front of the whole address unless you also give the apps its service token (Curator's Settings has the fields; see the guides there).

## For developers

- Code: `apps/electron/src/serverEdition/` (`main.ts` tray + wizard IPC, `setup.html` the wizard, `serverConfig.ts`, `tools.ts` downloads, `tunnel.ts` the `cloudflared` runner). It runs the same `startServer` as the Pi and the desktop app, with the web client served from the same process.
- Run it: `pnpm --filter @curator/electron start:server` (after `pnpm --filter @curator/web build`). Settings live in `server-edition.json` in the app's user-data folder.
- Build the installer on Windows: `pnpm --filter @curator/electron dist:server`. `electron-builder.server.json` gives it its own app id, name and update feed (`server.yml`), apart from the desktop app's `latest.yml`. The release workflow builds it on `windows-latest`.
- Tested: the settings, address listing, folder planning, tool table and `cloudflared` output parsing (`test/serverEdition.test.ts`) and the wizard page in Chromium with a stub bridge. **Not run on a real Windows machine** (no Windows or Electron binary in the sandbox): the tray, the folder junctions, the downloads and the tunnel are untested there.
