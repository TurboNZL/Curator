import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** The three desktop programs. "server" is the Windows tray server; the Linux headless server does not use Electron. */
export type Edition = 'full' | 'app' | 'server';

/**
 * Electron keeps the settings, the library-folder choice and the window's storage (the web client's working copy) in a folder named
 * after the app's product name. The product name changed from "Music Curator" to "TurboMusic", but an installed app has to keep finding
 * the folder it already has until the person moves it (Settings > This app > Move to the TurboMusic folder, see userDataMigration.ts).
 * Never change the LEGACY names.
 */
export const LEGACY_FOLDER: Record<Edition, string> = { full: 'Music Curator', app: 'Music Curator App', server: 'Music Curator Server' };
export const CURRENT_FOLDER: Record<Edition, string> = { full: 'TurboMusic', app: 'TurboMusic App', server: 'TurboMusic Server' };

export const legacyUserData = (appData: string, edition: Edition): string => join(appData, LEGACY_FOLDER[edition]);
export const currentUserData = (appData: string, edition: Edition): string => join(appData, CURRENT_FOLDER[edition]);

/** A folder that exists and holds something (Electron may leave an empty one behind; that is not a settings folder). */
export function hasContent(path: string): boolean {
  try { return readdirSync(path).length > 0; } catch { return false; }
}

/**
 * Which folder the app uses: the new one once it holds something, else the old one while it is there (the move has not happened),
 * else a new one (a fresh install). `legacy` says the old folder is the one in use, i.e. a move is still possible.
 */
export function chooseUserData(appData: string, edition: Edition, content: (p: string) => boolean = hasContent, exists: (p: string) => boolean = existsSync): { path: string; legacy: boolean } {
  const current = currentUserData(appData, edition), legacy = legacyUserData(appData, edition);
  if (content(current)) return { path: current, legacy: false };
  if (exists(legacy)) return { path: legacy, legacy: true };
  return { path: current, legacy: false };
}
