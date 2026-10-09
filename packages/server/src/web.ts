import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import type { Hono } from 'hono';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.map': 'application/json',
};

/**
 * Serve the built web client (apps/web/dist) from the same origin as the API, so the Pi runs one process
 * and the browser needs no CORS or server URL. Unknown non-API paths get index.html (client-side routing).
 */
export function serveWeb(app: Hono, webDir: string) {
  const root = normalize(webDir);
  app.get('*', async (c, next) => {
    const path = decodeURIComponent(new URL(c.req.url).pathname);
    if (path.startsWith('/api/')) return next();
    const candidate = normalize(join(root, path));
    const inside = candidate === root || candidate.startsWith(root + sep);
    const file = inside && existsSync(candidate) && statSync(candidate).isFile() ? candidate : join(root, 'index.html');
    if (!existsSync(file)) return next();
    const immutable = file !== join(root, 'index.html') && path.startsWith('/assets/'); // vite fingerprints these
    return new Response(await readFile(file), {
      headers: { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache' },
    });
  });
}
