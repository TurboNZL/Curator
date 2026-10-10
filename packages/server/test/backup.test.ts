import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { createApp } from '../src/app.ts';
import { Store } from '../src/db.ts';
import { loadConfig } from '../src/config.ts';
import { readTar, tarChunks, tarLength } from '../src/tar.ts';

const TOKEN = 't0ken';
const auth = { Authorization: `Bearer ${TOKEN}` };
const json = { ...auth, 'Content-Type': 'application/json' };
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const rec = (id: string, updatedAt: number, extra: object = {}, deleted = false) => ({ table: 'tracks', id, updatedAt, deviceId: 'd', deleted, data: { title: id, ...extra } });

function make() {
  const dir = mkdtempSync(join(tmpdir(), 'curator-bk-'));
  const config = loadConfig({ CURATOR_DATA_DIR: dir, CURATOR_TOKEN: TOKEN } as never);
  const store = new Store(config.dataDir);
  return { dir, store, app: createApp(config, store) };
}
const put = (app: ReturnType<typeof createApp>, buf: Buffer, type = 'audio/mpeg') => app.request(`/api/files/${sha(buf)}`, { method: 'PUT', headers: { ...auth, 'Content-Type': type }, body: buf });
const bytes = async (r: Response) => Buffer.from(await r.arrayBuffer());

describe('tar', () => {
  it('writes and reads back files of awkward sizes, and skips what it was not asked for', async () => {
    const entries = [0, 1, 511, 512, 513, 5000].map((n, i) => ({ name: `files/f${i}`, size: n, data: randomBytes(n) }));
    const chunks: Buffer[] = [];
    for await (const c of tarChunks(entries)) chunks.push(c);
    const tar = Buffer.concat(chunks);
    expect(tar.length).toBe(tarLength(entries));
    const seen: [string, number][] = [];
    for await (const e of readTar((async function* () { for (let i = 0; i < tar.length; i += 777) yield tar.subarray(i, i + 777); })())) {
      seen.push([e.name, e.size]);
      if (e.name.endsWith('f3')) continue; // left unread on purpose
      const got = Buffer.concat(await (async () => { const o: Buffer[] = []; for await (const c of e.body) o.push(c); return o; })());
      expect(got.equals(entries[seen.length - 1].data)).toBe(true);
    }
    expect(seen).toEqual(entries.map((e) => [e.name, e.size]));
  });
  it('refuses a truncated archive', async () => {
    const chunks: Buffer[] = [];
    for await (const c of tarChunks([{ name: 'x', size: 2000, data: randomBytes(2000) }])) chunks.push(c);
    const cut = Buffer.concat(chunks).subarray(0, 1500);
    await expect((async () => { for await (const e of readTar((async function* () { yield cut; })())) for await (const _ of e.body) void _; })()).rejects.toThrow(/cut short/);
  });
});

describe('data folder export and import', () => {
  let a: ReturnType<typeof make>, b: ReturnType<typeof make>;
  beforeEach(() => { a = make(); b = make(); });
  afterEach(() => { for (const x of [a, b]) { x.store.close(); rmSync(x.dir, { recursive: true, force: true }); } });

  it('moves every file, with its type, to another server', async () => {
    const mp3 = Buffer.concat([Buffer.from('ID3'), randomBytes(3000)]), jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), randomBytes(700)]);
    await put(a.app, mp3, 'audio/mpeg'); await put(a.app, jpg, 'image/jpeg');
    const res = await a.app.request('/api/export/files', { headers: auth });
    expect(res.headers.get('content-disposition')).toMatch(/curator-files-.*\.tar/);
    const tar = await bytes(res);
    expect(Number(res.headers.get('content-length'))).toBe(tar.length);

    const imp = await b.app.request('/api/import/files', { method: 'POST', headers: auth, body: tar });
    expect(await imp.json()).toMatchObject({ added: 2, existed: 0, corrupt: 0 });
    const got = await b.app.request(`/api/files/${sha(mp3)}`, { headers: auth });
    expect(got.headers.get('content-type')).toBe('audio/mpeg');
    expect((await bytes(got)).equals(mp3)).toBe(true);
    // importing again changes nothing
    expect(await (await b.app.request('/api/import/files', { method: 'POST', headers: auth, body: tar })).json()).toMatchObject({ added: 0, existed: 2 });
  });

  it('drops a file whose bytes do not match its name, and still takes the rest', async () => {
    const good = randomBytes(900), bad = randomBytes(900);
    const chunks: Buffer[] = [];
    for await (const c of tarChunks([{ name: `files/${sha(bad)}`, size: 900, data: randomBytes(900) }, { name: `files/${sha(good)}`, size: 900, data: good }, { name: 'readme.txt', size: 2, data: Buffer.from('hi') }])) chunks.push(c);
    const r = await (await b.app.request('/api/import/files', { method: 'POST', headers: auth, body: Buffer.concat(chunks) })).json();
    expect(r).toMatchObject({ added: 1, corrupt: 1, ignored: 1 });
    expect((await b.app.request(`/api/files/${sha(bad)}`, { headers: auth })).status).toBe(404);
  });

  it('answers 400 for something that is not an archive and needs the token', async () => {
    expect((await b.app.request('/api/import/files', { method: 'POST', headers: auth, body: Buffer.alloc(1500, 7) })).status).toBe(400);
    expect((await b.app.request('/api/export/files')).status).toBe(401);
    expect((await b.app.request(`/api/export/files?token=${TOKEN}`)).status).toBe(200);
  });
});

