import { describe, expect, it } from 'vitest';
import type { SyncRecord, TrackData } from '@curator/core';
import { buildLibrary } from '../src/lib/library.ts';
import { defaultChoice, defaultRelease, initialView, planAddToAlbum, planConvertToSingle, singleTrackOf, viewTrackIds } from '../src/lib/albumOps.ts';
import { leadCredit, withoutLegacyArtist } from '../src/lib/defaults.ts';

const rec = (table: string, id: string, data: object): SyncRecord => ({ table: table as never, id, updatedAt: 1, deviceId: 'd', deleted: false, data: data as never });
const rows = (...rs: SyncRecord[]) => {
  const out: Record<string, Map<string, SyncRecord>> = Object.fromEntries(
    ['artists', 'eras', 'albums', 'releases', 'tracks', 'playlists', 'groups', 'genres', 'roleCategories', 'timeline', 'votes', 'playbackLogs', 'profiles', 'notes'].map((t) => [t, new Map()]));
  for (const r of rs) out[r.table].set(r.id, r);
  return out;
};
const track = (title: string, extra: Partial<TrackData> = {}): TrackData => ({
  title, credits: leadCredit('a'), genres: [], albums: [], file: null, cover: null, initialRating: null, spotifyUrl: null, geniusUrl: null,
  youtubeMusicUrl: null, bitrate: null, bpm: null, key: null, memories: 0, syncWithAlbumCredits: true, queueRules: {}, ...extra });

const data = [
  rec('artists', 'a', { name: 'Artist', image: null }), rec('artists', 'b', { name: 'Other', image: null }),
  rec('eras', 'e1', { name: 'Era', description: null, cover: null }),
  rec('albums', 'al', { title: 'Album', credits: leadCredit('a'), genres: [], cover: 'albumcover', eraId: 'e1', defaultReleaseId: 'r1' }),
  rec('tracks', 't1', track('One', { albums: [{ albumId: 'al', order: 0 }] })), rec('tracks', 't2', track('Two', { albums: [{ albumId: 'al', order: 1 }] })),
  rec('tracks', 'bonus', track('Bonus', { albums: [{ albumId: 'al', order: 2 }] })),
  rec('releases', 'r1', { albumId: 'al', title: 'Standard', cover: null, releaseDate: '2024-01-01', trackIds: ['t1', 't2'] }),
  rec('releases', 'r2', { albumId: 'al', title: 'Deluxe', cover: 'deluxe', releaseDate: '2024-06-01', trackIds: ['t1', 't2', 'bonus'] }),
  rec('tracks', 's1', track('Single with cover', { cover: 'single-art', eraId: 'e1' })),
  rec('tracks', 's2', track('Single without cover')),
];

describe('credits-only artists, singles, eras', () => {
  const lib = buildLibrary(rows(...data));
  it('the artist of a track comes from its lead credits, every lead is listed', () => {
    const t = buildLibrary(rows(...data, rec('tracks', 'duo', track('Duo', { credits: [...leadCredit('a'), ...leadCredit('b')] })))).trackById.get('duo')!;
    expect(t.leads.map((l) => l.name)).toEqual(['Artist', 'Other']);
    expect(t.artistName).toBe('Artist, Other');
    expect(t.artistId).toBe('a');
  });
  it('a track with its own cover shows it; an album track without one shows the album cover', () => {
    expect(lib.trackById.get('s1')!.cover).toBe('single-art');
    expect(lib.trackById.get('t1')!.cover).toBe('albumcover');
    expect(lib.trackById.get('s2')!.cover).toBeNull();
  });
  it('singles are the tracks on no album, and eras collect albums and singles', () => {
    expect(lib.singles.map((t) => t.id).sort()).toEqual(['s1', 's2']);
    expect(lib.trackById.get('s1')!.eraIds).toEqual(['e1']);
    expect(lib.trackById.get('t1')!.eraIds).toEqual(['e1']); // an album track follows its album's eras
    expect(lib.eraById.get('e1')!.name).toBe('Era');
  });
  it('eras can overlap: an album and a single can be in several, and an era can hold playlists', () => {
    const l = buildLibrary(rows(...data,
      rec('eras', 'e2', { name: 'Beef', description: null, cover: null, albumIds: ['al', 'gone'], trackIds: ['s2'], playlistIds: ['p1'] })));
    expect(l.albumById.get('al')!.eraIds.sort()).toEqual(['e1', 'e2']);
    expect(l.trackById.get('t1')!.eraIds.sort()).toEqual(['e1', 'e2']);
    expect(l.trackById.get('s2')!.eraIds).toEqual(['e2']);
    expect(l.eraById.get('e2')).toMatchObject({ albumIds: ['al'], trackIds: ['s2'], playlistIds: ['p1'] }); // ids of deleted things drop out
    expect(l.eraById.get('e1')!.albumIds).toEqual(['al']); // the legacy eraId still counts
  });
  it('a legacy artistId still names the artist until it is moved into the credits, and that move drops the field', () => {
    const legacy = { title: 'Old', artistId: 'a', credits: [], genres: [], albums: [], file: null };
    const t = buildLibrary(rows(...data, rec('tracks', 'old', legacy))).trackById.get('old')!;
    expect(t.artistName).toBe('Artist');
    expect(withoutLegacyArtist(legacy)).toEqual({ title: 'Old', credits: [{ artistId: 'a', role: ['Lead artist'] }], genres: [], albums: [], file: null });
    expect(withoutLegacyArtist({ title: 'New', credits: leadCredit('a') })).toBeNull();
    // an existing credit for the artist is promoted, not duplicated
    expect(withoutLegacyArtist({ artistId: 'a', credits: [{ artistId: 'a', role: ['Producer'] }] })!.credits).toEqual([{ artistId: 'a', role: ['Lead artist', 'Producer'] }]);
  });
});

