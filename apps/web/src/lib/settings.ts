import { newId } from '@curator/core';
import { cleanBands } from './eqPresets.ts';

/** Per-device settings (never synced): where the server is, who we are, how it looks. */
export interface DeviceSettings {
  deviceId: string;
  /** how this device is listed in Connect; '' = guessed from the browser */
  deviceName: string;
  /** '' = same origin (dev proxy, or the server serving this app) */
  serverUrl: string;
  token: string;
  /** colour theme (see lib/theme.ts) */
  theme: string;
  /** UI style: shape, type and motion (see lib/uiStyle.ts) */
  ui: string;
  /** Liquid Glass variant: Regular adapts to what is behind it, Clear is see-through with a dimming layer */
  glass: 'regular' | 'clear';
  /** picture behind the page; the picture itself is kept apart (lib/wallpaper.ts) */
  wallpaper: boolean;
  wallpaperDarkness: number;
  wallpaperCustom: boolean;
  /** the Storage limiter: off by default. When on, locally cached audio stops at `storageLimitMb` */
  storageLimitOn: boolean;
  /** the size of that cap, in MB */
  storageLimitMb: number;
  /** when the limit is reached, drop the least recently played offline tracks instead of stopping */
  evictOldest: boolean;
  /** equaliser in the player (lib/eq.ts): on/off, bass shelf in dB, ten band gains in dB (lib/eqPresets.ts), overall level in dB */
  eqOn: boolean;
  eqBass: number;
  eqBands: number[];
  eqPreamp: number;
  /** Spotify Connect device this app sends tracks to (id from the account's device list; '' = none) and its name for display */
  spotifyDeviceId: string;
  spotifyDeviceName: string;
  /** play tracks that have a Spotify link but no audio file through Spotify */
  spotifyAuto: boolean;
  /** be a Spotify device in this app (Spotify's Web Playback SDK plays the audio in the page); needs Widevine and a secure page */
  spotifySdk: boolean;
  /** vibration feedback on presses (the Android app and phones that support it) */
  haptics: boolean;
}

const KEY = 'curator.settings';

/** What the Electron desktop app (apps/electron) puts on `window`. Absent in a browser. */
export interface CuratorDesktop {
  token: string; version: string; dataDir: string; platform: string; port: number;
  /** the window's title bar is drawn by the page (a setting of the app, applied at start) */
  customFrame?: boolean;
  windowControl?(action: 'minimize' | 'maximize' | 'close'): void;
  setCustomFrame?(on: boolean): Promise<void>;
  onWindowState?(cb: (maximized: boolean) => void): () => void;
  chooseLibraryFolder(): Promise<string | null>;
  showLibraryFolder(): Promise<void>;
  /** Discord Rich Presence (the app's main process talks to the local Discord client) */
  setPresence(p: { title: string; artist: string; album: string; duration: number; position: number; playing: boolean } | null): void;
  /** what Chromium got for painting: hardware (GPU) or software */
  getGraphics?(): Promise<{ hardware: boolean; summary: string; detail: string }>;
  getDiscord(): Promise<DiscordInfo>;
  setDiscord(patch: { discordEnabled?: boolean; discordClientId?: string }): Promise<DiscordInfo>;
  updates: import('./native.ts').NativeUpdates;
}
export type DiscordInfo = { discordEnabled: boolean; discordClientId: string; builtIn?: boolean; status: 'off' | 'no-id' | 'connecting' | 'connected' };
export const desktop = (): CuratorDesktop | undefined => (typeof window === 'undefined' ? undefined : (window as unknown as { curatorDesktop?: CuratorDesktop }).curatorDesktop);

export function loadSettings(): DeviceSettings {
  let saved: Partial<DeviceSettings> = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { /* storage blocked */ }
  const s: DeviceSettings = {
    deviceId: newId(), deviceName: '', serverUrl: '', token: '', theme: 'default', ui: 'default', glass: 'regular', wallpaper: false, wallpaperDarkness: 0.45, wallpaperCustom: false, storageLimitOn: false, storageLimitMb: 2048, evictOldest: false, eqOn: false, eqBass: 4, eqBands: cleanBands([]), eqPreamp: 0, haptics: true, spotifyDeviceId: '', spotifyDeviceName: '', spotifyAuto: true, spotifySdk: false, ...saved,
  };
  s.eqBands = cleanBands(s.eqBands);
  s.eqPreamp = Math.min(12, Math.max(-12, Number(s.eqPreamp) || 0));
  // the first version's look was called "dyad" for a few builds
  if (s.ui === 'dyad') s.ui = 'toolbar';
  if (s.theme === 'dyad') s.theme = 'zinc';
  // a fresh desktop app is already connected to its own server: no address or token to type
  if (!s.token && desktop()?.token) s.token = desktop()!.token;
  saveSettings(s);
  return s;
}

export function saveSettings(s: DeviceSettings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked */ }
}
