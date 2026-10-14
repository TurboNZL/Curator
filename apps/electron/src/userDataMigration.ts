import { existsSync, mkdirSync, readFileSync, renameSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { currentUserData, hasContent, legacyUserData, type Edition } from './appName.ts';

/**
 * Moving an installed app from the "Music Curator" settings folder to the "TurboMusic" one, in small steps that are each checked, and
 * undone if a later one fails. Nothing is copied: the folder is renamed (same drive, atomic), so there is never a second, half-copied
 * library. It runs while the app starts, before anything has opened a file in the folder (userDataBoot.ts); a button only asks for it.
 *
 *   1. look   - is there an old folder, is the new name free
 *   2. rename - old folder -> new folder, then check the old one is gone and the new one is there
 *   3. repoint - settings files that remember a folder INSIDE the old one (the library folder when it was left in its default place)
 *                are rewritten to the new path; a library the person put somewhere else is not touched
 *   4. record - migration.json in the new folder says what was done
 * If step 2 or 3 fails, everything done so far is put back and the app carries on with the old folder.
 */

/** Settings files that hold folder paths, and which of their keys. */
export const PATH_FILES: Record<Edition, { file: string; keys: string[] }[]> = {
  full: [{ file: 'desktop.json', keys: ['dataDir'] }],
  app: [{ file: 'desktop.json', keys: ['dataDir'] }],
  server: [{ file: 'server-edition.json', keys: ['dataDir', 'filesDir', 'tmpDir', 'cacheDir'] }],
};

export interface MigrationPlan {
  /** an old folder is in use and the new name is free: the move can be done */
  needed: boolean;
  from: string;
  to: string;
  /** what will be rewritten: a path setting that points inside the old folder */
  repoint: { file: string; key: string; from: string; to: string }[];
  /** paths the person chose elsewhere; they stay as they are */
  untouched: { file: string; key: string; value: string }[];
  /** why the move cannot happen now (the new folder already holds something) */
  blocked?: string;
}

export interface MigrationReport { ok: boolean; at: number; from: string; to: string; done: string[]; error?: string; rolledBack?: boolean }

const REPORT = 'migration.json';

const inside = (value: string, root: string) => value === root || value.startsWith(root + sep) || value.startsWith(root + '/') || value.startsWith(root + '\\');
const swapRoot = (value: string, from: string, to: string) => to + value.slice(from.length);

function readJson(path: string): Record<string, unknown> | null {
  try { const v = JSON.parse(readFileSync(path, 'utf8')) as unknown; return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null; } catch { return null; }
}

/** Look: what a move would do, without doing it. */
export function planMigration(appData: string, edition: Edition): MigrationPlan {
  const from = legacyUserData(appData, edition), to = currentUserData(appData, edition);
  const plan: MigrationPlan = { needed: false, from, to, repoint: [], untouched: [] };
  if (!existsSync(from)) return plan;
  if (hasContent(to)) return { ...plan, blocked: `A folder named "${to}" already has files in it, so nothing is merged or overwritten. Move or rename one of the two folders yourself, then try again.` };
  plan.needed = true;
  for (const { file, keys } of PATH_FILES[edition]) {
    const json = readJson(join(from, file));
    if (!json) continue;
    for (const key of keys) {
      const v = json[key];
      if (typeof v !== 'string' || !v) continue;
      if (inside(v, from)) plan.repoint.push({ file, key, from: v, to: swapRoot(v, from, to) });
      else plan.untouched.push({ file, key, value: v });
    }
  }
  return plan;
}

/** Do it, step by step; undo what was done if a step fails. Returns the report (also saved as migration.json when it worked). */
export function runMigration(appData: string, edition: Edition, now: () => number = Date.now): MigrationReport {
  const plan = planMigration(appData, edition);
  const report: MigrationReport = { ok: false, at: now(), from: plan.from, to: plan.to, done: [] };
  if (!plan.needed) { report.error = plan.blocked ?? 'There is no old folder to move.'; return report; }

  let renamed = false;
  const rewritten: { path: string; before: string }[] = [];
  try {
    // 2. rename (an empty leftover folder with the new name is removed first; plan() already checked it holds nothing)
    if (existsSync(plan.to)) rmdirSync(plan.to);
    renameSync(plan.from, plan.to); renamed = true;
    if (existsSync(plan.from) || !existsSync(plan.to)) throw new Error('The folder was not renamed as expected.');
    report.done.push(`Renamed ${plan.from} to ${plan.to}`);

    // 3. repoint
    for (const { file, keys } of PATH_FILES[edition]) {
      const path = join(plan.to, file);
      let text: string;
      try { text = readFileSync(path, 'utf8'); } catch { continue; }
      const json = readJson(path);
      if (!json) continue;
      let changed = false;
      for (const key of keys) {
        const v = json[key];
        if (typeof v === 'string' && v && inside(v, plan.from)) { json[key] = swapRoot(v, plan.from, plan.to); changed = true; report.done.push(`${file}: ${key} now ${json[key] as string}`); }
      }
      if (!changed) continue;
      rewritten.push({ path, before: text });
      writeFileSync(path + '.tmp', JSON.stringify(json, null, 2)); renameSync(path + '.tmp', path);
      const back = readJson(path);
      if (!back || keys.some((k) => typeof json[k] === 'string' && back[k] !== json[k])) throw new Error(`${file} could not be read back after it was rewritten.`);
    }
    report.ok = true;
    // 4. record (a failure to write the note does not undo a move that worked)
    try { writeFileSync(join(plan.to, REPORT), JSON.stringify(report, null, 2)); } catch { /* the move itself is done */ }
    return report;
  } catch (e) {
    report.error = (e as Error).message;
    // undo, newest first: the rewritten files, then the rename
    for (const r of rewritten.reverse()) { try { writeFileSync(r.path, r.before); } catch { /* best effort */ } }
    if (renamed) { try { renameSync(plan.to, plan.from); report.rolledBack = true; } catch (e2) { report.error += ` The folder could not be moved back either (${(e2 as Error).message}); it is at ${plan.to}.`; } }
    else report.rolledBack = true;
    // leave the reason where the Settings card will find it (the old folder is the one in use again)
    if (report.rolledBack) { try { writeFileSync(join(plan.from, REPORT), JSON.stringify(report, null, 2)); } catch { /* the note is a courtesy */ } }
    return report;
  }
}

/** What the last successful move wrote, for the Settings card. */
export function lastMigration(userData: string): MigrationReport | null {
  const r = readJson(join(userData, REPORT));
  return r && typeof r.at === 'number' ? r as unknown as MigrationReport : null;
}

/** Remove the success note (the card's "OK" button). */
export function clearMigrationNote(userData: string) { try { rmSync(join(userData, REPORT), { force: true }); } catch { /* nothing to remove */ } }

// A button cannot rename the folder the running app has open, so it leaves a request and restarts the app; the next start does the move first thing.
const markerPath = (appData: string, edition: Edition) => join(appData, `turbomusic-migrate-${edition}.json`);

export function requestMigration(appData: string, edition: Edition) {
  mkdirSync(appData, { recursive: true });
  writeFileSync(markerPath(appData, edition), JSON.stringify({ edition, at: Date.now() }));
}

/** True once, if a request is waiting (and removes it, so a failed move is not retried on every start). */
export function takeRequest(appData: string, edition: Edition): boolean {
  const p = markerPath(appData, edition);
  if (!existsSync(p)) return false;
  try { rmSync(p, { force: true }); } catch { /* ignore */ }
  return true;
}
