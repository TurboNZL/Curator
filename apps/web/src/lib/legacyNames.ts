/**
 * The app's first name, kept in ONE place: what an install made under it left behind (settings in localStorage, the local database,
 * backups and play records labelled with it) is carried over instead of being lost. Every other file says TurboMusic.
 * Once every device has started once with this version, delete this file and its three call sites (main.tsx, idb.ts, backupFormat.ts, listens.ts).
 */
import type { IDBPDatabase } from 'idb';

const OLD = 'curator';
const NEW = 'turbomusic';

/** `curator.*` keys of localStorage are copied to `turbomusic.*` (unless the new key exists); runs when this file is imported, before the store reads its settings. */
export function migrateLocalStorage(storage?: Pick<Storage, 'length' | 'key' | 'getItem' | 'setItem'>): number {
  let n = 0;
  try {
    storage ??= globalThis.localStorage; // absent in a test run without a browser, and a getter that can throw where storage is blocked
    if (!storage) return 0;
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) { const k = storage.key(i); if (k && k.startsWith(`${OLD}.`)) keys.push(k); }
    for (const k of keys) {
      const to = `${NEW}.${k.slice(OLD.length + 1)}`;
      if (storage.getItem(to) !== null) continue;
      const v = storage.getItem(k);
      if (v === null) continue;
      // a saved stats filter named the app as a play source
      storage.setItem(to, v.replace(`"source":"${OLD}"`, `"source":"${NEW}"`));
      n++;
    }
  } catch { /* storage blocked: nothing to carry over */ }
  return n;
}
migrateLocalStorage();

/**
 * Copies every record, outbox entry, meta value and kept file of the old local database into the new one, once, then deletes the old one.
 * Unsynced edits and offline audio would otherwise stay behind in a database nothing reads any more.
 */
export async function importLegacyDb(db: IDBPDatabase<never>, openOld: (name: string) => Promise<IDBPDatabase<never> | null> = openExisting): Promise<boolean> {
  try {
    const done = await (db as unknown as IDBPDatabase<{ meta: { key: string; value: unknown } }>).get('meta', 'legacyDbImported');
    if (done) return false;
    const old = await openOld(OLD);
    if (!old) return false;
    // one key at a time, each in its own short transaction: a cursor cannot be held open across writes to another database
    for (const name of Array.from(old.objectStoreNames)) {
      if (!db.objectStoreNames.contains(name as never)) continue;
      const inline = !!old.transaction(name as never, 'readonly').store.keyPath;
      for (const key of await old.getAllKeys(name as never)) {
        const value = await old.get(name as never, key as never);
        if (inline) await db.put(name as never, value as never); else await (db as unknown as { put(s: string, v: unknown, k: IDBValidKey): Promise<unknown> }).put(name, value, key);
      }
    }
    await (db as unknown as IDBPDatabase<{ meta: { key: string; value: unknown } }>).put('meta', true, 'legacyDbImported');
    old.close();
    await new Promise<void>((resolve) => { const r = indexedDB.deleteDatabase(OLD); r.onsuccess = r.onerror = r.onblocked = () => resolve(); });
    return true;
  } catch { return false; /* the old database stays where it is; nothing is lost */ }
}

async function openExisting(name: string): Promise<IDBPDatabase<never> | null> {
  const { openDB } = await import('idb');
  const list = (indexedDB as { databases?: () => Promise<{ name?: string }[]> }).databases;
  if (list && !(await list.call(indexedDB)).some((d) => d.name === name)) return null;
  return openDB(name) as unknown as Promise<IDBPDatabase<never>>;
}

/** Backups written under the old name are still accepted. */
export const LEGACY_BACKUP_FORMATS: readonly string[] = ['curator-database'];

/** Play records made by the old app carry its old name as their platform; they are shown under the current one. */
export const canonicalPlatform = (p: string | null | undefined): string | null => (p == null ? null : p === 'Curator' ? 'TurboMusic' : p);
