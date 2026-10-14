import { app } from 'electron';
import { chooseUserData, type Edition } from './appName.ts';
import { clearMigrationNote, lastMigration, planMigration, requestMigration, runMigration, takeRequest, type MigrationPlan, type MigrationReport } from './userDataMigration.ts';

/**
 * First thing in the main process, before anything reads or opens a file in the settings folder: carry out a requested move to the
 * TurboMusic folder, then point Electron at whichever folder is in use. Development runs (not packaged) keep Electron's own default.
 * Returns what the Settings card needs.
 */
/** A development run has no installed settings folder to move; CURATOR_ASSUME_PACKAGED=1 lets a test drive the real code against a scratch XDG_CONFIG_HOME. */
const installed = () => app.isPackaged || process.env.CURATOR_ASSUME_PACKAGED === '1';

export function bootUserData(edition: Edition): { appData: string; legacy: boolean } {
  if (!installed()) return { appData: app.getPath('appData'), legacy: false };
  const appData = app.getPath('appData');
  if (takeRequest(appData, edition)) {
    const r = runMigration(appData, edition);
    console.log(`[turbomusic] move to the TurboMusic folder: ${r.ok ? 'done' : 'failed'} ${r.ok ? r.done.join('; ') : r.error ?? ''}`);
  }
  const chosen = chooseUserData(appData, edition);
  app.setPath('userData', chosen.path);
  return { appData, legacy: chosen.legacy };
}

export interface MigrationInfo {
  /** false in a development run: there is nothing installed to move */
  supported: boolean;
  plan: MigrationPlan | null;
  last: MigrationReport | null;
}

export function migrationInfo(edition: Edition): MigrationInfo {
  if (!installed()) return { supported: false, plan: null, last: null };
  const appData = app.getPath('appData');
  return { supported: true, plan: planMigration(appData, edition), last: lastMigration(app.getPath('userData')) };
}

export const askForMigration = (edition: Edition) => requestMigration(app.getPath('appData'), edition);
export const dismissMigrationNote = () => clearMigrationNote(app.getPath('userData'));
