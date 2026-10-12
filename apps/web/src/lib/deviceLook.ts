import type { UiStyleId } from './uiStyle.ts';
import type { ThemeId } from './theme.ts';

/** What the page can tell about the device it runs on. `desktopEnv` is the Linux desktop (XDG_CURRENT_DESKTOP), known only to the desktop app. */
export interface DeviceInfo { ua: string; platform?: string; touchPoints?: number; desktopEnv?: string }

export interface DeviceLook { ui: UiStyleId; light: ThemeId; dark: ThemeId; name: string }

/**
 * The look that matches the device: the "Match this device" setting resolves to this. Browsers only reveal the operating system, so
 * Windows is assumed to be Windows 11 and macOS the flat Big Sur-to-Sequoia look; the desktop app also knows the Linux desktop.
 * Pure, so it can be tested.
 */
export function detectLook(d: DeviceInfo): DeviceLook {
  const ua = d.ua ?? '', platform = d.platform ?? '', env = (d.desktopEnv ?? '').toLowerCase();
  const iPadOnMac = /Mac/i.test(platform) && (d.touchPoints ?? 0) > 1; // iPadOS asks for the desktop site and calls itself a Mac
  if (/iPhone|iPad|iPod/i.test(ua) || iPadOnMac) return { ui: 'macos', light: 'ios', dark: 'ios-dark', name: 'iOS' };
  if (/Android/i.test(ua)) return /SM-|SAMSUNG|Galaxy/i.test(ua) ? { ui: 'oneui', light: 'oneui', dark: 'oneui-dark', name: 'Samsung One UI' } : { ui: 'material', light: 'material', dark: 'material-dark', name: 'Material You' };
  if (/CrOS/i.test(ua)) return { ui: 'material', light: 'material', dark: 'material-dark', name: 'ChromeOS (Material)' };
  if (/Windows/i.test(ua) || /^Win/i.test(platform)) return { ui: 'win11', light: 'win11', dark: 'win11-dark', name: 'Windows 11' };
  if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) return { ui: 'macos', light: 'macos', dark: 'macos-dark', name: 'macOS' };
  if (/Linux|X11/i.test(ua) || /Linux/i.test(platform)) {
    if (env.includes('kde') || env.includes('plasma')) return { ui: 'breeze', light: 'breeze', dark: 'breeze-dark', name: 'KDE Breeze' };
    if (env.includes('ubuntu')) return { ui: 'yaru', light: 'yaru', dark: 'yaru-dark', name: 'Yaru (Ubuntu)' };
    return { ui: 'gtk4', light: 'adwaita', dark: 'adwaita-dark', name: 'GNOME (Adwaita)' };
  }
  return { ui: 'default', light: 'light', dark: 'default', name: 'Standard v2' };
}

let cached: DeviceLook | null = null;

/** The look of the device this page runs on (computed once). */
export function deviceLook(): DeviceLook {
  if (cached) return cached;
  if (typeof navigator === 'undefined') return detectLook({ ua: '' });
  const desktop = (window as unknown as { curatorDesktop?: { desktopEnv?: string } }).curatorDesktop;
  cached = detectLook({ ua: navigator.userAgent, platform: navigator.platform, touchPoints: navigator.maxTouchPoints, desktopEnv: desktop?.desktopEnv });
  return cached;
}

const prefersDark = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;

/** Resolves "auto" in the UI style setting to a real style. */
export const effectiveUi = (ui: string): string => (ui === 'auto' ? deviceLook().ui : ui);
/** Resolves "auto" in the colour theme setting to a real theme (light or dark by the device's setting). */
export const effectiveTheme = (theme: string): string => { if (theme !== 'auto') return theme; const l = deviceLook(); return prefersDark() ? l.dark : l.light; };
