import { describe, expect, it } from 'vitest';
import type { SyncRecord } from '@turbomusic/core';
import { buildLibrary } from '../src/lib/library.ts';
import { artistSubject, eraSubject, filterKeys, makeChip, matchesAll, splitTyped } from '../src/lib/filters.ts';
import { ALBUM_SORTS, ARTIST_SORTS, artistRows, eraRows, sortAlbums, sortArtists, sortEras } from '../src/lib/listSort.ts';

const rec = (table: string, id: string, data: object): SyncRecord => ({ table: table as never, id, updatedAt: 1, deviceId: 'd', deleted: false, data: data as never });
const rows = (...rs: SyncRecord[]) => {
  const out: Record<string, Map<string, SyncRecord>> = Object.fromEntries(
    ['artists', 'eras', 'noteCategories', 'albums', 'releases', 'tracks', 'playlists', 'groups', 'genres', 'roleCategories', 'timeline', 'votes', 'playbackLogs', 'profiles', 'notes'].map((t) => [t, new Map()]));
  for (const r of rs) out[r.table].set(r.id, r);
  return out;
};
const lead = (artistId: string) => [{ artistId, role: ['Lead artist'] }];
const track = (title: string, artist: string, albumId: string | null, extra: object = {}) => ({
  title, credits: lead(artist), genres: ['Rap'], albums: albumId ? [{ albumId, order: 0 }] : [], file: null, initialRating: null, syncWithAlbumCredits: false, ...extra });

const lib = buildLibrary(rows(
  rec('artists', 'a1', { name: 'Alpha', image: null }), rec('artists', 'a2', { name: 'Beta', image: 'h' }),
  rec('albums', 'al1', { title: 'First', credits: lead('a1'), genres: ['Rap'], cover: null }),
  rec('albums', 'al2', { title: 'Second', credits: lead('a2'), genres: ['Pop'], cover: null }),
  rec('releases', 'r1', { albumId: 'al1', title: 'F', cover: null, releaseDate: '2018-05-01', trackIds: ['t1', 't2'] }),
  rec('releases', 'r2', { albumId: 'al2', title: 'S', cover: null, releaseDate: '2022', trackIds: ['t3'] }),
  rec('tracks', 't1', track('One', 'a1', 'al1', { memories: 2, initialRating: 8 })), rec('tracks', 't2', track('Two', 'a1', 'al1')),
  rec('tracks', 't3', track('Three', 'a2', 'al2', { genres: ['Pop'] })), rec('tracks', 't4', track('Loose', 'a2', null)),
  rec('eras', 'e1', { name: 'Early', description: '', cover: null, albumIds: ['al1'], trackIds: [], playlistIds: [] }),
  rec('eras', 'e2', { name: 'Late', description: '', cover: null, albumIds: ['al2'], trackIds: ['t4'], playlistIds: [] }),
));

describe('filters on every list page', () => {
  it('offers only the keys that make sense for a page', () => {
    expect(filterKeys('artists')).not.toContain('artist');
    expect(filterKeys('albums')).not.toContain('album');
    expect(filterKeys('tracks')).toContain('album');
    expect(filterKeys('singles')).not.toContain('album');
  });
  it('a key that does not apply is plain text on that page', () => {
    expect(splitTyped('album: x', 'albums')).toBeNull();
    expect(splitTyped('album: x', 'tracks')).toEqual({ key: 'album', rest: 'x' });
  });
  it('filters artists by era, genre and release date through what they made', () => {
    const era = makeChip(lib, 'era', 'Early')!;
    expect(lib.artists.filter((a) => matchesAll([era], artistSubject(lib, a.id))).map((a) => a.name)).toEqual(['Alpha']);
    const pop = makeChip(lib, 'genre', 'Pop')!;
    expect(lib.artists.filter((a) => matchesAll([pop], artistSubject(lib, a.id))).map((a) => a.name)).toEqual(['Beta']);
    const before = makeChip(lib, 'before', '2020')!;
    expect(lib.artists.filter((a) => matchesAll([before], artistSubject(lib, a.id))).map((a) => a.name)).toEqual(['Alpha']);
    expect(matchesAll([makeChip(lib, 'has', 'cover')!], artistSubject(lib, 'a2'))).toBe(true);
    expect(matchesAll([makeChip(lib, 'has', 'cover')!], artistSubject(lib, 'a1'))).toBe(false);
  });
  it('filters eras by artist and date', () => {
    const artist = makeChip(lib, 'artist', 'Beta')!;
    expect(lib.eras.filter((e) => matchesAll([artist], eraSubject(lib, e))).map((e) => e.name)).toEqual(['Late']);
    const after = makeChip(lib, 'after', '2020')!;
    expect(lib.eras.filter((e) => matchesAll([after], eraSubject(lib, e))).map((e) => e.name)).toEqual(['Late']);
  });
});

describe('sorting the other pages', () => {
  it('albums: missing ratings last either way, dates descending first', () => {
    expect(sortAlbums(lib, lib.albums, 'released', 'desc').map((a) => a.title)).toEqual(['Second', 'First']);
    expect(sortAlbums(lib, lib.albums, 'title', 'desc').map((a) => a.title)).toEqual(['Second', 'First']);
    expect(ALBUM_SORTS.map((s) => s.value)).toContain('memories');
  });
  it('artists: by track count, then name; count of albums', () => {
    const r = artistRows(lib);
    expect(Object.fromEntries(r.map((a) => [a.name, [a.tracks, a.albums]]))).toEqual({ Alpha: [2, 1], Beta: [2, 1] });
    expect(sortArtists(r, 'tracks', 'desc').map((a) => a.name)).toEqual(['Alpha', 'Beta']);
    expect(sortArtists(r, 'name', 'desc').map((a) => a.name)).toEqual(['Beta', 'Alpha']);
    expect(sortArtists(r, 'rating', 'desc')[0].name).toBe('Alpha'); // only Alpha has a rated track
    expect(ARTIST_SORTS[0].value).toBe('tracks');
  });
  it('eras: by size and by newest release', () => {
    const r = eraRows(lib);
    expect(sortEras(r, 'items', 'desc').map((x) => x.era.name)).toEqual(['Late', 'Early']);
    expect(sortEras(r, 'newest', 'desc').map((x) => x.era.name)).toEqual(['Late', 'Early']);
    expect(sortEras(r, 'name', 'asc').map((x) => x.era.name)).toEqual(['Early', 'Late']);
  });
});
