import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite';
import { join } from 'node:path';
import { wins, type SyncRecord, type RecordTable } from '@curator/core';

// getBuiltinModule: bundlers/vite cannot resolve the prefix-only `node:sqlite` specifier.
const { DatabaseSync } = process.getBuiltinModule('node:sqlite');

export interface StoredRecord extends SyncRecord { seq: number }

export class Store {
  readonly db: DatabaseSyncType;

  constructor(dataDir: string | ':memory:') {
    this.db = new DatabaseSync(dataDir === ':memory:' ? ':memory:' : join(dataDir, 'curator.db'));
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v INTEGER NOT NULL);
      INSERT OR IGNORE INTO meta (k, v) VALUES ('seq', 0);
      CREATE TABLE IF NOT EXISTS records (
        tbl TEXT NOT NULL,
        id TEXT NOT NULL,
        seq INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        device_id TEXT NOT NULL DEFAULT '',
        deleted INTEGER NOT NULL DEFAULT 0,
        data TEXT NOT NULL DEFAULT '{}',
        PRIMARY KEY (tbl, id)
      );
      CREATE INDEX IF NOT EXISTS records_seq ON records (seq);
      CREATE TABLE IF NOT EXISTS files (
        hash TEXT PRIMARY KEY,
        size INTEGER NOT NULL,
        mime TEXT NOT NULL DEFAULT 'application/octet-stream',
        created_at INTEGER NOT NULL
      );
    `);
  }

  private nextSeq(): number {
    return (this.db.prepare(`UPDATE meta SET v = v + 1 WHERE k = 'seq' RETURNING v`).get() as { v: number }).v;
  }

  /** Merge a batch atomically. Returns how many were applied (the rest lost the conflict rule). */
  push(records: SyncRecord[]): { applied: number; cursor: number } {
    const get = this.db.prepare(`SELECT updated_at AS updatedAt, device_id AS deviceId FROM records WHERE tbl = ? AND id = ?`);
    const put = this.db.prepare(`
      INSERT INTO records (tbl, id, seq, updated_at, device_id, deleted, data) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (tbl, id) DO UPDATE SET
        seq = excluded.seq, updated_at = excluded.updated_at, device_id = excluded.device_id,
        deleted = excluded.deleted, data = excluded.data`);
    let applied = 0;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      for (const r of records) {
        const existing = get.get(r.table, r.id) as { updatedAt: number; deviceId: string } | undefined;
        if (!wins(r, existing)) continue;
        put.run(r.table, r.id, this.nextSeq(), r.updatedAt, r.deviceId, r.deleted ? 1 : 0, JSON.stringify(r.data));
        applied++;
      }
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
    return { applied, cursor: this.cursor() };
  }

  /**
   * Make the library exactly `records` (a restore). Records that are not in it become tombstones, and everything
   * is stamped `now`, so every device converges on the restored state instead of resurrecting what was removed.
   */
  replaceWith(records: SyncRecord[], now = Date.now()): { written: number; removed: number } {
    const put = this.db.prepare(`
      INSERT INTO records (tbl, id, seq, updated_at, device_id, deleted, data) VALUES (?, ?, ?, ?, 'restore', ?, ?)
      ON CONFLICT (tbl, id) DO UPDATE SET seq = excluded.seq, updated_at = excluded.updated_at, device_id = 'restore', deleted = excluded.deleted, data = excluded.data`);
    const incoming = new Set(records.map((r) => `${r.table}\u0000${r.id}`));
    let removed = 0;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const live = this.db.prepare(`SELECT tbl, id FROM records WHERE deleted = 0`).all() as { tbl: string; id: string }[];
      for (const r of live) {
        if (incoming.has(`${r.tbl}\u0000${r.id}`)) continue;
        put.run(r.tbl, r.id, this.nextSeq(), now, 1, '{}');
        removed++;
      }
      for (const r of records) put.run(r.table, r.id, this.nextSeq(), now, r.deleted ? 1 : 0, JSON.stringify(r.data));
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
    return { written: records.length, removed };
  }

  /** a consistent single-file copy of the database (safe while the server is running) */
  snapshotTo(path: string): void {
    this.db.exec(`VACUUM INTO '${path.replaceAll("'", "''")}'`);
  }

  cursor(): number {
    return (this.db.prepare(`SELECT v FROM meta WHERE k = 'seq'`).get() as { v: number }).v;
  }

  pull(since: number, limit = 1000): { records: StoredRecord[]; cursor: number; more: boolean } {
    const rows = this.db.prepare(`
      SELECT tbl, id, seq, updated_at, device_id, deleted, data FROM records
      WHERE seq > ? ORDER BY seq LIMIT ?`).all(since, limit + 1) as Array<{
        tbl: string; id: string; seq: number; updated_at: number; device_id: string; deleted: number; data: string;
      }>;
    const more = rows.length > limit;
    const page = rows.slice(0, limit).map((r) => ({
      table: r.tbl as RecordTable, id: r.id, seq: r.seq, updatedAt: r.updated_at,
      deviceId: r.device_id, deleted: !!r.deleted, data: JSON.parse(r.data) as Record<string, unknown>,
    }));
    return { records: page, cursor: page.length ? page[page.length - 1].seq : since, more };
  }

  get(table: RecordTable, id: string): StoredRecord | undefined {
    const r = this.db.prepare(`SELECT tbl, id, seq, updated_at, device_id, deleted, data FROM records WHERE tbl = ? AND id = ?`).get(table, id) as
      | { tbl: string; id: string; seq: number; updated_at: number; device_id: string; deleted: number; data: string } | undefined;
    return r && { table: r.tbl as RecordTable, id: r.id, seq: r.seq, updatedAt: r.updated_at, deviceId: r.device_id, deleted: !!r.deleted, data: JSON.parse(r.data) };
  }

  /** all live records of one table */
  list(table: RecordTable): StoredRecord[] {
    return (this.db.prepare(`SELECT id FROM records WHERE tbl = ? AND deleted = 0`).all(table) as { id: string }[])
      .map((r) => this.get(table, r.id)!);
  }

  hasFile(hash: string): boolean {
    return !!this.db.prepare(`SELECT 1 FROM files WHERE hash = ?`).get(hash);
  }
  addFile(hash: string, size: number, mime: string): void {
    this.db.prepare(`INSERT OR IGNORE INTO files (hash, size, mime, created_at) VALUES (?, ?, ?, ?)`).run(hash, size, mime, Date.now());
  }
  fileInfo(hash: string): { size: number; mime: string } | undefined {
    return this.db.prepare(`SELECT size, mime FROM files WHERE hash = ?`).get(hash) as { size: number; mime: string } | undefined;
  }
  listFiles(): { hash: string; size: number }[] {
    return this.db.prepare(`SELECT hash, size FROM files ORDER BY created_at`).all() as { hash: string; size: number }[];
  }
  close() { this.db.close(); }
}
