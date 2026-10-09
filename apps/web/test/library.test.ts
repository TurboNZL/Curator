import { describe, expect, it } from 'vitest';
import type { SyncRecord } from '@curator/core';
import { buildLibrary } from '../src/lib/library.ts';
import { centreSquare, contentBox, coverCrop } from '../src/lib/image.ts';
import { createHash, randomBytes } from 'node:crypto';
import { sha256Sync } from '../src/lib/sha256.ts';
import { thumbnailUrls, youtubeId } from '../src/lib/youtube.ts';
import { computeHealth } from '../src/lib/health.ts';
import { trackInfo } from '../src/lib/trackinfo.ts';
import { computeStats } from '../src/lib/stats.ts';
import { appendTrack, hasLead, leadArtistId, withLeadFallback, moveTrack, newAlbumData, newTrackData, removeTrack } from '../src/lib/defaults.ts';
import { pickPair } from '../src/lib/pairing.ts';

const rec = (table: string, id: string, data: object): SyncRecord => ({ table: table as never, id, updatedAt: 1, deviceId: 'd', deleted: false, data: data as never });
const rows = (...rs: SyncRecord[]) => {
  const out: Record<string, Map<string, SyncRecord>> = Object.fromEntries(
    ['artists', 'albums', 'releases', 'tracks', 'playlists', 'groups', 'genres', 'roleCategories', 'timeline', 'votes', 'playbackLogs', 'profiles', 'notes'].map((t) => [t, new Map()]));
  for (const r of rs) out[r.table].set(r.id, r);
  return out;
};
const track = (title: string, extra: object = {}) => ({
  title, artistId: 'a', credits: [], genres: [], albums: [{ albumId: 'al', order: 0 }], file: null, initialRating: null,
  syncWithAlbumCredits: true, isFavorite: false, ...extra });
const vote = (id: string, a: string, b: string, winner: string, t: number) =>
  rec('votes', id, { trackAId: a, trackBId: b, winnerId: winner, isEqual: false, timestamp: t });

describe('buildLibrary', () => {
  const base = [
    rec('artists', 'a', { name: 'Artist', image: null }),
    rec('albums', 'al', { title: 'Album', artistId: 'a', credits: [], genres: ['Hip Hop'], cover: null }),
    rec('tracks', 't1', track('One')), rec('tracks', 't2', track('Two')), rec('tracks', 't3', track('Three')),
  ];

  it('orders album tracks by the release tracklist when album_tracks.order is all 0 (real legacy data)', () => {
    const lib = buildLibrary(rows(...base, rec('releases', 'r', { albumId: 'al', title: 'R', cover: null, releaseDate: null, trackIds: ['t3', 't1', 't2'] })));
    expect(lib.albumById.get('al')!.trackIds).toEqual(['t3', 't1', 't2']);
  });

  it('takes genres from the album when the track syncs with it, and from itself otherwise', () => {
    const lib = buildLibrary(rows(...base.slice(0, 3), rec('tracks', 't9', track('Own', { syncWithAlbumCredits: false, genres: ['Jazz'] }))));
    expect(lib.trackById.get('t1')!.allGenres).toEqual(['Hip Hop']);
    expect(lib.trackById.get('t9')!.allGenres).toEqual(['Jazz']);
  });

  it('ignores deleted records', () => {
    const r = rows(...base);
    r.tracks.set('t2', { ...r.tracks.get('t2')!, deleted: true });
    expect(buildLibrary(r).tracks.map((t) => t.id).sort()).toEqual(['t1', 't3']);
  });

  it('derives rating from votes; shows initialRating until 3 comparisons; ranks 10-star tracks by Elo', () => {
    const vs = [1, 2, 3].map((i) => vote(`v${i}`, 't1', 't2', 't1', i));
    const lib = buildLibrary(rows(...base.slice(0, 3), rec('tracks', 't2', track('Two', { initialRating: 6 })), ...vs));
    const t1 = lib.trackById.get('t1')!, t2 = lib.trackById.get('t2')!;
    expect(t1.comparisons).toBe(3);
    expect(t1.effectiveRating).toBeCloseTo(10);
    expect(t1.tenStarRank).toBe(1);
    expect(t2.rating).toBeCloseTo(6); // floored by initialRating
    const few = buildLibrary(rows(...base.slice(0, 3), rec('tracks', 't2', track('Two', { initialRating: 6 })), vote('v', 't1', 't2', 't1', 1)));
    expect(few.trackById.get('t1')!.effectiveRating).toBe(0); // 1 comparison, no initial rating: unrated
    expect(few.trackById.get('t2')!.effectiveRating).toBe(6);
  });
});

