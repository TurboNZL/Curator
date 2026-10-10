# Spotify: feasibility (researched 2026-10-10, nothing built)

The question: could Curator (1) play tracks that are not on the server through Spotify, (2) control Spotify, and (3) use Spotify for recommendations? Short answer: **(2) and a limited (1) are feasible for one Premium user; (3) is not, with Spotify's own API.** Sources were web searches; Spotify's developer site itself could not be fetched from the sandbox, so each point below is marked with how well it is confirmed. Re-read the linked pages before building anything.

## What is available

| Option | What it gives | Fit |
|---|---|---|
| **Spotify Soloist** ([announcement](https://developer.spotify.com/blog/2026-08-13-introducing-spotify-soloist), [docs](https://developer.spotify.com/documentation/soloist), [GitHub](https://github.com/spotify/soloist)) | An official headless Spotify Connect client for Linux/Raspberry Pi. It shows up as a normal device in the Spotify apps. Optional local **WebSocket API** (`--ws ADDR:PORT`): JSON text frames with `"type": "command"` (play, pause, seek, volume, shuffle, repeat, add to queue, `get_queue`), plus playback events. | **Best fit.** The Pi that already runs the Curator server can run it, and the server can bridge it to every client. |
| **Web API** ([Feb 2026 migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)) | Search, library, playlists, and "transfer playback / play this URI on that device" for a Premium account. | Works for control and for finding a Spotify match of a Curator track. Heavily restricted (below). |
| **Web Playback SDK** | Turns a browser tab into a Spotify Connect device (Premium only). | Works only in a browser; not in the Android WebView app (needs Widevine/EME and Spotify does not support WebViews) and not for Android Auto. Not verified here: the SDK pages did not come up in search. |
| **Android App Remote SDK** | Controls the installed Spotify app from your app. | Remote control only: the Spotify app plays, Curator cannot get the audio or put it through its own queue/EQ. |

## Constraints that decide it

- **Premium is required** for the Web API in Development Mode, the app owner's Premium must stay active, and Development Mode is limited to **5 users and 1 client ID** per developer (official migration guide; applies to new apps from 2026-02-11 and to existing ones from 2026-03-09). That is fine for a personal app, not for sharing it.
- **Extended access** (more users) is reserved for established organisations; third-party sources say about 250k monthly users. Not an option here.
- **Recommendations are not coming back.** The *Get Recommendations*, *Audio Features*, *Audio Analysis* and *Related Artists* endpoints were closed to apps that did not already have extended access on 2024-11-27 (reported by several third-party write-ups; Spotify's changelog excerpts retrievable here did not list them, so treat as likely, not certain). A new personal app should assume it has none of them.
- **Soloist** needs an API key generated at Spotify for Developers by a Premium account (keys are personal and must not be shared or put in client-side code, and are needed at every start). Its WebSocket API has **no authentication or TLS**, so it must stay on localhost or the home network; the Curator server would proxy it with its own token. The queue it reports is capped (a third-party blog says 80 tracks; unconfirmed).
- Spotify content cannot be downloaded, cached, equalised by us or mixed into Curator's own queue as audio: Spotify plays it, Curator only sends commands. So the equaliser, the app's own player and offline mode do not apply to Spotify tracks.

## What could be built, in order of value

1. **Play on Spotify when a track has no file.** A track has `spotifyUrl` (443 of 444 in the migrated library do). With Soloist (or any Connect device) Curator can send "play this URI". Needs: server module `spotify.ts` holding the OAuth refresh token (Authorization Code with PKCE; Web API `PUT /me/player/play` with the Soloist device id) or a direct Soloist WebSocket connection; a "Spotify" source in the player that is remote-controlled like the existing Connect devices (the Connect hub already has the shape: a device with state, commands, hand-over). Queue rules ("play B right after A") could be honoured by sending the next URI when the first ends.
2. **Show and control Spotify from Curator** (now playing, pause/skip, volume): free once (1) exists, via Soloist events.
3. **Recommendations without Spotify's endpoint:** build them from Curator's own data (votes and ratings already give a taste profile) plus another source: MusicBrainz/ListenBrainz (open, has similar-artist and recommendation APIs) or Last.fm `artist.getSimilar`. Spotify would only be used to *play* what these suggest, via Search. This is the realistic route and does not depend on Spotify's policy.

## Risks and open questions

- Spotify has repeatedly narrowed its API (2024-11, 2025-04, 2026-02). Anything depending on Development Mode can change under us.
- Soloist is new (announced 2026-08-13); its stability on a Pi, gapless behaviour and the 80-track queue figure are unverified. Nobody has run it here.
- Terms of use for apps that mix Spotify playback with non-Spotify sources: not found in search, read the Developer Terms before shipping anything public. For private use it is a personal app on a personal key.
- Android Auto/notification controls would show Spotify's own session, not Curator's, when Spotify is the source.

## Suggested next step

Run Soloist on the Pi with `--ws 127.0.0.1:PORT`, and try one `play` command by hand from `soloist ctl` or a WebSocket client. If that works, a first version (play a Spotify URI for a file-less track, show state) is a small server module plus one more device kind in the Connect list.
