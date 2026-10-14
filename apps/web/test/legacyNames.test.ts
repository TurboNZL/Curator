import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { beforeEach, describe, expect, it } from 'vitest';
import { LEGACY_BACKUP_FORMATS, canonicalPlatform, importLegacyDb, migrateLocalStorage } from '../src/lib/legacyNames.ts';
import { localDb, resetLocalDb } from '../src/lib/idb.ts';
import { parseBackup } from '../src/lib/backupFormat.ts';

const memory = (init: Record<string, string>) => {
  const m = new Map(Object.entries(init));
  return { get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};

describe('settings of an install made under the first name', () => {
  it('copies curator.* keys to turbomusic.* and keeps what is already there', () => {
    const s = memory({ 'curator.settings': '{"token":"t"}', 'curator.volume': '0.4', 'turbomusic.volume': '0.9', 'curator.statsFilter': '{"source":"curator","range":"all"}'.replace('"source":"curator"', '"source":"curator"'), other: 'x' });
    expect(migrateLocalStorage(s)).toBe(2);
    expect(s.m.get('turbomusic.settings')).toBe('{"token":"t"}');
    expect(s.m.get('turbomusic.volume')).toBe('0.9');
    expect(s.m.get('turbomusic.statsFilter')).toBe('{"source":"turbomusic","range":"all"}');
    expect(migrateLocalStorage(s)).toBe(0);
  });
});

describe('the old local database', () => {
  beforeEach(() => { resetLocalDb(); });
  it('is copied into the new one (records, outbox, meta, kept files) once, then removed', async () => {
    const old = await openDB('curator', 2, { upgrade(db) { db.createObjectStore('records', { keyPath: ['table', 'id'] }); db.createObjectStore('outbox', { keyPath: ['table', 'id'] }); db.createObjectStore('meta'); db.createObjectStore('blobs'); } });
    await old.put('records', { table: 'artists', id: 'a1', updatedAt: 1, deviceId: 'd', deleted: false, data: { name: 'Kept' } });
    await old.put('outbox', { table: 'artists', id: 'a1' });
    await old.put('meta', 42, 'cursor');
    await old.put('blobs', new Blob(['hello']), 'h1');
    old.close();
    const db = await localDb('turbomusic');
    expect((await db.get('records', ['artists', 'a1']))?.data).toMatchObject({ name: 'Kept' });
    expect(await db.get('outbox', ['artists', 'a1'])).toBeTruthy();
    expect(await db.get('meta', 'cursor')).toBe(42);
    expect(await (await db.get('blobs', 'h1'))?.text()).toBe('hello');
    expect((await indexedDB.databases()).some((d) => d.name === 'curator')).toBe(false);
  });
  it('does nothing when there is no old database', async () => {
    const db = await localDb('turbomusic');
    expect(await importLegacyDb(db as never, async () => null)).toBe(false);
  });
});

describe('names from before', () => {
  it('old backups are accepted', () => {
    const text = JSON.stringify({ format: LEGACY_BACKUP_FORMATS[0], version: 1, records: [] });
    expect(parseBackup(text).records).toEqual([]);
    expect(() => parseBackup(JSON.stringify({ format: 'other', records: [] }))).toThrow(/not a TurboMusic/);
  });
  it('old play records show the current platform name', () => { expect(canonicalPlatform('Curator')).toBe('TurboMusic'); expect(canonicalPlatform('Android')).toBe('Android'); expect(canonicalPlatform(null)).toBeNull(); });
});
