import { newId } from '@curator/core';

/** Per-device settings (never synced): where the server is, who we are, how it looks. */
export interface DeviceSettings {
  deviceId: string;
  /** '' = same origin (dev proxy, or the server serving this app) */
  serverUrl: string;
  token: string;
  theme: string;
  accent: string | null;
  /** soft cap for locally cached audio, in MB (browser storage is limited) */
  storageLimitMb: number;
}

const KEY = 'curator.settings';

export function loadSettings(): DeviceSettings {
  let saved: Partial<DeviceSettings> = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { /* storage blocked */ }
  const s: DeviceSettings = {
    deviceId: newId(), serverUrl: '', token: '', theme: 'default', accent: null, storageLimitMb: 2048, ...saved,
  };
  saveSettings(s);
  return s;
}

export function saveSettings(s: DeviceSettings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked */ }
}
