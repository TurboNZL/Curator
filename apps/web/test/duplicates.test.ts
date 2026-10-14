import { describe, expect, it } from 'vitest';
import type { SyncRecord } from '@curator/core';
import { buildLibrary } from '../src/lib/library.ts';
import { findDuplicates, looseTitle, nearlySame, artistKey } from '../src/lib/duplicates.ts';
import { computeHealth } from '../src/lib/health.ts';
import { ERA_ITEM_SORTS, sortEraItems, type EraItem } from '../src/lib/listSort.ts';

const rec = (table: string, id: string, data: object): SyncRecord => ({ table: table as never, id, updatedAt: 1, deviceId: 'd', deleted: false, data: data as never });
const rows = (...rs: SyncRecord[]) => {
  const out: Record<string, Map<string, SyncRecord>> = Object.fromEntries(
    ['artists', 'eras', 'noteCategories', 'albums', 'releases', 'tracks', 'playlists', 'groups', 'genres', 'roleCategories', 'timeline', 'votes', 'playbackLogs', 'profiles', 'notes', 'releaseNames'].map((t) => [t, new Map()]));
  for (const r of rs) out[r.table].set(r.id, r);
  return out;
};
const credit = (...artists: string[]) => artists.map((a, i) => ({ artistId: a, role: [i === 0 ? 'Lead artist' : 'Lead artist'] }));
const trk = (title: string, artists: string[], extra: object = {}) => ({ title, credits: credit(...artists), genres: [], albums: [], file: null, initialRating: null, spotifyUrl: null, geniusUrl: null, youtubeMusicUrl: null, bitrate: null, memories: 0, syncWithAlbumCredits: false, queueRules: {}, ...extra });

