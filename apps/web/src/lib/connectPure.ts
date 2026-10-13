import type { DeviceInfo } from '@curator/core';

/** A readable guess ("Firefox on Linux") for a device the user has not named. */
export function guessDeviceName(ua: string, isDesktop = false): string {
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac OS X|Macintosh/i.test(ua) ? 'macOS' : /CrOS/i.test(ua) ? 'ChromeOS' : /Linux/i.test(ua) ? 'Linux' : 'this device';
  const app = isDesktop || /Electron\//i.test(ua) ? 'TurboMusic desktop' : /Edg\//i.test(ua) ? 'Edge' : /OPR\//i.test(ua) ? 'Opera' : /Firefox\//i.test(ua) ? 'Firefox' : /Chrome\//i.test(ua) ? 'Chrome' : /Safari\//i.test(ua) ? 'Safari' : 'Browser';
  return `${app} on ${os}`;
}

/** Where a reported snapshot is now: a playing device's position keeps moving after its report. */
export function positionNow(d: DeviceInfo, receivedAt: Record<string, number>, now = Date.now()): number {
  const s = d.state;
  if (!s) return 0;
  const t = s.position + (s.playing ? (now - (receivedAt[d.id] ?? now)) / 1000 : 0);
  return s.duration > 0 ? Math.min(t, s.duration) : t;
}