describe('pickPair', () => {
  const mk = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `t${i}`, elo: 1000 + i * 10, comparisons: i }));
  it('needs two tracks and never pairs a track with itself', () => {
    expect(pickPair(mk(1))).toBeNull();
    for (let i = 0; i < 200; i++) { const [a, b] = pickPair(mk(30))!; expect(a.id).not.toBe(b.id); }
  });
  it('prefers least-compared tracks as A', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) { const p = pickPair(mk(100))!; seen.add(p[0].comparisons < 15 || p[1].comparisons < 15 ? 'low' : 'high'); }
    expect(seen.has('low')).toBe(true);
  });
  it('does not immediately repeat the previous pair when it can avoid it', () => {
    const t = mk(3);
    for (let i = 0; i < 100; i++) { const [a, b] = pickPair(t, Math.random, ['t0', 't1'])!; expect([a.id, b.id].sort()).not.toEqual(['t0', 't1']); }
  });
});

describe('computeStats', () => {
  it('totals plays, skips and listening time; ignores logs of deleted tracks in the top list', () => {
    const log = (id: string, trackId: string, duration: number, isSkip: boolean, timestamp: number) =>
      rec('playbackLogs', id, { trackId, timestamp, duration, sourceType: 'album', sourceId: null, isSkip });
    const lib = buildLibrary(rows(
      rec('artists', 'a', { name: 'A', image: null }),
      rec('tracks', 't1', track('One', { albums: [] })), rec('tracks', 't2', track('Two', { albums: [], file: 'h' })),
      log('l1', 't1', 100, false, 1), log('l2', 't1', 20, true, 2), log('l3', 't2', 50, false, 3), log('l4', 'gone', 999, false, 4)));
    const s = computeStats(lib);
    expect(s.plays).toBe(4);
    expect(s.skips).toBe(1);
    expect(s.skipRate).toBe(0.25);
    expect(s.secondsListened).toBe(1169);
    expect(s.topTracks.map((t) => t.id)).toEqual(['t1', 't2']);
    expect(s.topTracks[0]).toMatchObject({ seconds: 120, plays: 2 });
    expect(s.recent[0].trackId).toBe('gone');
    expect(s.withAudio).toBe(1);
  });
});

describe('album editing helpers', () => {
  it('moves, removes and appends without mutating', () => {
    const o = ['a', 'b', 'c'];
    expect(moveTrack(o, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveTrack(o, 2, 1)).toEqual(['a', 'c', 'b']);
    expect(moveTrack(o, 0, -1)).toBe(o);
    expect(removeTrack(o, 'b')).toEqual(['a', 'c']);
    expect(appendTrack(o, 'd')).toEqual(['a', 'b', 'c', 'd']);
    expect(appendTrack(o, 'a')).toBe(o);
    expect(o).toEqual(['a', 'b', 'c']);
  });
  it('an explicit trackOrder wins over the release order; unlisted tracks follow', () => {
    const base = [rec('artists', 'a', { name: 'A', image: null }), rec('tracks', 't1', track('One')), rec('tracks', 't2', track('Two')), rec('tracks', 't3', track('Three')),
      rec('releases', 'r', { albumId: 'al', title: 'R', cover: null, releaseDate: null, trackIds: ['t1', 't2', 't3'] })];
    const lib = buildLibrary(rows(...base, rec('albums', 'al', { ...newAlbumData({ title: 'Al', artistId: 'a' }), trackOrder: ['t3', 't1'] })));
    expect(lib.albumById.get('al')!.trackIds).toEqual(['t3', 't1', 't2']);
  });
  it('new tracks/albums are complete records', () => {
    const t = newTrackData({ title: 'x', artistId: 'a' });
    expect(t).toMatchObject({ file: null, albums: [], syncWithAlbumCredits: true, isFavorite: false, credits: [{ artistId: 'a', role: ['Lead artist'] }] });
    expect(newAlbumData({ title: 'y', artistId: 'a' }).genres).toEqual([]);
  });
});

describe('computeHealth', () => {
  const lib = buildLibrary(rows(
    rec('artists', 'a', { name: 'Used', image: null }), rec('artists', 'z', { name: 'Orphan', image: null }), rec('artists', 'c', { name: 'Credit Only', image: 'h' }),
    rec('albums', 'al', { title: 'Album', artistId: 'a', credits: [], genres: ['Rock'], cover: null }),
    rec('albums', 'empty', { title: 'Empty', artistId: 'a', credits: [], genres: [], cover: 'h' }),
    rec('tracks', 't1', track('Song', { genres: ['Pop'], credits: [{ artistId: 'c', role: ['Producer'] }], bitrate: '128kbps' })),
    rec('tracks', 't2', track('Song!', { albums: [], file: 'f', youtubeMusicUrl: 'u' })),
    rec('genres', 'g1', { name: 'Rock' }), rec('genres', 'g2', { name: 'Pop' }), rec('genres', 'g3', { name: 'Unused' }),
    rec('roleCategories', 'r1', { name: 'Producer', isRemovable: true }), rec('roleCategories', 'r2', { name: 'Lead artist', isRemovable: true }),
  ));
  const by = (id: string) => computeHealth(lib).find((c) => c.id === id)!.items.map((i) => i.id).sort();
  it('finds each kind of problem', () => {
    expect(by('no-audio')).toEqual(['t1']);
    expect(by('no-source')).toEqual(['t1']);
    expect(by('no-album')).toEqual(['t2']);
    expect(by('no-genre')).toEqual(['t2']);
    expect(by('low-quality')).toEqual(['t1']);
    expect(by('album-no-cover')).toEqual(['al']);
    expect(by('album-empty')).toEqual(['empty']);
    expect(by('duplicates')).toEqual(['t1', 't2']); // "Song" vs "Song!" normalise the same
  });
  it('never offers something in use for deletion (the legacy cleanup deleted roles that were in use)', () => {
    expect(by('artist-unused')).toEqual(['z']);       // 'c' is only a credit but is still used
    expect(by('genre-unused')).toEqual(['g3']);
    expect(by('role-unused')).toEqual(['r2']);        // 'Producer' is used by a credit
  });
});

describe('youtubeId', () => {
  it('reads the common URL shapes and rejects the rest', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=pAEInY3xPc4')).toBe('pAEInY3xPc4');
    expect(youtubeId('https://music.youtube.com/watch?v=pAEInY3xPc4&list=RDAMVM')).toBe('pAEInY3xPc4');
    expect(youtubeId('https://youtu.be/pAEInY3xPc4?t=3')).toBe('pAEInY3xPc4');
    expect(youtubeId('https://www.youtube.com/shorts/pAEInY3xPc4')).toBe('pAEInY3xPc4');
    for (const bad of [null, undefined, '', 'nope', 'https://example.com/watch?v=pAEInY3xPc4', 'https://www.youtube.com/watch?v=short']) expect(youtubeId(bad)).toBeNull();
    expect(thumbnailUrls('abcdefghijk')[1]).toBe('https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg');
  });
});

