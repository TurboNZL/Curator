import type { DeviceSettings } from "./settings.ts";
import { applyTheme } from "./theme.ts";
import { isUiStyle } from "./uiStyle.ts";
import { applyWallpaper } from "./wallpaper.ts";

/** Applies the whole look (colour theme, accent, UI style, wallpaper) from the device settings. */
export function applyAppearance(s: DeviceSettings) {
  applyTheme(s.theme, s.accent);
  document.documentElement.dataset.ui = isUiStyle(s.ui) ? s.ui : "default";
  applyWallpaper(s.theme, { enabled: s.wallpaper, darkness: s.wallpaperDarkness, custom: s.wallpaperCustom });
}

let watching = false;

/** "System" follows the OS, so re-apply when its light/dark preference changes. */
export function watchSystemTheme(get: () => DeviceSettings) {
  if (watching || typeof window === "undefined" || !window.matchMedia) return;
  watching = true;
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (get().theme === "system") applyAppearance(get());
  });
}
