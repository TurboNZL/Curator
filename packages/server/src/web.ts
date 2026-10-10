import { createHash } from 'node:crypto';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import type { Hono } from 'hono';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.map': 'application/json',
};

/** Every file of the built client with its size, and a version that changes whenever the build does (the app updates its copy from this). */
export async function webManifest(root: string): Promise<{ version: string; files: { path: string; size: number }[] }> {
  const files: { path: string; size: number }[] = [];
  const walk = (dir: string, rel: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name), r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(full, r);
      else if (e.isFile() && !e.name.endsWith('.map')) files.push({ path: r, size: statSync(full).size });
    }
  };
  walk(root, '');
  files.sort((a, b) => a.path.localeCompare(b.path));
  const index = existsSync(join(root, 'index.html')) ? await readFile(join(root, 'index.html')) : Buffer.alloc(0);
  const version = createHash('sha256').update(index).update(JSON.stringify(files)).digest('hex').slice(0, 16);
  return { version, files };
}

/**
 * Serve the built web client (apps/web/dist) from the same origin as the API, so the Pi runs one process
 * and the browser needs no CORS or server URL. Unknown non-API paths get index.html (client-side routing).
 */
export function serveWeb(app: Hono, webDir: string) {
  const root = normalize(webDir);
  app.get('/web-manifest.json', async (c) => c.json(await webManifest(root), 200, { 'Cache-Control': 'no-cache' }));
  app.get('*', async (c, next) => {
    const path = decodeURIComponent(new URL(c.req.url).pathname);
    if (path.startsWith('/api/')) return next();
    const candidate = normalize(join(root, path));
    const inside = candidate === root || candidate.startsWith(root + sep);
    const exists = inside && existsSync(candidate) && statSync(candidate).isFile();
    // a path that names a file (has an extension) but does not exist is a 404, not the app: asking an older server for
    // /web-manifest.json used to answer 200 with index.html, which clients then failed to read as JSON
    if (!exists && /\.[A-Za-z0-9]{1,8}$/.test(path)) return c.notFound();
    const file = exists ? candidate : join(root, 'index.html');
    if (!existsSync(file)) return next();
    const immutable = file !== join(root, 'index.html') && path.startsWith('/assets/'); // vite fingerprints these
    return new Response(await readFile(file), {
      headers: { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache' },
    });
  });
}
