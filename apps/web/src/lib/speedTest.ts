import type { Api } from './api.ts';

export interface SpeedLine { label: string; ms: number | null; note: string }

/** Time until the first bytes of a response arrive (headers plus the first chunk), the figure a person feels as "it hangs before it starts". */
async function firstByte(f: typeof fetch, url: string, init: RequestInit): Promise<{ ms: number; status: number }> {
  const t0 = performance.now();
  const res = await f(url, init);
  const reader = res.body?.getReader();
  if (reader) { await reader.read(); void reader.cancel().catch(() => {}); } else await res.arrayBuffer();
  return { ms: Math.round(performance.now() - t0), status: res.status };
}

/**
 * Where the delay is: the server's own answer, the start of a song, a cover, and whether the Cloudflare Access token is accepted.
 * Runs from the page, so inside the Android app it measures the same path the page's images and sync take (through the app's proxy).
 */
export async function speedTest(api: Api, files: { audio?: string; cover?: string }, f: typeof fetch = fetch): Promise<SpeedLine[]> {
  const out: SpeedLine[] = [];
  const guard = async (label: string, run: () => Promise<{ ms: number; status: number }>, note: (r: { ms: number; status: number }) => string) => {
    try { const r = await run(); out.push({ label, ms: r.ms, note: note(r) }); } catch (e) { out.push({ label, ms: null, note: (e as Error).message === 'Failed to fetch' ? 'could not connect' : (e as Error).message }); }
  };
  const health = (url: string) => () => firstByte(f, url, { headers: api.access, cache: 'no-store' });
  const base = api.fileUrl('0'.repeat(64)).split('/api/')[0];
  await guard('Server answers', health(`${base}/api/health`), (r) => (r.status === 200 ? 'ok' : r.status === 302 || r.status === 401 || r.status === 403 ? `HTTP ${r.status}: Cloudflare Access is refusing the request, check the service token` : `HTTP ${r.status}`));
  await guard('Server answers again (connection reused)', health(`${base}/api/health`), () => 'a second request on a warm connection; far smaller than the first means the first was mostly the connection set-up');
  if (files.audio) await guard('A song starts', () => firstByte(f, api.fileUrl(files.audio!), { headers: { ...api.access, Range: 'bytes=0-65535' }, cache: 'no-store' }), (r) => (r.status === 206 || r.status === 200 ? 'first 64 KB of a track' : `HTTP ${r.status}`));
  if (files.cover) await guard('A cover arrives', () => firstByte(f, api.fileUrl(files.cover!), { headers: api.access, cache: 'no-store' }), (r) => (r.status === 200 ? 'a cover image' : `HTTP ${r.status}`));
  return out;
}
