import { describe, expect, it } from 'vitest';
import type { SyncRecord } from '@curator/core';
import { buildLibrary } from '../src/lib/library.ts';
import { buildListens } from '../src/lib/listens.ts';
import { computeListenStats } from '../src/lib/listenStats.ts';
import { makeChip } from '../src/lib/filters.ts';
import { DEFAULT_FILTER, activeCount, applyFilter, filterRange, platformsOf } from '../src/lib/statsFilter.ts';

const rec = (table: string, id: string, data: object): SyncRecord => ({ table: table as never, id, updatedAt: 1, deviceId: 'd', deleted: false, data: data as never });
const rows = (...rs: SyncRecord[]) => {
  const out: Record<string, Map<string, SyncRecord>> = Object.fromEntries(
    ['artists', 'eras', 'noteCategories', 'albums', 'releases', 'tracks', 'playlists', 'groups', 'genres', 'roleCategories', 'timeline', 'votes', 'playbackLogs', 'profiles', 'notes'].map((t) => [t, new Map()]));
  for (const r of rs) out[r.table].set(r.id, r);
  return out;
};
const lead = (a: string) => [{ artistId: a, role: ['Lead artist'] }];
const at = (d: number, h: number) => new Date(2026, 5, d, h, 0, 0).getTime();
const log = (id: string, trackId: string, ts: number, o: object = {}) => rec('playbackLogs', id, { trackId, timestamp: ts, duration: 200, isSkip: false, ...o });
const spotify = (id: string, ts: number, name: string, artist: string) => rec('playbackLogs', id, { trackId: '', timestamp: ts, duration: 120, imported: 'spotify', name, artist, album: 'X', platform: 'Android', uri: 'spotify:track:abcdefghijklmnopqrstuv' });

const lib = buildLibrary(rows(
  rec('artists', 'a', { name: 'Ann', image: null }), rec('artists', 'b', { name: 'Bob', image: null }),
  rec('tracks', 't1', { title: 'One', credits: lead('a'), genres: [], albums: [{ albumId: 'al', order: 0 }], file: 'f', initialRating: null, syncWithAlbumCredits: false }),
  rec('tracks', 't2', { title: 'Two', credits: lead('b'), genres: [], albums: [], file: 'f2', initialRating: null, syncWithAlbumCredits: false }),
  rec('albums', 'al', { title: 'Album', credits: lead('a'), genres: [], cover: null, trackOrder: ['t1'] }),
  log('l1', 't1', at(2, 9)), log('l2', 't1', at(3, 20), { isSkip: true, duration: 4 }), log('l3', 't2', at(6, 23)), log('l4', 't2', at(7, 13)),
  spotify('s1', at(8, 10), 'Elsewhere', 'Zed'),
));
const all = buildListens(lib);

describe('stats filters', () => {
  it('no filter keeps everything, and a library play knows its artist and album for linking', () => {
    expect(applyFilter(lib, all, DEFAULT_FILTER)).toHaveLength(5);
    const l = all.find((x) => x.id === 'l1')!;
    expect([l.artistId, l.albumId]).toEqual(['a', 'al']);
  });
  it('source, skips, library only and platform', () => {
    expect(applyFilter(lib, all, { ...DEFAULT_FILTER, source: 'spotify' }).map((l) => l.id)).toEqual(['s1']);
    expect(applyFilter(lib, all, { ...DEFAULT_FILTER, skips: 'skipped' }).map((l) => l.id)).toEqual(['l2']);
    expect(applyFilter(lib, all, { ...DEFAULT_FILTER, libraryOnly: true })).toHaveLength(4);
    expect(applyFilter(lib, all, { ...DEFAULT_FILTER, platform: 'Android' }).map((l) => l.id)).toEqual(['s1']);
    expect(platformsOf(all)).toEqual(['Curator', 'Android']);
  });
  it('time of day and weekdays/weekends (June 2026: the 6th and 7th are a weekend)', () => {
    expect(applyFilter(lib, all, { ...DEFAULT_FILTER, dayPart: 'night' }).map((l) => l.id)).toEqual(['l3']);
    expect(applyFilter(lib, all, { ...DEFAULT_FILTER, days: 'weekends' }).map((l) => l.id).sort()).toEqual(['l3', 'l4']);
    expect(applyFilter(lib, all, { ...DEFAULT_FILTER, days: 'weekdays' })).toHaveLength(3);
  });
  it('words and library chips (chips drop plays that are not in the library)', () => {
    expect(applyFilter(lib, all, { ...DEFAULT_FILTER, text: 'elsewhere' }).map((l) => l.id)).toEqual(['s1']);
    const byAnn = makeChip(lib, 'artist', 'Ann')!;
    expect(applyFilter(lib, all, { ...DEFAULT_FILTER, chips: [byAnn] }).map((l) => l.id)).toEqual(['l1', 'l2']);
  });
  it('a custom range includes both days; presets still work', () => {
    const r = filterRange({ ...DEFAULT_FILTER, range: 'custom', from: '2026-06-03', to: '2026-06-06' });
    const s = computeListenStats(all, r, { minMs: 30_000 });
    expect(s.plays).toBe(1); // l2 (3rd) is only 4 s and l1 is before the range; l3 at 23:00 on the last day is inside it
    expect(filterRange({ ...DEFAULT_FILTER, range: 'custom', from: 'nonsense' })).toEqual({});
  });
  it('top lists group library plays by id and carry it for links', () => {
    const s = computeListenStats(all, {}, {});
    const row = s.topArtists.find((r) => r.label === 'Ann')!;
    expect([row.id, row.plays]).toEqual(['a', 2]);
    expect(s.topTracks.find((r) => r.id === 't1')?.plays).toBe(2);
    expect(s.topArtists.find((r) => r.label === 'Zed')?.id).toBeNull();
  });
  it('counts what is narrowing', () => { expect(activeCount(DEFAULT_FILTER)).toBe(0); expect(activeCount({ ...DEFAULT_FILTER, source: 'curator', text: 'a' })).toBe(2); });
});
