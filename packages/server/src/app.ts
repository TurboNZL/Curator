import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { pushSchema, sha256Hex, type PullResponse } from '@curator/core';
import type { Config } from './config.ts';
import { Store } from './db.ts';
import { Acquirer } from './acquire.ts';
import { analyzeAudio } from './audioinfo.ts';
import { ImportError, Importer } from './import.ts';
import { serveWeb } from './web.ts';
import { Updater } from './update.ts';
import { streamSSE } from 'hono/streaming';
import { ConnectHub, parseCommand, parseSnapshot } from './connect.ts';
import { checkTools } from './tools.ts';
import { BackupError, databaseSnapshot, filesArchive, importFiles, readDatabaseRecords, readStream, saveUpload } from './backup.ts';
import { Readable } from 'node:stream';
import { rmSync } from 'node:fs';
import { diskUsage, filePath, parseRange, saveVerified, streamFile, UploadError } from './files.ts';

export const API_VERSION = 1;

function tokenOk(given: string | undefined, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createApp(
  config: Config, store: Store,
  acquirer = new Acquirer({ dataDir: config.dataDir, store, ytdlp: config.ytdlp, ytdlpArgs: config.ytdlpArgs, ffmpegDir: config.ffmpegDir }),
  importer = new Importer({ dataDir: config.dataDir, store, ytdlp: config.ytdlp, ytdlpArgs: config.ytdlpArgs }),
  hub = new ConnectHub(),
  updater = new Updater({ script: config.updateScript, restart: config.updateRestart, exit: () => process.exit(1) }),
) {
  const app = new Hono();

  // Native apps ignore CORS; browsers need it because the web client may be served from another origin.
  app.use('*', cors({ origin: '*', allowHeaders: ['Authorization', 'Content-Type', 'Range'], exposeHeaders: ['Content-Range', 'Accept-Ranges'] }));

  // Unauthenticated, reveals nothing but liveness, so clients can probe "is the server reachable?".
  app.get('/api/health', (c) => c.json({ ok: true, apiVersion: API_VERSION }));

  // Everything else needs the token. `?token=` exists because <audio src> cannot set headers.
  app.use('/api/*', async (c, next) => {
    const bearer = c.req.header('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!tokenOk(bearer ?? c.req.query('token'), config.token)) return c.json({ error: 'unauthorized' }, 401);
    await next();
  });

  app.get('/api/status', async (c) => {
    const files = store.listFiles();
    return c.json({
      apiVersion: API_VERSION,
      cursor: store.cursor(),
      files: { count: files.length, bytes: files.reduce((n, f) => n + f.size, 0) },
      disk: diskUsage(config.dataDir),
      tools: { ...(await checkTools({ ytdlp: config.ytdlp, ffmpegDir: config.ffmpegDir })), cookies: !!config.ytdlpArgs?.includes('--cookies') },
    });
  });

  // ---- Update server (update.ts): only offered when this is a service install of a git checkout ----
  app.get('/api/admin/update', (c) => c.json({ available: updater.available, restarts: updater.restarts, ...updater.state() }));
  app.post('/api/admin/update', (c) => {
    if (!updater.available) return c.json({ error: 'This server cannot update itself (it is not a service install of the git checkout).' }, 404);
    if (!updater.start()) return c.json({ error: 'An update is already running.' }, 409);
    return c.json({ ok: true }, 202);
  });

  // ---- Connect: see the other devices, control them, move playback between them (connect.ts) ----
  app.get('/api/connect/stream', (c) => {
    const id = c.req.query('device') ?? '';
    if (!id) return c.json({ error: 'device missing' }, 400);
    return streamSSE(c, async (stream) => {
      const queue: string[] = [];
      let wake: (() => void) | null = null;
      const close = hub.connect({ id, name: c.req.query('name') ?? '', kind: c.req.query('kind') ?? 'web' }, (ev) => { queue.push(JSON.stringify(ev)); wake?.(); });
      let open = true;
      stream.onAbort(() => { open = false; wake?.(); });
      try {
        while (open) {
          while (queue.length) await stream.writeSSE({ event: 'connect', data: queue.shift()! });
          // a comment-sized ping every 20 s keeps proxies from closing an idle stream
          await Promise.race([new Promise<void>((r) => { wake = r; }), new Promise<void>((r) => setTimeout(r, 20_000))]);
          if (open && !queue.length) await stream.writeSSE({ event: 'ping', data: '1' });
        }
      } finally { close(); }
    });
  });
  app.get('/api/connect/devices', (c) => c.json({ devices: hub.list() }));
  app.post('/api/connect/state', async (c) => {
    const b = (await c.req.json().catch(() => null)) as { device?: unknown; name?: unknown; state?: unknown } | null;
    if (typeof b?.device !== 'string') return c.json({ error: 'device missing' }, 400);
    const state = b.state == null ? null : parseSnapshot(b.state);
    if (b.state != null && !state) return c.json({ error: 'bad state' }, 400);
    return hub.report(b.device, state, typeof b.name === 'string' ? b.name : undefined) ? c.json({ ok: true }) : c.json({ error: 'device not connected' }, 404);
  });
  app.post('/api/connect/command', async (c) => {
    const b = (await c.req.json().catch(() => null)) as { from?: unknown; to?: unknown; command?: unknown } | null;
    const command = parseCommand(b?.command);
    if (typeof b?.from !== 'string' || typeof b.to !== 'string' || !command) return c.json({ error: 'invalid command' }, 400);
    return hub.command(b.from, b.to, command) ? c.json({ ok: true }) : c.json({ error: 'That device is offline' }, 404);
  });

  app.get('/api/sync/pull', (c) => {
    const since = Number(c.req.query('since') ?? 0);
    const limit = Math.min(Number(c.req.query('limit') ?? 1000), 5000);
    if (!Number.isFinite(since) || since < 0) return c.json({ error: 'bad since' }, 400);
    const res: PullResponse = store.pull(since, limit);
    return c.json(res);
  });

  app.post('/api/sync/push', async (c) => {
    const parsed = pushSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: 'invalid body', issues: parsed.error.issues.slice(0, 5) }, 400);
    return c.json(store.push(parsed.data.records));
  });

  // Re-download audio for tracks that have a source URL but no file (e.g. after losing the old uploads folder).
  // ---- audio check: what a file really is (bit rate, codec, highest frequency with sound), for the "fake 320" check in Health ----
  app.post('/api/audio/analyze', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { hash?: unknown };
    const hash = typeof body.hash === 'string' ? body.hash : '';
    if (!/^[0-9a-f]{64}$/.test(hash)) return c.json({ error: 'bad hash' }, 400);
    const path = store.hasFile(hash) && filePath(config.dataDir, hash);
    if (!path || !existsSync(path)) return c.json({ error: 'no such file' }, 404);
    return c.json(await analyzeAudio(path, { ffmpegDir: config.ffmpegDir }));
  });

  app.post('/api/acquire', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { trackIds?: unknown };
    const ids = Array.isArray(body.trackIds) ? body.trackIds.filter((x): x is string => typeof x === 'string') : undefined;
    return c.json({ queued: acquirer.enqueueMissing(ids).length });
  });
  app.get('/api/acquire', (c) => {
    const jobs = [...acquirer.jobs.values()];
    const count = (s: string) => jobs.filter((j) => j.state === s).length;
    return c.json({ queued: count('queued'), running: count('running'), done: count('done'), failed: count('failed'),
      failures: jobs.filter((j) => j.state === 'failed').slice(-20).map(({ trackId, error }) => ({ trackId, error })) });
  });

  // Album import step 1: look up a YouTube/playlist link (metadata only) so the user can review before anything downloads.
  app.post('/api/import/preview', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { url?: unknown };
    try { return c.json(await importer.preview(body.url)); }
    catch (e) { if (e instanceof ImportError) return c.json({ error: e.message }, e.status as 400); throw e; }
  });
  // Step 2: save the suggested cover image (YouTube image hosts only) and return its file hash.
  app.post('/api/import/cover', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { url?: unknown; urls?: unknown };
    try { return c.json(await importer.fetchFirstCover(Array.isArray(body.urls) ? body.urls : [body.url])); }
    catch (e) { if (e instanceof ImportError) return c.json({ error: e.message }, e.status as 400); throw e; }
  });

  // Backups. The database (the library: records only) and the data folder (audio and images) are separate downloads and uploads.
  // `?token=` works here too, so the browser can save a download straight to disk without holding it in memory.
  const stamp = () => new Date().toISOString().slice(0, 10);
  app.get('/api/export/database', (c) => {
    const snap = databaseSnapshot(config.dataDir, store);
    const stream = readStream(snap.path);
    stream.on('close', () => rmSync(snap.path, { force: true }));
    return new Response(Readable.toWeb(stream) as unknown as ReadableStream, { headers: {
      'Content-Type': 'application/vnd.sqlite3', 'Content-Length': String(snap.size), 'Content-Disposition': `attachment; filename="curator-database-${stamp()}.db"` } });
  });
  app.post('/api/import/database', async (c) => {
    const mode = c.req.query('mode') === 'replace' ? 'replace' : 'merge';
    if (!c.req.raw.body) return c.json({ error: 'empty body' }, 400);
    let path: string | undefined;
    try {
      path = await saveUpload(config.dataDir, c.req.raw.body as never, 2 * 1024 * 1024 * 1024);
      const records = readDatabaseRecords(path);
      if (mode === 'replace') return c.json({ mode, ...store.replaceWith(records), cursor: store.cursor() });
      const done = store.push(records);
      return c.json({ mode, read: records.length, applied: done.applied, cursor: done.cursor });
    } catch (e) {
      if (e instanceof BackupError) return c.json({ error: e.message }, e.status as 400 | 413);
      throw e;
    } finally { if (path) rmSync(path, { force: true }); }
  });
  app.get('/api/export/files', (c) => {
    const archive = filesArchive(config.dataDir, store);
    return new Response(Readable.toWeb(Readable.from(archive.chunks)) as unknown as ReadableStream, { headers: {
      'Content-Type': 'application/x-tar', 'Content-Length': String(archive.length), 'Content-Disposition': `attachment; filename="curator-files-${stamp()}.tar"` } });
  });
  app.post('/api/import/files', async (c) => {
    if (!c.req.raw.body) return c.json({ error: 'empty body' }, 400);
    try { return c.json(await importFiles(config.dataDir, store, Readable.fromWeb(c.req.raw.body as never))); }
    catch (e) { if (e instanceof BackupError) return c.json({ error: e.message }, e.status as 400 | 413); throw e; }
  });

  app.get('/api/files', (c) => c.json(store.listFiles()));

  app.on('HEAD', '/api/files/:hash', (c) => {
    const info = sha256Hex.test(c.req.param('hash')) ? store.fileInfo(c.req.param('hash')) : undefined;
    return info ? new Response(null, { status: 200, headers: { 'Content-Length': String(info.size), 'Content-Type': info.mime } }) : c.body(null, 404);
  });

  app.put('/api/files/:hash', async (c) => {
    const hash = c.req.param('hash');
    if (!sha256Hex.test(hash)) return c.json({ error: 'hash must be lowercase sha256 hex' }, 400);
    if (store.hasFile(hash)) return c.json({ ok: true, existed: true });
    if (!c.req.raw.body) return c.json({ error: 'empty body' }, 400);
    const declared = Number(c.req.header('Content-Length'));
    if (declared > config.maxUploadBytes) return c.json({ error: 'File too large' }, 413);
    try {
      const size = await saveVerified(config.dataDir, hash, c.req.raw.body as never, config.maxUploadBytes);
      store.addFile(hash, size, c.req.header('Content-Type') ?? 'application/octet-stream');
      return c.json({ ok: true, existed: false, size });
    } catch (e) {
      if (e instanceof UploadError) return c.json({ error: e.message }, e.status as 413 | 422);
      throw e;
    }
  });

  app.get('/api/files/:hash', (c) => {
    const hash = c.req.param('hash');
    const info = sha256Hex.test(hash) ? store.fileInfo(hash) : undefined;
    const path = info && filePath(config.dataDir, hash);
    if (!info || !path || !existsSync(path)) return c.json({ error: 'not found' }, 404);

    const headers: Record<string, string> = {
      'Content-Type': info.mime, 'Accept-Ranges': 'bytes',
      // content-addressed => the bytes can never change
      'Cache-Control': 'public, max-age=31536000, immutable', ETag: `"${hash}"`,
    };
    const range = parseRange(c.req.header('Range'), info.size);
    if (range === 'invalid') return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${info.size}` } });
    if (range) {
      return new Response(streamFile(path, range), {
        status: 206,
        headers: { ...headers, 'Content-Length': String(range.end - range.start + 1), 'Content-Range': `bytes ${range.start}-${range.end}/${info.size}` },
      });
    }
    return new Response(streamFile(path), { status: 200, headers: { ...headers, 'Content-Length': String(info.size) } });
  });

  if (config.webDir) serveWeb(app, config.webDir);

  app.notFound((c) => c.json({ error: 'not found' }, 404));
  app.onError((e, c) => {
    console.error(e);
    return c.json({ error: 'internal error' }, 500);
  });
  return app;
}
