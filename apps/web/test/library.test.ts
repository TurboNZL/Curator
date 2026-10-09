import { describe, expect, it } from 'vitest';
import type { SyncRecord } from '@curator/core';
import { buildLibrary } from '../src/lib/library.ts';
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
