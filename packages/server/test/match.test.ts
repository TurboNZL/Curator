import { describe, expect, it } from 'vitest';
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Matcher, odesli, parseSearch, scoreCandidate } from '../src/match.ts';

const t = { id: '1', title: 'Get It Together', artist: 'Drake', durationMs: 250337, spotifyUrl: 'https://open.spotify.com/track/7y6c07pgjZvtHI9kuMVqk1' };

describe('scoring', () => {
  it('prefers the real song, the Topic channel and the right length', () => {
    const real = scoreCandidate(t, { title: 'Get It Together', channel: 'Drake - Topic', seconds: 250 });
    const live = scoreCandidate(t, { title: 'Drake - Get It Together (Live)', channel: 'Some Fan', seconds: 250 });
    const other = scoreCandidate(t, { title: 'Totally different', channel: 'Drake', seconds: 250 });
    const wrongLength = scoreCandidate(t, { title: 'Get It Together', channel: 'Drake - Topic', seconds: 60 });
    expect(real).toBeGreaterThan(0.9);
    expect(real).toBeGreaterThan(live);
    expect(live).toBeGreaterThan(other);
    expect(real).toBeGreaterThan(wrongLength);
  });
  it('ignores featuring tags and accents', () => {
    expect(scoreCandidate({ id: 'x', title: 'Café (feat. Someone)', artist: 'Ärtist' }, { title: 'Cafe', channel: 'Artist - Topic', seconds: null })).toBeGreaterThan(0.8);
  });
  it('ranks search results', () => {
    const c = parseSearch({ entries: [{ id: 'bad', title: 'Drake - Get It Together (Slowed)', channel: 'x', duration: 300 }, { id: 'good', title: 'Get It Together', channel: 'Drake - Topic', duration: 250 }] }, t);
    expect(c[0].url).toBe('https://music.youtube.com/watch?v=good');
  });
});

describe('song.link', () => {
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status });
  it('returns the YouTube Music link', async () => {
    const f = (async () => json({ entityUniqueId: 'S', entitiesByUniqueId: { S: { title: 'Get It Together', artistName: 'Drake' } }, linksByPlatform: { youtube: { url: 'https://youtube.com/watch?v=a' }, youtubeMusic: { url: 'https://music.youtube.com/watch?v=b' } } })) as unknown as typeof fetch;
    expect(await odesli(t.spotifyUrl, f)).toMatchObject({ url: 'https://music.youtube.com/watch?v=b', method: 'odesli' });
  });
  it('is quiet when unknown, loud when rate limited', async () => {
    expect(await odesli(t.spotifyUrl, (async () => json({}, 404)) as unknown as typeof fetch)).toBeNull();
    await expect(odesli(t.spotifyUrl, (async () => json({}, 429)) as unknown as typeof fetch)).rejects.toThrow(/rate/);
  });
});

describe('Matcher with a fake yt-dlp', () => {
  const dir = mkdtempSync(join(tmpdir(), 'match-'));
  const fake = join(dir, 'yt-dlp');
  writeFileSync(fake, `#!/bin/sh\necho '{"entries":[{"id":"zzz","title":"Get It Together","channel":"Drake - Topic","duration":251}]}'\n`); chmodSync(fake, 0o755);
  it('tries song.link first and stops when it has an answer', async () => {
    const f = (async () => new Response(JSON.stringify({ linksByPlatform: { youtubeMusic: { url: 'https://music.youtube.com/watch?v=od' } } }))) as unknown as typeof fetch;
    const r = await new Matcher({ ytdlp: fake, fetchImpl: f }).match(t, ['odesli', 'search']);
    expect(r.candidates.map((c) => c.method)).toEqual(['odesli']);
  });
  it('falls back to search when song.link has nothing', async () => {
    const f = (async () => new Response('{}', { status: 404 })) as unknown as typeof fetch;
    const r = await new Matcher({ ytdlp: fake, fetchImpl: f }).match(t, ['odesli', 'search']);
    expect(r.candidates[0]).toMatchObject({ url: 'https://music.youtube.com/watch?v=zzz', method: 'search' });
  });
  it('reports a missing yt-dlp instead of throwing', async () => {
    const r = await new Matcher({ ytdlp: join(dir, 'missing') }).match({ ...t, spotifyUrl: null }, ['search']);
    expect(r.candidates).toEqual([]);
    expect(r.error).toMatch(/not installed/);
  });
});
