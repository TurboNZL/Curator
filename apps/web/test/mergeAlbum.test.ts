import { describe, expect, it } from 'vitest';
import type { SyncRecord, TrackData } from '@turbomusic/core';
import { buildLibrary } from '../src/lib/library.ts';
import { planMergeAlbumInto } from '../src/lib/albumOps.ts';

const rec = (table: string, id: string, data: object): SyncRecord => ({ table: table as never, id, updatedAt: 1, deviceId: 'd', deleted: false, data: data as never });
const rows = (...rs: SyncRecord[]) => {
  const out: Record<string, Map<string, SyncRecord>> = Object.fromEntries(
    ['artists', 'eras', 'noteCategories', 'albums', 'releases', 'tracks', 'playlists', 'groups', 'genres', 'roleCategories', 'timeline', 'votes', 'playbackLogs', 'profiles', 'notes', 'releaseNames'].map((t) => [t, new Map()]));
  for (const r of rs) out[r.table].set(r.id, r);
  return out;
};
const lead = (a: string) => [{ artistId: a, role: ['Lead artist'] }];
const trk = (title: string, album: string, artist = 'a') => ({ title, credits: lead(artist), genres: [], albums: [{ albumId: album, order: 0 }], file: null, initialRating: null, spotifyUrl: null, geniusUrl: null, youtubeMusicUrl: null, bitrate: null, memories: 0, syncWithAlbumCredits: true, queueRules: {} });
const lib = buildLibrary(rows(
  rec('artists', 'a', { name: 'A', image: null }), rec('artists', 'b', { name: 'B', image: null }),
  rec('albums', 'main', { title: 'Main', credits: lead('a'), genres: [], cover: null, covers: [] }),
  rec('albums', 'dlx', { title: 'Main (Deluxe)', credits: lead('b'), genres: [], cover: null, covers: [] }),
  rec('tracks', '1', trk('One', 'main')), rec('tracks', '2', trk('Two', 'main')), rec('tracks', '3', trk('Bonus', 'dlx', 'b')),
  rec('releases', 'r1', { albumId: 'main', title: '', cover: null, releaseDate: null, trackIds: ['1', '2'] }),
  rec('releases', 'r2', { albumId: 'dlx', title: '', cover: 'cov', releaseDate: '2026-01-01', trackIds: ['3'] }),
  rec('playlists', 'pl', { name: 'P', description: null, cover: null, createdAt: 1, kind: 'albums', albumIds: ['dlx'], trackIds: [] }),
));
const raw = (id: string) => lib.trackById.get(id) as unknown as TrackData;

describe('moving a one-release album into another album', () => {
  it('a release without a name is shown under the album\'s name', () => {
    expect(lib.releases.find((r) => r.id === 'r1')).toMatchObject({ title: 'Main', named: false });
  });
  it('moves the tracks, makes a release named after the old album and retargets playlists', () => {
    const p = planMergeAlbumInto(lib, lib.albumById.get('dlx')!, lib.albumById.get('main')!, raw)!;
    expect(p.newRelease).toMatchObject({ albumId: 'main', title: 'Main (Deluxe)', cover: 'cov', releaseDate: '2026-01-01', trackIds: ['3'] });
    expect(p.targetPatch.trackOrder).toEqual(['1', '2', '3']);
    expect(p.targetPatch.covers).toContain('cov');
    expect(p.trackPatches[0].patch.albums?.[0]).toMatchObject({ albumId: 'main' });
    // the bonus track followed an album with another lead artist: it keeps its own credits
    expect(p.trackPatches[0].patch).toMatchObject({ syncWithAlbumCredits: false });
    expect(p.playlistPatches).toEqual([{ id: 'pl', albumIds: ['main'] }]);
    expect(p.removeAlbumId).toBe('dlx');
  });
  it('refuses an album with two releases', () => {
    const two = buildLibrary(rows(rec('albums', 'x', { title: 'X', credits: [], genres: [], cover: null }), rec('albums', 'y', { title: 'Y', credits: [], genres: [], cover: null }),
      rec('releases', 'a', { albumId: 'x', title: '', cover: null, releaseDate: null, trackIds: [] }), rec('releases', 'b', { albumId: 'x', title: 'B', cover: null, releaseDate: null, trackIds: [] })));
    expect(planMergeAlbumInto(two, two.albumById.get('x')!, two.albumById.get('y')!, () => undefined)).toBeNull();
  });
});
