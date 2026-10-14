import { describe, expect, it } from 'vitest';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { editionOf, Matcher, parseAlbumSearch, scoreAlbum, thumbOf } from '../src/match.ts';

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

describe('perfect matches and editions', () => {
  it('a perfect match reads 100% even without a track count or uploader', () => {
    expect(scoreAlbum(a, { id: 'OLAK5uy_abc', title: 'Album - Take Care', channel: 'Drake', count: null })).toBe(1);
    expect(scoreAlbum(a, { id: 'OLAK5uy_abc', title: 'Take Care', channel: '', count: null })).toBeGreaterThan(0.85);
  });
  it('another edition of the album is still the album, and is labelled', () => {
    const deluxe = scoreAlbum(a, { id: 'OLAK5uy_dlx', title: 'Album - Take Care (Deluxe Edition)', channel: 'Drake', count: 20 });
    expect(deluxe).toBeGreaterThan(0.85);
    expect(editionOf('Take Care', 'Album - Take Care (Deluxe Edition)')).toBe('deluxe edition');
    expect(editionOf('Take Care', 'Album - Take Care')).toBe('');
  });
});

describe('search results', () => {
  it('reads YouTube Music album results (links without titles), keeps the search order and drops videos', () => {
    const c = parseAlbumSearch({ entries: [
      { id: 'dQw4w9WgXcQ', url: 'https://music.youtube.com/watch?v=dQw4w9WgXcQ', title: 'Take Care video' },
      { id: 'MPREb_first', url: 'https://music.youtube.com/browse/MPREb_first' },
      { id: 'OLAK5uy_second', url: 'https://music.youtube.com/playlist?list=OLAK5uy_second' },
      { id: 'MPREb_first', url: 'https://music.youtube.com/browse/MPREb_first' },
    ] }, a);
    expect(c.map((x) => x.url)).toEqual(['https://music.youtube.com/browse/MPREb_first', 'https://music.youtube.com/playlist?list=OLAK5uy_second']);
  });
  it('still understands playlist rows that carry a title', () => {
    const c = parseAlbumSearch({ entries: [
      { id: 'PLbad', title: 'Drake mix 2024', channel: 'Fan', playlist_count: 90 },
      { id: 'OLAK5uy_good', title: 'Album - Take Care', channel: 'Drake', playlist_count: 19 },
    ] }, a);
    expect(c[0].url).toBe('https://music.youtube.com/playlist?list=OLAK5uy_good');
    expect(c[0].count).toBe(19);
  });
});

describe('Matcher with a fake yt-dlp', () => {
  const dir = mkdtempSync(join(tmpdir(), 'match-'));
  const fake = join(dir, 'yt-dlp');
  // a search URL answers with two bare album links (as YouTube Music does); an album URL answers with its page
  writeFileSync(fake, `#!/bin/sh
echo "$@" >> "${dir}/argv.log"
case "$1" in
  *search*) echo '{"entries":[{"id":"MPREb_aaa","url":"https://music.youtube.com/browse/MPREb_aaa"},{"id":"MPREb_bbb","url":"https://music.youtube.com/browse/MPREb_bbb"}]}' ;;
  *MPREb_aaa*) echo '{"id":"OLAK5uy_aaa","title":"Views","channel":"Drake","entries":[{},{},{}]}' ;;
  *MPREb_bbb*) echo '{"id":"OLAK5uy_bbb","title":"Album - Take Care","channel":"Drake","entries":[{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{}]}' ;;
esac
`); chmodSync(fake, 0o755);
  it('searches YouTube Music albums, opens the results and ranks them by what they really are', async () => {
    const r = await new Matcher({ ytdlp: fake }).album(a);
    expect(r.candidates[0]).toMatchObject({ url: 'https://music.youtube.com/playlist?list=OLAK5uy_bbb', title: 'Album - Take Care', count: 19 });
    expect(r.candidates[1].title).toBe('Views');
    const argv = readFileSync(join(dir, 'argv.log'), 'utf8');
    expect(argv).toContain('https://music.youtube.com/search?q=Drake%20Take%20Care#albums');
    expect(argv).not.toContain('youtube.com/results'); // no longer the playlist search of the main site
  });
  it('reports a missing yt-dlp instead of throwing', async () => {
    const r = await new Matcher({ ytdlp: join(dir, 'missing') }).album(a);
    expect(r.candidates).toEqual([]);
    expect(r.error).toMatch(/not installed/);
  });
});

describe('thumbOf', () => {
  it('prefers the square album art over a bigger video frame', () => {
    const e = { thumbnails: [{ url: 'https://i.ytimg.com/vi/x/maxresdefault.jpg', width: 1280, height: 720 }, { url: 'https://lh3.googleusercontent.com/abc=w544-h544-l90-rj', width: 544, height: 544 }] };
    expect(thumbOf(e)).toBe('https://lh3.googleusercontent.com/abc=w300-h300-l90-rj');
  });
  it('falls back to the biggest picture when there is no square art', () => {
    expect(thumbOf({ thumbnails: [{ url: 'https://i.ytimg.com/a.jpg', width: 120, height: 90 }, { url: 'https://i.ytimg.com/b.jpg', width: 640, height: 480 }] })).toBe('https://i.ytimg.com/b.jpg');
    expect(thumbOf({ thumbnail: 'https://i.ytimg.com/c.jpg' })).toBe('https://i.ytimg.com/c.jpg');
    expect(thumbOf({})).toBeUndefined();
  });
});