describe('cover cropping (YouTube thumbnails have black bars)', () => {
  /** w x h image: black, with a coloured rectangle (the picture) at the given box */
  function img(w: number, h: number, pic: { x: number; y: number; w: number; h: number }) {
    const d = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, inside = x >= pic.x && x < pic.x + pic.w && y >= pic.y && y < pic.y + pic.h;
      d[i] = inside ? 200 : 0; d[i + 1] = inside ? 120 : 0; d[i + 2] = inside ? 60 : 0; d[i + 3] = 255;
    }
    return d;
  }
  it('finds the picture inside letterbox and pillarbox bars', () => {
    expect(contentBox(img(480, 360, { x: 0, y: 45, w: 480, h: 270 }), 480, 360)).toEqual({ x: 0, y: 45, w: 480, h: 270 });
    expect(contentBox(img(1280, 720, { x: 280, y: 0, w: 720, h: 720 }), 1280, 720)).toEqual({ x: 280, y: 0, w: 720, h: 720 });
  });
  it('crops album art in a 16:9 frame to exactly the art; keeps images without bars whole', () => {
    expect(coverCrop(img(1280, 720, { x: 280, y: 0, w: 720, h: 720 }), 1280, 720)).toEqual({ x: 280, y: 0, w: 720, h: 720 });
    expect(coverCrop(img(300, 300, { x: 0, y: 0, w: 300, h: 300 }), 300, 300)).toEqual({ x: 0, y: 0, w: 300, h: 300 });
  });
  it('centre-squares a wide picture, and ignores an all-black or tiny result', () => {
    expect(centreSquare({ x: 0, y: 45, w: 480, h: 270 })).toEqual({ x: 105, y: 45, w: 270, h: 270 });
    const black = new Uint8ClampedArray(400 * 300 * 4).map((_, i) => (i % 4 === 3 ? 255 : 0));
    expect(coverCrop(black, 400, 300)).toEqual({ x: 0, y: 0, w: 400, h: 300 });
    expect(coverCrop(img(400, 300, { x: 100, y: 100, w: 20, h: 20 }), 400, 300)).toEqual({ x: 0, y: 0, w: 400, h: 300 });
  });
});