describe('adding a track to an album', () => {
  const lib = buildLibrary(rows(...data));
  const album = lib.albumById.get('al')!;
  const raw = (id: string) => data.find((r) => r.id === id)!.data as unknown as TrackData;

  it('with its own cover it becomes a release of its own, carrying that cover', () => {
    const choice = defaultChoice(lib, album, true);
    expect(choice).toEqual({ releaseIds: [], newRelease: true });
    const plan = planAddToAlbum(lib, raw('s1'), 's1', album, choice);
    expect(plan.newRelease).toEqual({ albumId: 'al', title: 'Single with cover', cover: 'single-art', releaseDate: null, trackIds: ['s1'] });
    expect(plan.releaseAppends).toEqual([]);
    expect(plan.trackAlbums[0]).toEqual({ albumId: 'al', order: 3 });
    expect(plan.trackOrder).toEqual([...album.trackIds, 's1']);
  });
  it('without a cover it joins the default release only', () => {
    const choice = defaultChoice(lib, album, false);
    expect(choice).toEqual({ releaseIds: ['r1'], newRelease: false });
    const plan = planAddToAlbum(lib, raw('s2'), 's2', album, choice);
    expect(plan.newRelease).toBeNull();
    expect(plan.releaseAppends).toEqual([{ id: 'r1', trackIds: ['t1', 't2', 's2'] }]);
  });
  it('the user can pick several releases (and an unrelated release id is ignored)', () => {
    const plan = planAddToAlbum(lib, raw('s2'), 's2', album, { releaseIds: ['r1', 'r2', 'nope'], newRelease: true });
    expect(plan.releaseAppends.map((a) => a.id)).toEqual(['r1', 'r2']);
    expect(plan.newRelease).not.toBeNull();
  });
  it('never lists a track twice on a release', () => {
    expect(planAddToAlbum(lib, raw('t1'), 't1', album, { releaseIds: ['r1'], newRelease: false }).releaseAppends).toEqual([]);
  });
  it('the default release is the chosen one, else the one with the most tracks', () => {
    expect(defaultRelease(lib, album)!.id).toBe('r1');
    const noDefault = buildLibrary(rows(...data.map((r) => (r.id === 'al' ? rec('albums', 'al', { ...(r.data as object), defaultReleaseId: null }) : r))));
    expect(defaultRelease(noDefault, noDefault.albumById.get('al')!)!.id).toBe('r2');
  });
});

describe('switching between releases on the album page', () => {
  const lib = buildLibrary(rows(...data));
  const album = lib.albumById.get('al')!;
  it('shows a release\'s own tracklist, or every track', () => {
    expect(viewTrackIds(lib, album, { kind: 'release', id: 'r1' })).toEqual(['t1', 't2']);
    expect(viewTrackIds(lib, album, { kind: 'release', id: 'r2' })).toEqual(['t1', 't2', 'bonus']);
    expect(viewTrackIds(lib, album, { kind: 'all' }).sort()).toEqual(['bonus', 't1', 't2']);
  });
  it('opens on the default release when it holds every track, otherwise on all tracks', () => {
    expect(initialView(lib, album)).toEqual({ kind: 'all' }); // r1 lacks "bonus"
    const full = buildLibrary(rows(...data.map((r) => (r.id === 'r1' ? rec('releases', 'r1', { ...(r.data as object), trackIds: ['t1', 't2', 'bonus'] }) : r))));
    expect(initialView(full, full.albumById.get('al')!)).toEqual({ kind: 'release', id: 'r1' });
  });
  it('ignores a release id that belongs to another album', () => {
    expect(viewTrackIds(lib, album, { kind: 'release', id: 'ghost' })).toEqual(album.trackIds);
  });
});

describe('convert an album to a single', () => {
  const one = [
    rec('artists', 'a', { name: 'Artist', image: null }),
    rec('albums', 'al', { title: 'Tiny', credits: leadCredit('a'), genres: ['Pop'], cover: 'albumcover', eraId: 'e1', defaultReleaseId: 'r1' }),
    rec('tracks', 't1', track('Only', { albums: [{ albumId: 'al', order: 0 }] })),
    rec('releases', 'r1', { albumId: 'al', title: 'Standard', cover: 'relcover', releaseDate: null, trackIds: ['t1'] }),
    rec('releases', 'r2', { albumId: 'al', title: 'Alt', cover: 'alt', releaseDate: null, trackIds: ['t1'] }),
  ];
  it('is offered only when every release holds the one song', () => {
    const lib = buildLibrary(rows(...one));
    expect(singleTrackOf(lib, lib.albumById.get('al')!)).toBe('t1');
    const two = buildLibrary(rows(...one, rec('tracks', 't2', track('Second', { albums: [{ albumId: 'al', order: 1 }] }))));
    expect(singleTrackOf(two, two.albumById.get('al')!)).toBeNull();
    const none = buildLibrary(rows(...one.filter((r) => r.table !== 'releases')));
    expect(singleTrackOf(none, none.albumById.get('al')!)).toBeNull();
  });
  it('keeps the cover, era, credits and genres, and removes the album and its releases', () => {
    const lib = buildLibrary(rows(...one));
    const p = planConvertToSingle(lib, lib.albumById.get('al')!)!;
    expect(p.trackPatch).toMatchObject({ albums: [], cover: 'relcover', eraId: 'e1', syncWithAlbumCredits: false, genres: ['Pop'] });
    expect(p.trackPatch.credits).toEqual(leadCredit('a'));
    expect(p.removeReleaseIds.sort()).toEqual(['r1', 'r2']);
    expect(p.removeAlbumId).toBe('al');
  });
});
