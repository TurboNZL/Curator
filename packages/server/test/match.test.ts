import { describe, expect, it } from 'vitest';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Matcher, parseAlbumSearch, scoreAlbum } from '../src/match.ts';

const a = { id: 'al1', title: 'Take Care', artist: 'Drake', trackCount: 19 };

describe('album scoring', () => {
  it('prefers the official album playlist with the right track count over a compilation or a live set', () => {
    const real = scoreAlbum(a, { id: 'OLAK5uy_abc', title: 'Album - Take Care', channel: 'Drake', count: 19 });
    const live = scoreAlbum(a, { id: 'PLxyz', title: 'Drake - Take Care (Live) full album', channel: 'Fan', count: 19 });
    const best = scoreAlbum(a, { id: 'PLbest', title: 'Drake best of playlist 2024 hits and more songs', channel: 'Fan', count: 60 });
    const other = scoreAlbum(a, { id: 'OLAK5uy_def', title: 'Album - Views', channel: 'Drake', count: 20 });
    expect(real).toBeGreaterThan(0.85);
    expect(real).toBeGreaterThan(live);
    expect(real).toBeGreaterThan(best);
    expect(real).toBeGreaterThan(other);
  });
  it('ignores accents and featuring tags', () => {
    expect(scoreAlbum({ id: 'x', title: 'Café (feat. Someone)', artist: 'Ärtist' }, { id: 'OLAK5uy_q', title: 'Album - Cafe', channel: 'Artist', count: null })).toBeGreaterThan(0.8);
  });
});

describe('search results', () => {
  it('turns playlist results into YouTube Music album links, best first, and drops plain videos', () => {
    const c = parseAlbumSearch({ entries: [
      { id: 'dQw4w9WgXcQ', title: 'Take Care video', channel: 'x' },
      { id: 'PLbad', title: 'Drake mix 2024', channel: 'Fan', playlist_count: 90 },
      { id: 'OLAK5uy_good', title: 'Album - Take Care', channel: 'Drake', playlist_count: 19 },
    ] }, a);
    expect(c.map((x) => x.url)).toEqual(['https://music.youtube.com/playlist?list=OLAK5uy_good', 'https://music.youtube.com/playlist?list=PLbad']);
    expect(c[0].count).toBe(19);
  });
});

describe('Matcher with a fake yt-dlp', () => {
  const dir = mkdtempSync(join(tmpdir(), 'match-'));
  const fake = join(dir, 'yt-dlp');
  writeFileSync(fake, `#!/bin/sh\necho "$@" > "${dir}/argv.log"\necho '{"entries":[{"id":"OLAK5uy_zzz","title":"Album - Take Care","channel":"Drake","playlist_count":19}]}'\n`); chmodSync(fake, 0o755);
  it('searches YouTube\'s playlist results for "artist album"', async () => {
    const r = await new Matcher({ ytdlp: fake }).album(a);
    expect(r.candidates[0]).toMatchObject({ url: 'https://music.youtube.com/playlist?list=OLAK5uy_zzz' });
    const argv = readFileSync(join(dir, 'argv.log'), 'utf8');
    expect(argv).toContain('search_query=Drake%20Take%20Care');
    expect(argv).toContain('sp=EgIQAw%253D%253D');
    expect(argv).toContain('--flat-playlist');
  });
  it('reports a missing yt-dlp instead of throwing', async () => {
    const r = await new Matcher({ ytdlp: join(dir, 'missing') }).album(a);
    expect(r.candidates).toEqual([]);
    expect(r.error).toMatch(/not installed/);
  });
});
