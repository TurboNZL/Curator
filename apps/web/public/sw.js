/*
 * Offline app shell. Library data lives in IndexedDB and offline audio in IndexedDB blobs; this only keeps
 * the page, scripts and styles so the app opens with no network. /api/* is never touched.
 * Bump CACHE when this file's strategy changes; hashed /assets/* files never need busting.
 */
const CACHE = 'curator-shell-v2'; // v2: drops the old logo that v1 kept forever

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const res = await fetch('/', { cache: 'no-cache' });
    const html = await res.clone().text();
    await cache.put('/', res);
    // the build's fingerprinted bundle(s) are referenced from index.html
    const assets = [...new Set(html.match(/\/assets\/[^"')\s]+/g) ?? [])];
    await Promise.all(['/manifest.webmanifest', '/icon.svg', ...assets].map((u) => cache.add(u).catch(() => undefined)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate') {
    // network first so a new build shows up; the cached shell when offline (the router handles every path)
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh.ok) (await caches.open(CACHE)).put('/', fresh.clone());
        return fresh;
      } catch { return (await caches.match('/')) ?? Response.error(); }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached && url.pathname === '/icon.svg') { // the logo is not fingerprinted: show the cached one, refresh it for next time
      event.waitUntil(fetch(req).then(async (r) => { if (r.ok) (await caches.open(CACHE)).put(req, r); }).catch(() => undefined));
      return cached;
    }
    if (cached) return cached; // fingerprinted assets are immutable
    const res = await fetch(req);
    if (res.ok && (url.pathname.startsWith('/assets/') || url.pathname === '/icon.svg')) (await caches.open(CACHE)).put(req, res.clone());
    return res;
  })());
});
