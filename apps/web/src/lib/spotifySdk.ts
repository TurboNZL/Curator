import { create } from 'zustand';
import { api, useStore } from './store.ts';
import { desktop } from './settings.ts';
import { isAndroidApp } from './native.ts';
import { guessDeviceName } from './connectPure.ts';
import { refreshSpotifyStatus } from './spotifyPlayer.ts';

/**
 * Spotify inside the page: Spotify's own Web Playback SDK turns this browser (or the desktop app) into a Spotify Connect device that
 * decodes and plays the audio itself. It then appears in Spotify's device list like Soloist or a phone, and the existing Spotify engine
 * (lib/spotifyPlayer.ts) sends it tracks through the server's account, so TurboMusic's queue and rules work unchanged. Spotify keeps the
 * audio: no equaliser, no offline copies.
 *
 * Needs Premium, a secure page (https or localhost) and a browser with Widevine, Spotify's DRM (Chrome, Edge, Firefox, Safari and Android
 * Chrome have it; Electron does not out of the box). The Android app has no Widevine at all, so it never offers or starts this: there
 * Spotify plays through Soloist on the server (or the Spotify app) instead.
 */
export type SdkStatus = 'off' | 'checking' | 'loading' | 'ready' | 'unsupported' | 'error';
interface SdkState { status: SdkStatus; error: string | null; deviceId: string | null }
export const useSpotifySdk = create<SdkState>(() => ({ status: 'off', error: null, deviceId: null }));
const set = useSpotifySdk.setState;

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js';

interface SdkPlayer {
  connect(): Promise<boolean>; disconnect(): void; activateElement(): Promise<void>; setName?(n: string): Promise<void>; setVolume?(v: number): Promise<void>;
  addListener(event: string, cb: (arg: never) => void): boolean;
}
interface SpotifyGlobal { Player: new (o: { name: string; getOAuthToken: (cb: (token: string) => void) => void; volume?: number }) => SdkPlayer }
declare global { interface Window { Spotify?: SpotifyGlobal; onSpotifyWebPlaybackSDKReady?: () => void } }

/** Can this page play Spotify's protected audio? The reason is written for the person using it. */
export async function drmSupport(): Promise<{ ok: boolean; reason: string | null }> {
  if (typeof window === 'undefined') return { ok: false, reason: 'Not in a browser.' };
  if (typeof window !== 'undefined' && (window as unknown as { curatorDesktop?: unknown }).curatorDesktop) return { ok: false, reason: 'The desktop app has no Widevine, so it cannot play Spotify itself. Pick the Spotify app on this computer in the device list.' };
  if (isAndroidApp()) return { ok: false, reason: 'The Android app has no Widevine, so it cannot play Spotify itself. Use Soloist on your server (below), or pick the Spotify app on your phone in the device list.' };
  if (!window.isSecureContext) return { ok: false, reason: 'Spotify’s player only runs on a secure page. Open TurboMusic over https (for example through Tailscale) or on localhost; this address is plain http.' };
  if (typeof navigator.requestMediaKeySystemAccess !== 'function') return { ok: false, reason: 'This browser cannot play protected audio.' };
  try {
    await navigator.requestMediaKeySystemAccess('com.widevine.alpha', [{ initDataTypes: ['cenc'], audioCapabilities: [{ contentType: 'audio/mp4;codecs="mp4a.40.2"', robustness: 'SW_SECURE_CRYPTO' }] }]);
    return { ok: true, reason: null };
  } catch {
    return { ok: false, reason: desktop()
      ? 'The desktop app’s engine (Electron) has no Widevine, so it cannot play Spotify audio itself. On Linux use Soloist (below); otherwise pick the Spotify app on this computer or a phone in the device list.'
      : 'This browser has no Widevine (Spotify’s protected-audio component) or it is switched off. Try Chrome, Edge, Firefox or Safari, and check that protected content is allowed.' };
  }
}

