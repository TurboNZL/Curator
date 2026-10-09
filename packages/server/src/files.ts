import { createReadStream, createWriteStream, mkdirSync, renameSync, rmSync, statfsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';

export function filePath(dataDir: string, hash: string): string {
  return join(dataDir, 'files', hash.slice(0, 2), hash);
}

export class UploadError extends Error {
  readonly status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

/** Stream the body to tmp while hashing; only move into place if the hash matches what the client claimed. */
export async function saveVerified(
  dataDir: string, expected: string, body: WebReadableStream<Uint8Array>, maxBytes: number,
): Promise<number> {
  const tmp = join(dataDir, 'tmp', `${expected}.${process.pid}.${Date.now()}`);
  const hash = createHash('sha256');
  let size = 0;
  const meter = new Transform({
    transform(chunk, _enc, cb) {
      size += chunk.length;
      if (size > maxBytes) return cb(new UploadError(413, 'File too large'));
      hash.update(chunk);
      cb(null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(body), meter, createWriteStream(tmp));
    if (hash.digest('hex') !== expected) throw new UploadError(422, 'Content hash does not match URL');
    const dest = filePath(dataDir, expected);
    mkdirSync(join(dataDir, 'files', expected.slice(0, 2)), { recursive: true });
    renameSync(tmp, dest);
    return size;
  } catch (e) {
    rmSync(tmp, { force: true });
    throw e;
  }
}

/** Parse a single `bytes=a-b` range. Returns null for unsupported/multi ranges (we then send the whole file). */
export function parseRange(header: string | undefined, size: number): { start: number; end: number } | 'invalid' | null {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === '' && m[2] === '')) return null;
  let start: number, end: number;
  if (m[1] === '') { // suffix: last N bytes
    const n = Number(m[2]);
    if (n === 0) return 'invalid';
    start = Math.max(0, size - n); end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start >= size || start > end) return 'invalid';
  return { start, end };
}

export function streamFile(path: string, range?: { start: number; end: number }): ReadableStream {
  return Readable.toWeb(createReadStream(path, range)) as unknown as ReadableStream;
}

export function diskUsage(dataDir: string): { freeBytes: number; totalBytes: number } {
  const s = statfsSync(dataDir);
  return { freeBytes: Number(s.bavail) * s.bsize, totalBytes: Number(s.blocks) * s.bsize };
}
