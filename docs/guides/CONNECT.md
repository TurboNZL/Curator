# Play on a device (Connect)

Spotify-Connect-style remote control. Every device that has Curator open and uses the same server shows up in the player's device
list (the cast icon in the player bar, and in the top bar when nothing is playing here). From any of them you can:

- **Play here** (pull): what another device is playing moves to this one, same track, same position, same queue; it stops there.
- **Send there** (push): what plays here moves to that device and stops here. This device stays linked as its remote.
- **Play on both**: that device starts the same track and this one keeps playing, with no link: two devices at once.
- **Control**: use this device as the remote of another one without moving anything. The bar says "Playing on <device>".
- **Disconnect**: drop the link. The other device keeps playing and this one is its own player again, so you can start something else here.

Name a device in Settings > This device. Unnamed devices are called after their browser and system ("Firefox on Linux").

## How it works
The server only relays (`packages/server/src/connect.ts`, tests in `packages/server/test/connect.test.ts`); the audio always plays on one device, which
loads it from its own offline copy or from the server. Wire types and validators are in `packages/core/src/connect.ts`, shared by every client.

| Route | |
|---|---|
| `GET /api/connect/stream?device=&name=&kind=` | Server-sent events: `connect` events carry `{type:'devices', devices}` (the list with each device's last reported state) or `{type:'command', from, command}`; a `ping` every 20 s. A device is online while it holds this stream; a dropped one stays listed for 10 s so a reload does not make it vanish. |
| `POST /api/connect/state` `{device, name, state}` | A device reports what it plays (on every change, and every 4 s while playing so others can show the position). |
| `POST /api/connect/command` `{from, to, command}` | `play pause toggle next prev seek volume transfer report`. 404 when the target is offline. |
| `GET /api/connect/devices` | The current list. |

`transfer` carries a full snapshot (`queue`, `source`, `history`, `position`, `volume`); the receiver restores it with `player.restore()` and plays. Everything uses the
normal token (`?token=` on the event stream, because `EventSource` cannot set headers).

## Spotify devices in the same list
The cast button also lists your **Spotify devices** (Soloist on the Pi, the Spotify app on a phone or PC, a speaker) under a *Spotify devices* heading, when the server is signed in to Spotify (Settings → Server → Spotify). They are not Curator devices (they cannot be remote-controlled like one, and Curator's queue and playback rules still decide what comes next): choosing one makes it the place where **Spotify tracks** (tracks with a Spotify link and no audio file) play from this device, and a Spotify track that is already playing moves there. While one plays the player bar says *Playing on <device>*. Details: [SPOTIFY.md](SPOTIFY.md).

## Limits
- A browser tab that was never clicked can refuse to start sound ("Press play: this browser blocked starting by itself"). The desktop app has no such rule.
- The queue of the device being controlled is shown as playing state only; queue editing acts on the device you are on.
- The Android app (not built yet) implements the same three routes natively and is how the car will become a device.
