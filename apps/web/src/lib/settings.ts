import { newId } from '@curator/core';

/** Per-device settings (never synced): where the server is, who we are, how it looks. */
export interface DeviceSettings {
  deviceId: string;
  /** '' = same origin (dev proxy, or the server serving this app) */
  serverUrl: string;
  token: string;
  /** colour theme (see lib/theme.ts) */
  theme: string;
  /** UI style: shape, type and motion (see lib/uiStyle.ts) */
  ui: string;
  accent: string | null;
  /** picture behind the page; the picture itself is kept apart (lib/wallpaper.ts) */
  wallpaper: boolean;
  wallpaperDarkness: number;
  wallpaperCustom: boolean;
  /** soft cap for locally cached audio, in MB (browser storage is limited) */
  storageLimitMb: number;
  /** when the limit is reached, drop the least recently played offline tracks instead of stopping */
  evictOldest: boolean;
}

const KEY = 'curator.settings';

export function loadSettings(): DeviceSettings {
  let saved: Partial<DeviceSettings> = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { /* storage blocked */ }
  const s: DeviceSettings = {
    deviceId: newId(), serverUrl: '', token: '', theme: 'default', ui: 'default', accent: null, wallpaper: false, wallpaperDarkness: 0.45, wallpaperCustom: false, storageLimitMb: 2048, evictOldest: false, ...saved,
  };
  saveSettings(s);
  return s;
}

export function saveSettings(s: DeviceSettings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked */ }
}