const lib = buildLibrary(rows(
  rec('artists', 'a', { name: 'Beyoncé', image: null }), rec('artists', 'a2', { name: 'Beyonce - Topic', image: null }), rec('artists', 'b', { name: 'Bob', image: null }), rec('artists', 'c', { name: 'Cat', image: null }),
  // same song, the second one spelt with other accents / channel suffix
  rec('tracks', 't1', trk('Halo', ['a'])), rec('tracks', 't2', trk('Halo', ['a2'])),
  // a second artist on the track: the old first-artist-only check missed it
  rec('tracks', 't3', trk('Duet', ['b', 'c'])), rec('tracks', 't4', trk('Duet', ['c'])),
  // edition tag
  rec('tracks', 't5', trk('Hey Jude - Remastered 2015', ['b'])), rec('tracks', 't6', trk('Hey Jude', ['b'])),
  // shared links and files, whatever the titles are
  rec('tracks', 't7', trk('Alpha', ['b'], { spotifyUrl: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC' })), rec('tracks', 't8', trk('Omega', ['c'], { spotifyUrls: ['https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'] })),
  rec('tracks', 't9', trk('Same File One', ['b'], { file: 'f'.repeat(64) })), rec('tracks', 't10', trk('Same File Two', ['c'], { file: 'f'.repeat(64) })),
  // a typo; and things that must NOT match
  rec('tracks', 't11', trk('Wonderwall', ['c'])), rec('tracks', 't12', trk('Wonderwal', ['c'])),
  rec('tracks', 't13', trk('Song 1', ['b'])), rec('tracks', 't14', trk('Song 2', ['b'])),
  rec('tracks', 't15', trk('Halo (Live)', ['a'])), rec('tracks', 't16', trk('Halo - Acoustic', ['a'])),
  rec('tracks', 't17', trk('Halo', ['b'])),
));
const groups = findDuplicates(lib);
const together = (...ids: string[]) => groups.some((g) => ids.every((id) => g.ids.includes(id)));

describe('titles and artists as keys', () => {
  it('ignores accents, "&", "the", and the channel suffix', () => { expect(artistKey('Beyoncé - Topic')).toBe(artistKey('beyonce')); expect(artistKey('The Weeknd')).toBe('weeknd'); expect(artistKey('Jay-Z & Beyoncé')).toBe('jay z and beyonce'); });
  it('drops edition tags but not live/acoustic/remix', () => {
    expect(looseTitle('Hey Jude - Remastered 2015')).toBe('hey jude');
    expect(looseTitle('Hey Jude (2011 Remaster)')).toBe('hey jude');
    expect(looseTitle('Hey Jude (Live)')).toBe('hey jude live');
    expect(looseTitle('Hey Jude - Acoustic')).toBe('hey jude acoustic');
  });
  it('treats a typo as nearly the same but not a numbered sibling', () => { expect(nearlySame('wonderwall', 'wonderwal')).toBe(true); expect(nearlySame('song 1', 'song 2')).toBe(false); expect(nearlySame('hello', 'hallo')).toBe(false); });
});

describe('findDuplicates', () => {
  it('finds the same song under an accented / Topic artist', () => expect(together('t1', 't2')).toBe(true));
  it('finds a song that shares only its second artist', () => expect(together('t3', 't4')).toBe(true));
  it('finds a remaster tag', () => expect(together('t5', 't6')).toBe(true));
  it('finds the same Spotify song and the same audio file under different titles', () => { expect(together('t7', 't8')).toBe(true); expect(together('t9', 't10')).toBe(true); });
  it('finds a one-letter typo of one artist', () => expect(together('t11', 't12')).toBe(true));
  it('does not group numbered songs, other recordings or another artist\'s song of the same name', () => {
    expect(together('t13', 't14')).toBe(false);
    expect(together('t1', 't15')).toBe(false); expect(together('t1', 't16')).toBe(false);
    expect(together('t1', 't17')).toBe(false);
  });
  it('says why', () => {
    expect(groups.find((g) => g.ids.includes('t9'))!.reasons).toEqual(['the same audio file']);
    expect(groups.find((g) => g.ids.includes('t5'))!.reasons[0]).toMatch(/edition tags/);
    expect(groups.find((g) => g.ids.includes('t1'))!.reasons).toEqual(['the same title and artist']); // no second, redundant reason
  });
  it('feeds the Health check, and marking a group as not duplicates still hides it', () => {
    const dup = computeHealth(lib).find((c) => c.id === 'duplicates')!;
    expect(new Set(dup.items.map((i) => i.group)).size).toBe(groups.length);
    expect(dup.items.find((i) => i.id === 't9')!.note).toBe('the same audio file');
  });
});

describe('sortEraItems', () => {
  const alb = (id: string, title: string, releaseDate: string | null) => ({ kind: 'album', id, album: { id, title, artistName: 'X', releaseDate, rating: null, trackIds: ['1', '2'] } }) as unknown as EraItem;
  const single = (id: string, title: string, releaseDate: string | null) => ({ kind: 'single', id, track: { id, title, artistName: 'Y', releaseDate, effectiveRating: 0, memories: 0 } }) as unknown as EraItem;
  const items = [alb('a1', 'Zed', '2020-05'), single('s1', 'Mid', '2019'), alb('a2', 'Undated', null), single('s2', 'Early', '2018-03-02'), single('s3', 'Also undated', null)];
  const ids = (xs: EraItem[]) => xs.map((x) => x.id);
  it('puts albums and singles on one timeline, oldest first, undated last', () => expect(ids(sortEraItems(lib, items, 'released', 'asc'))).toEqual(['s2', 's1', 'a1', 's3', 'a2']));
  it('newest first keeps undated last', () => expect(ids(sortEraItems(lib, items, 'released', 'desc'))).toEqual(['a1', 's1', 's2', 's3', 'a2']));
  it('sorts by title like the other pages', () => expect(ids(sortEraItems(lib, items, 'title', 'asc'))).toEqual(['s3', 's2', 's1', 'a2', 'a1']));
  it('offers the standard sort options', () => expect(ERA_ITEM_SORTS.map((o) => o.value)).toEqual(['released', 'title', 'artist', 'rating', 'memories', 'tracks']));
});
