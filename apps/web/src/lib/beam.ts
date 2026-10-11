import { api, useStore } from './store.ts';
import { nativeAudio, nativeAudioAvailable } from './nativeAudio.ts';

/**
 * Hearing Soloist on this device. Soloist can only play on the machine it runs on (the Pi). With "Send the sound to the apps" on, the
 * server captures Soloist's output and streams it as live MP3 (server/src/beam.ts, `GET /api/soloist/stream`); this plays that stream
 * whenever the Spotify device is that Soloist: in the Android app through the app's own player (notification, lock screen, keeps playing
 * with the screen off), elsewhere in an <audio> element. The stream is live: a few seconds behind Spotify's own clock, and a pause
 * stops it (it starts again on resume, so old buffered sound is never played).
 */
export const BEAM_ID = 'spotify-beam';

let cached: { at: number; enabled: boolean; deviceName: string } | null = null;
async function soloistBeam(): Promise<{ enabled: boolean; deviceName: string }> {
  if (cached && Date.now() - cached.at < 20_000) return cached;
  try { const i = await api().soloist(); cached = { at: Date.now(), enabled: !!i.beam?.enabled && i.running, deviceName: i.deviceName }; }
  catch { cached = { at: Date.now(), enabled: false, deviceName: '' }; }
  return cached;
}
export const forgetBeamInfo = () => { cached = null; };

/** Is the Spotify device of this app the server's Soloist, and is it beaming? */
export async function shouldBeam(): Promise<boolean> {
  const s = useStore.getState().settings;
  if (!s.spotifyBeam || !s.token || !s.spotifyDeviceId) return false;
  const b = await soloistBeam();
  return b.enabled && b.deviceName !== '' && s.spotifyDeviceName === b.deviceName;
}

let mode: 'none' | 'native' | 'audio' = 'none';
let el: HTMLAudioElement | null = null;
let onError: (message: string) => void = () => {};
export const setBeamErrorListener = (f: (message: string) => void) => { onError = f; };

export const beamActive = () => mode !== 'none';

/** Start playing the stream (does nothing when it already plays, or when this device should not beam). */
export async function startBeam(): Promise<boolean> {
  if (mode !== 'none') return true;
  if (!(await shouldBeam())) return false;
  if (mode !== 'none') return true; // started while we checked
  const url = api().beamUrl();
  const volume = Number(localStorage.getItem('curator.volume') ?? 0.8);
  if (nativeAudioAvailable()) {
    mode = 'native';
    // a new key every time: a live stream is never the same bytes twice
    nativeAudio.sync({ currentId: BEAM_ID, positionMs: 0, play: true, hard: true, items: [{ id: BEAM_ID, key: `${BEAM_ID}-${Date.now()}`, url, title: 'Spotify', artist: 'through Curator', album: '' }] });
    nativeAudio.volume(volume);
    return true;
  }
  mode = 'audio';
  el ??= new Audio();
  el.src = url; el.volume = volume;
  el.onerror = () => { if (mode === 'audio') { onError('The sound stream from your server stopped. Check Soloist in Settings > Spotify.'); stopBeam(); } };
  try { await el.play(); }
  catch (e) { mode = 'none'; onError((e as Error)?.name === 'NotAllowedError' ? 'The browser blocked starting the sound by itself: tap anywhere on the page, then press play.' : 'Could not play the sound stream from your server.'); return false; }
  return true;
}

export function stopBeam(): void {
  if (mode === 'native') nativeAudio.stop();
  else if (mode === 'audio' && el) { el.onerror = null; el.pause(); el.removeAttribute('src'); el.load(); }
  mode = 'none';
}

export function setBeamVolume(v: number): void { if (el) el.volume = v; }

/** an error reported by the Android app's player about the stream */
export function beamFailed(message: string): void { if (mode === 'native') { mode = 'none'; onError(`The sound stream from your server could not play (${message}).`); } }
