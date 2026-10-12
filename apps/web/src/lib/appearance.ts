import { githubSource, start, type Appearance, type TurboThemes } from 'turbothemes';
import type { DeviceSettings } from './settings.ts';

/**
 * Colours, UI styles, layouts, wallpaper and the scripted extras all live in the turbothemes package (and its themes repository);
 * this file only starts the engine with what is specific to this app and hands the device settings to it.
 */
let engine: TurboThemes | null = null;

const sourceFor = (s: Pick<DeviceSettings, 'themesToken'>) => githubSource({ token: s.themesToken || undefined });

function ensure(s: DeviceSettings): TurboThemes {
  if (engine) return engine;
  const host = window as unknown as { curatorDesktop?: { desktopEnv?: string }; CuratorAndroid?: unknown };
  engine = start({
    storagePrefix: 'curator', // keeps the keys it always had: curator.wallpaperImage
    fonts: 'none', // the fonts are bundled (src/fonts.css), so styles work offline
    lens: () => !host.CuratorAndroid, // the Android app gets frosted glass without refraction
    host: { desktopEnv: host.curatorDesktop?.desktopEnv },
    autoUpdate: s.themeUpdates,
    source: sourceFor(s),
  });
  return engine;
}

/** Applies the whole look from the device settings. */
export function applyAppearance(s: DeviceSettings) {
  ensure(s).apply(s as Appearance);
}

/** The running engine (start-up, update checks). Only valid after applyAppearance ran once. */
export function themeEngine(s: DeviceSettings): TurboThemes {
  const e = ensure(s);
  e.setSource(s.themeUpdates ? sourceFor(s) : false);
  return e;
}

export { watchSystemTheme } from 'turbothemes';