describe('database export and import', () => {
  let a: ReturnType<typeof make>, b: ReturnType<typeof make>;
  beforeEach(() => { a = make(); b = make(); });
  afterEach(() => { for (const x of [a, b]) { x.store.close(); rmSync(x.dir, { recursive: true, force: true }); } });
  const push = (x: ReturnType<typeof make>, records: object[]) => x.app.request('/api/sync/push', { method: 'POST', headers: json, body: JSON.stringify({ records }) });
  const exportDb = async () => { const r = await a.app.request('/api/export/database', { headers: auth }); expect(r.status).toBe(200); return bytes(r); };
  const list = async (x: ReturnType<typeof make>) => ((await (await x.app.request('/api/sync/pull?since=0', { headers: auth })).json()) as { records: { id: string; deleted: boolean; data: { title?: string } }[] }).records;

  it('exports a real SQLite file and merges it with last-writer-wins', async () => {
    await push(a, [rec('x', 10, { n: 1 }), rec('y', 10)]);
    const db = await exportDb();
    expect(db.subarray(0, 15).toString()).toBe('SQLite format 3');
    expect(readdirTmp(a.dir)).toEqual([]); // the snapshot is cleaned up
    await push(b, [rec('x', 99, { n: 2 }), rec('z', 5)]); // newer x on b must survive a merge
    const r = await (await b.app.request('/api/import/database', { method: 'POST', headers: auth, body: db })).json();
    expect(r).toMatchObject({ mode: 'merge', read: 2, applied: 1 });
    const recs = await list(b);
    expect(recs.map((x) => x.id).sort()).toEqual(['x', 'y', 'z']);
    expect(recs.find((x) => x.id === 'x')!.data).toMatchObject({ n: 2 });
  });

  it('replace makes the server match the backup and tombstones the rest so other devices follow', async () => {
    await push(a, [rec('x', 10, { n: 1 }), rec('y', 10)]);
    const db = await exportDb();
    await push(b, [rec('x', 99, { n: 2 }), rec('z', 5)]);
    const before = (await (await b.app.request('/api/status', { headers: auth })).json() as { cursor: number }).cursor;
    const r = await (await b.app.request('/api/import/database?mode=replace', { method: 'POST', headers: auth, body: db })).json();
    expect(r).toMatchObject({ mode: 'replace', written: 2, removed: 1 });
    const recs = await list(b);
    expect(recs.find((x) => x.id === 'x')!.data).toMatchObject({ n: 1 });
    expect(recs.find((x) => x.id === 'z')!.deleted).toBe(true);
    // a device that had synced up to `before` still sees every change
    const pulled = (await (await b.app.request(`/api/sync/pull?since=${before}`, { headers: auth })).json()) as { records: unknown[] };
    expect(pulled.records.length).toBe(3);
  });

  it('rejects files that are not a Curator database', async () => {
    expect((await b.app.request('/api/import/database', { method: 'POST', headers: auth, body: Buffer.from('hello, not a database at all') })).status).toBe(400);
    const other = await import('node:sqlite').catch(() => null);
    void other;
  });
});

function readdirTmp(dir: string): string[] { return existsSync(join(dir, 'tmp')) ? readdirSync(join(dir, 'tmp')) : []; }
