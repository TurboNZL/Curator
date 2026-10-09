import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { RecordTable, SyncRecord } from '@curator/core';

/** Local mirror of the server's records, plus an outbox of keys that still need pushing. */
interface Schema extends DBSchema {
  records: { key: [string, string]; value: SyncRecord };
  outbox: { key: [string, string]; value: { table: RecordTable; id: string } };
  meta: { key: string; value: unknown };
  /** images (and later audio) kept on this device, keyed by sha256 */
  blobs: { key: string; value: Blob };
}

let dbp: Promise<IDBPDatabase<Schema>> | undefined;

export function localDb(name = 'curator') {
  dbp ??= openDB<Schema>(name, 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('records', { keyPath: ['table', 'id'] });
        db.createObjectStore('outbox', { keyPath: ['table', 'id'] });
        db.createObjectStore('meta');
      }
      if (oldVersion < 2) db.createObjectStore('blobs');
    },
  });
  return dbp;
}

/** test hook: forget the cached connection so a fresh database can be opened */
export function resetLocalDb() { dbp = undefined; }

export async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const v = await (await localDb()).get('meta', key);
  return (v as T | undefined) ?? fallback;
}
export async function setMeta(key: string, value: unknown) {
  await (await localDb()).put('meta', value, key);
}
