import { createReadStream, createWriteStream, existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { recordSchema, RECORD_TABLES, sha256Hex, type SyncRecord } from '@turbomusic/core';
import type { Store } from './db.ts';
import { filePath } from './files.ts';
import { readTar, tarChunks, tarLength, type TarEntry } from './tar.ts';

const { DatabaseSync } = process.getBuiltinModule('node:sqlite');

export class BackupError extends Error {
  readonly status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

/** Best guess from the first bytes, for archives that have no manifest. */
export function sniffMime(head: Buffer): string {
  const s = (a: number, b: number) => head.toString('latin1', a, b);
  if (head[0] === 0xff && head[1] === 0xd8) return 'image/jpeg';
  if (s(1, 4) === 'PNG') return 'image/png';
  if (s(0, 4) === 'RIFF' && s(8, 12) === 'WEBP') return 'image/webp';
  if (s(0, 4) === 'RIFF' && s(8, 12) === 'WAVE') return 'audio/wav';
  if (s(0, 3) === 'GIF') return 'image/gif';
  if (s(0, 4) === 'fLaC') return 'audio/flac';
  if (s(0, 4) === 'OggS') return 'audio/ogg';
  if (s(4, 8) === 'ftyp') return 'audio/mp4';
  if (s(0, 3) === 'ID3' || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0)) return 'audio/mpeg';
  return 'application/octet-stream';
}

// ---- the data folder (audio and images) ----

const MANIFEST = 'manifest.json';

/** The files of the data folder as a tar: a manifest first (hash, size, type), then every file under files/<hash>. */
export function filesArchive(dataDir: string, store: Store): { length: number; chunks: AsyncGenerator<Buffer>; count: number } {
  const files = store.listFiles().filter((f) => existsSync(filePath(dataDir, f.hash)));
  const manifest = Buffer.from(JSON.stringify(files.map((f) => ({ hash: f.hash, size: f.size, mime: store.fileInfo(f.hash)?.mime ?? 'application/octet-stream' }))));
  const entries: TarEntry[] = [
    { name: MANIFEST, size: manifest.length, data: manifest },
    ...files.map((f) => ({ name: `files/${f.hash}`, size: statSync(filePath(dataDir, f.hash)).size, path: filePath(dataDir, f.hash) })),
  ];
  return { length: tarLength(entries), chunks: tarChunks(entries), count: files.length };
}

export interface FilesImport { added: number; existed: number; corrupt: number; ignored: number; bytes: number }

/** Unpack a tar of files into the content-addressed store. Every file is hashed again; one that does not match its name is dropped. */
export async function importFiles(dataDir: string, store: Store, body: AsyncIterable<Uint8Array>): Promise<FilesImport> {
  const out: FilesImport = { added: 0, existed: 0, corrupt: 0, ignored: 0, bytes: 0 };
  const mimes = new Map<string, string>();
  mkdirSync(join(dataDir, 'tmp'), { recursive: true });
  try {
    for await (const entry of readTar(body)) {
      const base = entry.name.split('/').pop() ?? '';
      if (base === MANIFEST) {
        if (entry.size > 64 * 1024 * 1024) throw new BackupError(413, 'The manifest is too large');
        const text = Buffer.concat(await collect(entry.body)).toString('utf8');
        try { for (const m of JSON.parse(text) as { hash?: string; mime?: string }[]) if (m.hash && m.mime) mimes.set(m.hash, m.mime); } catch { /* a damaged manifest only costs the file types: they are sniffed instead */ }
        continue;
      }
      if (!sha256Hex.test(base)) { out.ignored++; continue; }
      if (store.hasFile(base) && existsSync(filePath(dataDir, base))) { out.existed++; continue; }
      const tmp = join(dataDir, 'tmp', `import-${base}.${process.pid}.${Date.now()}`);
      const hash = createHash('sha256');
      let head = Buffer.alloc(0);
      try {
        await pipeline(Readable.from((async function* () {
          for await (const chunk of entry.body) { hash.update(chunk); if (head.length < 16) head = Buffer.concat([head, chunk]).subarray(0, 16); yield chunk; }
        })()), createWriteStream(tmp));
        if (hash.digest('hex') !== base) { out.corrupt++; rmSync(tmp, { force: true }); continue; }
        mkdirSync(join(dataDir, 'files', base.slice(0, 2)), { recursive: true });
        renameSync(tmp, filePath(dataDir, base));
        store.addFile(base, entry.size, mimes.get(base) ?? sniffMime(head));
        out.added++; out.bytes += entry.size;
      } catch (e) { rmSync(tmp, { force: true }); throw e; }
    }
  } catch (e) {
    if (e instanceof BackupError) throw e;
    throw new BackupError(400, e instanceof Error ? e.message : 'Could not read the archive');
  }
  return out;
}

async function collect(it: AsyncIterable<Buffer>): Promise<Buffer[]> { const out: Buffer[] = []; for await (const c of it) out.push(c); return out; }

// ---- the database ----

/** A consistent copy of the database as one file. Remove `path` when the download has finished. */
export function databaseSnapshot(dataDir: string, store: Store): { path: string; size: number } {
  mkdirSync(join(dataDir, 'tmp'), { recursive: true });
  const path = join(dataDir, 'tmp', `export-${process.pid}-${Date.now()}.db`);
  store.snapshotTo(path);
  return { path, size: statSync(path).size };
}
export const readStream = (path: string) => createReadStream(path);

/** Records out of an uploaded database file; throws BackupError when it is not one of ours. */
export function readDatabaseRecords(path: string): SyncRecord[] {
  let db: InstanceType<typeof DatabaseSync>;
  try { db = new DatabaseSync(path, { readOnly: true }); } catch { throw new BackupError(400, 'That file is not a database'); }
  try {
    const cols = (db.prepare(`PRAGMA table_info(records)`).all() as { name: string }[]).map((c) => c.name);
    for (const need of ['tbl', 'id', 'updated_at', 'device_id', 'deleted', 'data']) if (!cols.includes(need)) throw new BackupError(400, 'That database does not look like a TurboMusic backup');
    const rows = db.prepare(`SELECT tbl, id, updated_at, device_id, deleted, data FROM records`).all() as { tbl: string; id: string; updated_at: number; device_id: string; deleted: number; data: string }[];
    const out: SyncRecord[] = [];
    for (const r of rows) {
      if (!(RECORD_TABLES as readonly string[]).includes(r.tbl)) continue; // a table from a newer version: leave it
      const parsed = recordSchema.safeParse({ table: r.tbl, id: r.id, updatedAt: r.updated_at, deviceId: r.device_id ?? '', deleted: !!r.deleted, data: JSON.parse(r.data || '{}') });
      if (parsed.success) out.push(parsed.data);
    }
    return out;
  } catch (e) {
    if (e instanceof BackupError) throw e;
    throw new BackupError(400, 'That database could not be read');
  } finally { db.close(); }
}

/** Save an uploaded body to a temp file with a size cap; the caller removes it. */
export async function saveUpload(dataDir: string, body: ReadableStream<Uint8Array>, maxBytes: number): Promise<string> {
  mkdirSync(join(dataDir, 'tmp'), { recursive: true });
  const path = join(dataDir, 'tmp', `import-${process.pid}-${Date.now()}.db`);
  let size = 0;
  try {
    await pipeline(Readable.fromWeb(body as never), async function* (src: AsyncIterable<Buffer>) {
      for await (const c of src) { size += c.length; if (size > maxBytes) throw new BackupError(413, 'That file is too large'); yield c; }
    }, createWriteStream(path));
  } catch (e) { rmSync(path, { force: true }); throw e; }
  return path;
}
