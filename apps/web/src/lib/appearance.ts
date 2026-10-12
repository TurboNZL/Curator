import type { DeviceSettings } from "./settings.ts";
import { applyTheme } from "./theme.ts";
import { isUiStyle } from "./uiStyle.ts";
import { isLayout } from "./layout.ts";
import { applyWallpaper } from "./wallpaper.ts";
import { syncLiquidGlass } from "./liquidGlass.ts";

/** Applies the whole look (colour theme, accent, UI style, wallpaper) from the device settings. */
export function applyAppearance(s: DeviceSettings) {
  applyTheme(s.theme);
  const root = document.documentElement;
  root.dataset.ui = isUiStyle(s.ui) ? s.ui : "default";
  root.dataset.layout = isLayout(s.layout) ? s.layout : "side";
  root.dataset.glass = s.glass === "clear" ? "clear" : "regular";
  syncLiquidGlass(root.dataset.ui === "liquid");
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