describe('sha256Sync (fallback for insecure origins)', () => {
  it('matches node:crypto for known vectors and every length around the block boundaries', () => {
    expect(sha256Sync(new Uint8Array())).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Sync(new TextEncoder().encode('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    for (const n of [1, 54, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 1000, 100_003]) {
      const buf = randomBytes(n);
      expect(sha256Sync(buf)).toBe(createHash('sha256').update(buf).digest('hex'));
    }
  });
});

describe('trackInfo', () => {
  it('counts wins/losses/draws, keeps votes against deleted tracks, and totals plays', () => {
    const lib = buildLibrary(rows(
      rec('artists', 'a', { name: 'A', image: null }), rec('tracks', 't1', track('One')), rec('tracks', 't2', track('Two')),
      vote('v1', 't1', 't2', 't1', 1), vote('v2', 't2', 't1', 't2', 2), rec('votes', 'v3', { trackAId: 't1', trackBId: 'ghost', winnerId: null, isEqual: true, timestamp: 3 }), vote('v4', 'x', 'y', 'x', 4),
      rec('playbackLogs', 'p1', { trackId: 't1', timestamp: 10, duration: 30, sourceType: 'album', sourceId: null, isSkip: false }),
      rec('playbackLogs', 'p2', { trackId: 't1', timestamp: 20, duration: 5, sourceType: 'album', sourceId: null, isSkip: true })));
    const i = trackInfo(lib, 't1');
    expect([i.wins, i.losses, i.draws]).toEqual([1, 1, 1]);
    expect(i.votes.map((v) => v.voteId)).toEqual(['v3', 'v2', 'v1']); // newest first, the unrelated v4 excluded
    expect(i.votes[0]).toMatchObject({ opponent: '(deleted track)', opponentExists: false, result: 'equal' });
    expect(i).toMatchObject({ plays: 2, skips: 1, secondsListened: 35, lastPlayed: 20 });
  });
});

describe('lead artist from credits', () => {
  const lead = (artistId: string, ...extra: string[]) => ({ artistId, role: ['Lead artist', ...extra] });
  it('picks the first lead credit (case-insensitive), then the stored artistId, then the first credit', () => {
    expect(leadArtistId([{ artistId: 'p', role: ['Producer'] }, { artistId: 'b', role: ['lead ARTIST'] }, lead('c')], 'old')).toBe('b');
    expect(leadArtistId([{ artistId: 'p', role: ['Producer'] }], 'old')).toBe('old');
    expect(leadArtistId([{ artistId: 'p', role: ['Producer'] }], '')).toBe('p');
    expect(leadArtistId([], 'old')).toBe('old');
    expect(hasLead([{ artistId: '', role: ['Lead artist'] }])).toBe(false); // blank editor row
  });
  it('backfills a lead credit for a legacy record that has the artist only in artistId', () => {
    expect(withLeadFallback([], 'a')).toEqual([lead('a')]);
    const kept = [{ artistId: 'a', role: ['Producer'] }, { artistId: 'x', role: ['Writer'] }];
    expect(withLeadFallback(kept, 'a')).toEqual([{ artistId: 'a', role: ['Lead artist', 'Producer'] }, kept[1]]);
    const has = [lead('z')];
    expect(withLeadFallback(has, 'a')).toBe(has);
  });
  const libFor = (albumCredits: object[], t: object) => buildLibrary(rows(
    rec('artists', 'a', { name: 'Old', image: null }), rec('artists', 'b', { name: 'Bee', image: null }), rec('artists', 'c', { name: 'Cee', image: null }),
    rec('albums', 'al', { title: 'Album', artistId: 'a', credits: albumCredits, genres: [], cover: null }), rec('tracks', 't', track('T', t))));
  it('shows every lead artist and follows the album for tracks that sync with it', () => {
    const lib = libFor([lead('b'), lead('c')], {});
    expect(lib.albumById.get('al')).toMatchObject({ artistId: 'b', artistName: 'Bee, Cee' });
    expect(lib.trackById.get('t')).toMatchObject({ artistId: 'b', artistName: 'Bee, Cee' });
  });
  it('keeps a legacy record (no credits) on its stored artist, and a track with its own credits on those', () => {
    expect(libFor([], {}).trackById.get('t')!.artistName).toBe('Old');
    const own = libFor([lead('b')], { syncWithAlbumCredits: false, credits: [lead('c')] });
    expect(own.trackById.get('t')).toMatchObject({ artistId: 'c', artistName: 'Cee' });
  });
  it('flags records with no lead credit in the health check', () => {
    const items = computeHealth(libFor([], {})).find((c) => c.id === 'no-lead')!.items;
    expect(items.map((i) => i.id).sort()).toEqual(['al', 't']);
    expect(computeHealth(libFor([lead('b')], {})).find((c) => c.id === 'no-lead')!.items).toEqual([]);
  });
});
