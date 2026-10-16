import { describe, expect, it } from 'vitest';
import type { SyncRecord } from '@turbomusic/core';
import { buildLibrary } from '../src/lib/library.ts';
import { allReleaseTags, foldIntoRelease, planMergeReleases, releaseDateQuery, siblingDate } from '../src/lib/releaseOps.ts';

const rec = (table: string, id: string, data: object): SyncRecord => ({ table: table as never, id, updatedAt: 1, deviceId: 'd', deleted: false, data: data as never });
const rows = (...rs: SyncRecord[]) => {
  const out: Record<string, Map<string, SyncRecord>> = Object.fromEntries(
    ['artists', 'eras', 'noteCategories', 'albums', 'releases', 'tracks', 'playlists', 'groups', 'genres', 'roleCategories', 'timeline', 'votes', 'playbackLogs', 'profiles', 'notes'].map((t) => [t, new Map()]));
  for (const r of rs) out[r.table].set(r.id, r);
  return out;
};
const lead = [{ artistId: 'a', role: ['Lead artist'] }];
const trk = (title: string) => ({ title, credits: lead, genres: [], albums: [{ albumId: 'al', order: 0 }], file: null, initialRating: null, spotifyUrl: null, geniusUrl: null, youtubeMusicUrl: null, bitrate: null, memories: 0, syncWithAlbumCredits: true, queueRules: {} });
const lib = buildLibrary(rows(
  rec('artists', 'a', { name: 'A', image: null }),
  rec('albums', 'al', { title: 'Album', credits: lead, genres: [], cover: null, covers: ['c0'], defaultReleaseId: 'yt' }),
  rec('tracks', '1', trk('One')), rec('tracks', '2', trk('Two')), rec('tracks', '3', trk('Three')), rec('tracks', '4', trk('Four')),
  rec('releases', 'sp', { albumId: 'al', title: 'Spotify', cover: 'cs', releaseDate: '2026-09-05', tags: ['streaming'], trackIds: ['1', '2', '4'] }),
  rec('releases', 'yt', { albumId: 'al', title: 'YouTube', cover: null, releaseDate: null, trackIds: ['1', '2', '3'] }),
));

describe('release operations', () => {
  it('a one-song release is looked up like a single, a longer one by its album', () => {
    expect(releaseDateQuery(lib, { albumId: 'al', trackIds: ['3'] })).toEqual({ album: 'Three', artist: 'A', single: true });
    expect(releaseDateQuery(lib, { albumId: 'al', trackIds: ['3', 'gone'] }).single).toBe(true); // a missing track does not count
    expect(releaseDateQuery(lib, { albumId: 'al', trackIds: ['1', '2'] })).toEqual({ album: 'Album', artist: 'A', single: false });
  });
  it('a new release starts with the date the album already has', () => {
    expect(siblingDate(lib.releases, 'yt')).toBe('2026-09-05');
    expect(siblingDate(lib.releases, 'yt', 'sp')).toBeNull();
    expect(siblingDate([{ id: 'x', releaseDate: '2020' }, { id: 'y', releaseDate: '2018-03' }], undefined)).toBe('2018-03');
  });
  it('merging folds tracks, date, cover and tags into the survivor and hands over the default', () => {
    const p = planMergeReleases(lib, 'sp', 'yt')!;
    expect(p.keepPatch.trackIds).toEqual(['1', '2', '3', '4']); // 3 lands after 2, the track before it that both have
    expect(p.keepPatch.releaseDate).toBe('2026-09-05');
    expect(p.keepPatch.cover).toBe('cs');
    expect(p.keepPatch.tags).toEqual(['streaming']);
    expect(p.albumPatch).toEqual({ defaultReleaseId: 'sp' });
    expect(p.removeId).toBe('yt');
  });
  it('the other way round the survivor takes what it lacks, and the dropped cover joins the pool', () => {
    const p = planMergeReleases(lib, 'yt', 'sp')!;
    expect(p.keepPatch).toMatchObject({ releaseDate: '2026-09-05', cover: 'cs', tags: ['streaming'] });
    expect(p.keepPatch.trackIds).toEqual(['1', '2', '4', '3']); // 4 follows 2, the closest track before it that both have
    expect(p.albumPatch).toEqual({ covers: ['c0', 'cs'] }); // the dropped release's picture stays in the album's pool
  });
  it('refuses releases of different albums or the same one', () => {
    expect(planMergeReleases(lib, 'sp', 'sp')).toBeNull();
    expect(planMergeReleases(lib, 'sp', 'nope')).toBeNull();
  });
  it('an imported edition folds into an existing release', () => {
    expect(foldIntoRelease(['1', '2', '4'], [{ trackId: '1' }, { trackId: '2' }, { trackId: null, newId: '9' }, { trackId: '4' }])).toEqual(['1', '2', '9', '4']);
  });
  it('lists tags by use', () => {
    expect(allReleaseTags([{ tags: ['vinyl', 'clean'] }, { tags: ['vinyl'] }, {}])).toEqual(['vinyl', 'clean']);
  });
});
