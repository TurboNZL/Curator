import { describe, expect, it } from 'vitest';
import type { SyncRecord } from '@curator/core';
import { buildLibrary } from '../src/lib/library.ts';
import { computeStats } from '../src/lib/stats.ts';
import { appendTrack, moveTrack, newAlbumData, newTrackData, removeTrack } from '../src/lib/defaults.ts';
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