let loading: Promise<SpotifyGlobal> | null = null;
function loadSdk(): Promise<SpotifyGlobal> {
  if (window.Spotify) return Promise.resolve(window.Spotify);
  loading ??= new Promise<SpotifyGlobal>((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = () => resolve(window.Spotify!);
    const s = document.createElement('script');
    s.src = SDK_URL; s.async = true;
    s.onerror = () => { loading = null; reject(new Error('Could not load Spotify’s player from sdk.scdn.co (offline, or blocked).')); };
    document.head.appendChild(s);
  });
  return loading;
}

let player: SdkPlayer | null = null;
let gestureBound = false;
const deviceName = () => `${useStore.getState().settings.deviceName.trim() || guessDeviceName(navigator.userAgent, !!desktop())} (TurboMusic)`;

/** Browsers only let a page start sound after a tap; the SDK wants to be told about one (Safari and phones). */
function bindGesture() {
  if (gestureBound) return; gestureBound = true;
  const once = () => { void player?.activateElement().catch(() => undefined); document.removeEventListener('pointerdown', once); gestureBound = false; };
  document.addEventListener('pointerdown', once, { once: true });
}

export async function startSpotifySdk(): Promise<void> {
  if (player) return;
  set({ status: 'checking', error: null });
  const drm = await drmSupport();
  if (!drm.ok) { set({ status: 'unsupported', error: drm.reason }); return; }
  if (!useStore.getState().settings.token) { set({ status: 'error', error: 'Connect to your server first.' }); return; }
  if (!(await refreshSpotifyStatus())) { set({ status: 'error', error: 'Sign in to Spotify first (above).' }); return; }
  set({ status: 'loading' });
  try {
    const Spotify = await loadSdk();
    const name = deviceName();
    const p = new Spotify.Player({
      name, volume: Number(localStorage.getItem('curator.volume') ?? 0.8),
      getOAuthToken: (cb) => { api().spotifySdkToken().then((t) => cb(t.token), (e: Error) => set({ status: 'error', error: e.message })); },
    });
    p.addListener('ready', ((e: { device_id: string }) => {
      set({ status: 'ready', error: null, deviceId: e.device_id });
      useStore.getState().updateSettings({ spotifyDeviceId: e.device_id, spotifyDeviceName: name }); // this app plays Spotify now
    }) as (a: never) => void);
    p.addListener('not_ready', (() => set({ status: 'loading' })) as (a: never) => void);
    p.addListener('initialization_error', ((e: { message: string }) => set({ status: 'unsupported', error: `This browser cannot start Spotify’s player (${e.message}).` })) as (a: never) => void);
    p.addListener('authentication_error', ((e: { message: string }) => set({ status: 'error', error: `Spotify refused the sign-in (${e.message}). Sign out of Spotify in Settings and sign in again.` })) as (a: never) => void);
    p.addListener('account_error', (() => set({ status: 'error', error: 'Spotify says this account cannot play here: playing in the app needs Spotify Premium.' })) as (a: never) => void);
    p.addListener('playback_error', ((e: { message: string }) => set({ error: `Spotify could not play that (${e.message}).` })) as (a: never) => void);
    p.addListener('autoplay_failed', (() => set({ error: 'The browser blocked starting by itself: tap anywhere on the page, then press play.' })) as (a: never) => void);
    player = p;
    bindGesture();
    if (!(await p.connect())) { player = null; set({ status: 'error', error: 'Spotify’s player could not connect. Check the sign-in and Premium.' }); }
  } catch (e) { player = null; set({ status: 'error', error: (e as Error).message }); }
}

export function stopSpotifySdk(): void {
  const id = useSpotifySdk.getState().deviceId;
  try { player?.disconnect(); } catch { /* already gone */ }
  player = null;
  const st = useStore.getState();
  if (id && st.settings.spotifyDeviceId === id) st.updateSettings({ spotifyDeviceId: '', spotifyDeviceName: '' });
  set({ status: 'off', error: null, deviceId: null });
}

/** Called once at start-up: bring the in-app player back when it was switched on. */
export function startSpotifySdkIfWanted(): void { const s = useStore.getState().settings; if (s.spotifySdk && s.token && !isAndroidApp()) void startSpotifySdk(); }
