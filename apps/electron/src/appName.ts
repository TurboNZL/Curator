import { join } from 'node:path';

/**
 * Electron keeps the settings, the library-folder choice and the window's storage (the web client's working copy) in a folder named after
 * the app's product name. The product name became "TurboMusic", but an installed app must keep finding the folder it already has, so
 * packaged builds are pointed at the folder the old name made. Never change these values.
 */
export const USER_DATA_FOLDER = { full: 'Music Curator', app: 'Music Curator App', server: 'Music Curator Server' } as const;

export const userDataPath = (appData: string, edition: keyof typeof USER_DATA_FOLDER): string => join(appData, USER_DATA_FOLDER[edition]);
