import { describe, expect, it } from 'vitest';
import { Api } from '../src/lib/api.ts';
import { speedTest } from '../src/lib/speedTest.ts';

const body = () => new ReadableStream({ start(c) { c.enqueue(new Uint8Array([1, 2, 3])); c.close(); } });
describe('speedTest', () => {
  it('times each step and reports a refused Access token', async () => {
    const api = new Api({ serverUrl: 'https://music.example.com', token: 't', cfAccessId: 'id', cfAccessSecret: 'secret' });
    const seen: { url: string; headers: Record<string, string> }[] = [];
    const f = (async (url: string, init: RequestInit) => { seen.push({ url, headers: init.headers as Record<string, string> }); return new Response(body(), { status: url.includes('/api/health') ? 403 : 206 }); }) as unknown as typeof fetch;
    const lines = await speedTest(api, { audio: 'a'.repeat(64), cover: 'c'.repeat(64) }, f);
    expect(lines.map((l) => l.label)).toEqual(['Server answers', 'Server answers again (connection reused)', 'A song starts', 'A cover arrives']);
    expect(lines[0].note).toMatch(/Cloudflare Access is refusing/);
    expect(lines.every((l) => l.ms !== null)).toBe(true);
    // every request carries the service token, and the song request asks for a range
    expect(seen.every((s) => s.headers['CF-Access-Client-Id'] === 'id' && s.headers['CF-Access-Client-Secret'] === 'secret')).toBe(true);
    expect(seen[2].headers.Range).toBe('bytes=0-65535');
  });
  it('says so when the server cannot be reached', async () => {
    const api = new Api({ serverUrl: 'https://music.example.com', token: 't' });
    const lines = await speedTest(api, {}, (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch);
    expect(lines[0]).toMatchObject({ ms: null, note: 'could not connect' });
  });
});
