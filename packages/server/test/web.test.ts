import { describe, it, expect } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';
import { serveWeb, webManifest } from '../src/web.ts';

describe('web manifest', () => {
  it('lists the build and its version changes with it', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'curator-web-'));
    mkdirSync(join(dir, 'assets'));
    writeFileSync(join(dir, 'index.html'), '<html>1</html>');
    writeFileSync(join(dir, 'assets', 'a-1.js'), 'x');
    writeFileSync(join(dir, 'assets', 'a-1.js.map'), 'map');
    const app = new Hono();
    serveWeb(app, dir);
    const m1 = await (await app.request('/web-manifest.json')).json() as Awaited<ReturnType<typeof webManifest>>;
    expect(m1.files.map((f) => f.path)).toEqual(['assets/a-1.js', 'index.html']);
    writeFileSync(join(dir, 'assets', 'a-2.js'), 'y');
    expect((await webManifest(dir)).version).not.toBe(m1.version);
    rmSync(dir, { recursive: true, force: true });
  });

  it('answers a missing file with 404 but app routes with the app', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'curator-web-'));
    writeFileSync(join(dir, 'index.html'), '<html>app</html>');
    const app = new Hono();
    serveWeb(app, dir);
    expect((await app.request('/albums/0190-abc')).status).toBe(200);
    expect(await (await app.request('/albums/0190-abc')).text()).toContain('app');
    expect((await app.request('/nothing.json')).status).toBe(404);
    expect((await app.request('/assets/gone.js')).status).toBe(404);
    rmSync(dir, { recursive: true, force: true });
  });
});
