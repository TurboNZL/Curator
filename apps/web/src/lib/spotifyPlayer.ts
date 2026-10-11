import { create } from 'zustand';
import { api, useStore } from './store.ts';
import type { SpotifyPlayerInfo } from './api.ts';
import { spotifyTrackId } from './spotify.ts';

/**
 * Plays tracks that have a Spotify link but no audio file by telling a Spotify Connect device (Soloist on the Pi, the phone's Spotify app,
 * the PC app) what to play, through the server's Spotify account (server/src/spotify.ts). Spotify keeps the audio: Curator cannot equalise it,
 * keep it offline or put it on the Android notification; Curator's own queue and playback rules still decide what comes next, because a
 * track is sent on its own and the next one is sent when it ends. The player (lib/player.ts) treats it as a third engine next to the
 * page's <audio> and the Android app's player.
 */
interface LinkState { signedIn: boolean | null; error: string | null; lastState: SpotifyPlayerInfo | null }
export const useSpotifyLink = create<LinkState>(() => ({ signedIn: null, error: null, lastState: null }));

export const spotifyUriOf = (t: { spotifyUrl?: string | null }): string | null => { const id = spotifyTrackId(t.spotifyUrl); return id ? `spotify:track:${id}` : null; };

export async function refreshSpotifyStatus(): Promise<boolean> {
  if (!useStore.getState().settings.token) { useSpotifyLink.setState({ signedIn: false }); return false; }
  try { const s = await api().spotifyStatus(); useSpotifyLink.setState({ signedIn: s.signedIn }); return s.signedIn; }
  catch { useSpotifyLink.setState({ signedIn: false }); return false; }
}

/** Something the player can start: an audio file, or a Spotify link that Spotify can play. */
export const canPlay = (t: { file?: string | null; spotifyUrl?: string | null } | undefined | null): boolean => !!t && (!!t.file || spotifyCan(t));

/** Can this track be played through Spotify right now? (account signed in on the server, a device chosen on this device, the setting on) */
export function spotifyCan(t: { file?: string | null; spotifyUrl?: string | null } | undefined | null): boolean {
  if (!t || t.file) return false;
  const s = useStore.getState().settings;
  return !!(s.spotifyAuto && s.spotifyDeviceId && useSpotifyLink.getState().signedIn && spotifyUriOf(t));
}

type Report = { playing: boolean; timeMs: number; durationMs: number; ended: boolean };
let uri: string | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
let onReport: (r: Report) => void = () => {};
let lastProgress = 0, lastDuration = 0, lastAt = 0, playingNow = false, startedAt = 0;

const device = () => useStore.getState().settings.spotifyDeviceId;
const fail = (e: unknown) => useSpotifyLink.setState({ error: (e as Error).message });

async function poll() {
  if (!uri) return;
  try {
    const st = await api().spotifyPlayerState();
    const s = st.state;
    useSpotifyLink.setState({ lastState: s, error: null });
    const mine = s?.track?.uri === uri;
    if (mine && s) {
      lastProgress = s.progressMs; lastDuration = s.track!.durationMs; lastAt = Date.now(); playingNow = s.playing;
      onReport({ playing: s.playing, timeMs: s.progressMs, durationMs: lastDuration, ended: false });
    } else if (Date.now() - startedAt > 6000) {
      // another track (or nothing) is playing now: ours finished if it had got to the end, else something else took over
      const finished = lastDuration > 0 && lastProgress >= lastDuration - 6000;
      stopPolling(); uri = null;
      onReport({ playing: false, timeMs: 0, durationMs: 0, ended: finished });
    }
  } catch (e) { fail(e); }
}
function stopPolling() { if (timer) { clearInterval(timer); timer = undefined; } }

/** between polls the position moves on by the clock */
let tick: ReturnType<typeof setInterval> | undefined;
function startTicking() {
  clearInterval(tick);
  tick = setInterval(() => { if (uri && playingNow) onReport({ playing: true, timeMs: Math.min(lastDuration || Infinity, lastProgress + (Date.now() - lastAt)), durationMs: lastDuration, ended: false }); }, 500);
}

export const spotifyEngine = {
  active: () => uri !== null,
  setListener(f: (r: Report) => void) { onReport = f; },
  async play(trackUri: string, positionMs = 0, start = true): Promise<void> {
    uri = trackUri; lastProgress = positionMs; lastDuration = 0; lastAt = Date.now(); playingNow = start; startedAt = Date.now();
    try {
      await api().spotifyPlay([trackUri], device(), positionMs);
      if (!start) await api().spotifyCommand('pause', device());
      useSpotifyLink.setState({ error: null });
    } catch (e) { uri = null; fail(e); throw e; }
    stopPolling(); timer = setInterval(() => void poll(), 2500); startTicking();
    setTimeout(() => void poll(), 800);
  },
  async pause() { playingNow = false; try { await api().spotifyCommand('pause', device()); } catch (e) { fail(e); } },
  async resume() { playingNow = true; lastAt = Date.now(); try { await api().spotifyCommand('resume', device()); } catch (e) { fail(e); } },
  async seek(ms: number) { lastProgress = ms; lastAt = Date.now(); try { await api().spotifyCommand('seek', device(), ms); } catch (e) { fail(e); } },
  async volume(v: number) { try { await api().spotifyCommand('volume', device(), Math.round(v * 100)); } catch { /* some devices have fixed volume */ } },
  /** leave Spotify alone from now on (another engine takes over); pauses it if Curator started it */
  async release(pause = true) { const was = uri; uri = null; stopPolling(); clearInterval(tick); if (was && pause) { try { await api().spotifyCommand('pause', device()); } catch { /* already stopped */ } } },
};
