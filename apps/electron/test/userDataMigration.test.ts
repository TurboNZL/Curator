import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearMigrationNote, lastMigration, planMigration, requestMigration, runMigration, takeRequest } from '../src/userDataMigration.ts';

let root = '';
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'tm-mig-')); });
afterEach(() => { rmSync(root, { recursive: true, force: true }); });

const old = () => join(root, 'Music Curator');
const fresh = () => join(root, 'TurboMusic');
function install(config: Record<string, unknown> = {}) {
  mkdirSync(join(old(), 'Local Storage'), { recursive: true });
  writeFileSync(join(old(), 'Local Storage', 'leveldb.ldb'), 'the web client working copy');
  mkdirSync(join(old(), 'library'), { recursive: true });
  writeFileSync(join(old(), 'library', 'curator.db'), 'library');
  writeFileSync(join(old(), 'desktop.json'), JSON.stringify({ port: 47814, ...config }));
}

describe('planMigration', () => {
  it('has nothing to do without an old folder', () => {
    expect(planMigration(root, 'full').needed).toBe(false);
  });
  it('lists the library folder that sits inside the old folder as something to repoint', () => {
    install({ dataDir: join(old(), 'library') });
    const p = planMigration(root, 'full');
    expect(p.needed).toBe(true);
    expect(p.repoint).toEqual([{ file: 'desktop.json', key: 'dataDir', from: join(old(), 'library'), to: join(fresh(), 'library') }]);
  });
  it('leaves a library the person put on another drive alone', () => {
    install({ dataDir: '/mnt/music/library' });
    const p = planMigration(root, 'full');
    expect(p.repoint).toEqual([]);
    expect(p.untouched).toEqual([{ file: 'desktop.json', key: 'dataDir', value: '/mnt/music/library' }]);
  });
  it('is blocked, and merges nothing, when the new folder already holds files', () => {
    install(); mkdirSync(fresh()); writeFileSync(join(fresh(), 'desktop.json'), '{}');
    const p = planMigration(root, 'full');
    expect(p.needed).toBe(false);
    expect(p.blocked).toMatch(/already has files/);
    expect(runMigration(root, 'full').ok).toBe(false);
    expect(existsSync(old())).toBe(true);
  });
});

describe('runMigration', () => {
  it('renames the folder, keeps every file, repoints the library and records what it did', () => {
    install({ dataDir: join(old(), 'library') });
    const r = runMigration(root, 'full', () => 1234);
    expect(r.ok).toBe(true);
    expect(existsSync(old())).toBe(false);
    expect(readFileSync(join(fresh(), 'Local Storage', 'leveldb.ldb'), 'utf8')).toBe('the web client working copy');
    expect(readFileSync(join(fresh(), 'library', 'curator.db'), 'utf8')).toBe('library');
    const cfg = JSON.parse(readFileSync(join(fresh(), 'desktop.json'), 'utf8')) as { dataDir: string; port: number };
    expect(cfg).toEqual({ port: 47814, dataDir: join(fresh(), 'library') });
    expect(lastMigration(fresh())).toMatchObject({ ok: true, at: 1234, from: old(), to: fresh() });
    clearMigrationNote(fresh());
    expect(lastMigration(fresh())).toBeNull();
  });
  it('replaces an empty leftover folder with the new name', () => {
    install(); mkdirSync(fresh());
    expect(runMigration(root, 'full').ok).toBe(true);
    expect(existsSync(join(fresh(), 'desktop.json'))).toBe(true);
  });
  it('moves the Windows server edition and its several folder settings', () => {
    const o = join(root, 'Music Curator Server'), n = join(root, 'TurboMusic Server');
    mkdirSync(o, { recursive: true });
    writeFileSync(join(o, 'server-edition.json'), JSON.stringify({ setupDone: true, dataDir: join(o, 'library'), filesDir: 'D:\\music', tmpDir: '', cacheDir: join(o, 'cache') }));
    expect(runMigration(root, 'server').ok).toBe(true);
    expect(JSON.parse(readFileSync(join(n, 'server-edition.json'), 'utf8'))).toEqual({ setupDone: true, dataDir: join(n, 'library'), filesDir: 'D:\\music', tmpDir: '', cacheDir: join(n, 'cache') });
  });
  it('does not touch the other editions', () => {
    install();
    expect(planMigration(root, 'app').needed).toBe(false);
    expect(planMigration(root, 'server').needed).toBe(false);
  });
  it('puts everything back and says why when a step fails', () => {
    install({ dataDir: join(old(), 'library') });
    // a directory where the temporary settings file has to go makes the rewrite fail after the rename
    mkdirSync(join(old(), 'desktop.json.tmp'));
    const r = runMigration(root, 'full');
    expect(r.ok).toBe(false);
    expect(r.rolledBack).toBe(true);
    expect(existsSync(fresh())).toBe(false);
    expect(readFileSync(join(old(), 'library', 'curator.db'), 'utf8')).toBe('library');
    expect(JSON.parse(readFileSync(join(old(), 'desktop.json'), 'utf8')).dataDir).toBe(join(old(), 'library'));
    expect(lastMigration(old())).toMatchObject({ ok: false, rolledBack: true });
  });
});

describe('the restart request', () => {
  it('is taken once and per edition', () => {
    requestMigration(root, 'full');
    expect(takeRequest(root, 'app')).toBe(false);
    expect(takeRequest(root, 'full')).toBe(true);
    expect(takeRequest(root, 'full')).toBe(false);
  });
});
