import { describe, expect, it } from 'vitest';
import type { SyncRecord } from '@curator/core';
import { buildLibrary } from '../src/lib/library.ts';
import { makeChip, matchesAll, trackSubject } from '../src/lib/filters.ts';
import { hasLead, leadArtistIds, ownCreditsFromAlbum } from '../src/lib/defaults.ts';

const rec = (table: string, id: string, data: object): SyncRecord => ({ table: table as never, id, updatedAt: 1, deviceId: 'd', deleted: false, data: data as never });
const rows = (...rs: SyncRecord[]) => {
  const out: Record<string, Map<string, SyncRecord>> = Object.fromEntries(
    ['artists', 'eras', 'noteCategories', 'albums', 'releases', 'tracks', 'playlists', 'groups', 'genres', 'roleCategories', 'timeline', 'votes', 'playbackLogs', 'profiles', 'notes'].map((t) => [t, new Map()]));
  for (const r of rs) out[r.table].set(r.id, r);
  return out;
};
const lead = (artistId: string) => ({ artistId, role: ['Lead artist'] });

describe('more than two lead artists', () => {
  const lib = buildLibrary(rows(
    rec('artists', 'a', { name: 'Ann', image: null }), rec('artists', 'b', { name: 'Bob', image: null }), rec('artists', 'c', { name: 'Cy', image: null }), rec('artists', 'd', { name: 'Dee', image: null }), rec('artists', 'p', { name: 'Pat', image: null }),
    rec('tracks', 't', { title: 'Four Way', credits: [lead('a'), lead('b'), lead('c'), lead('d'), { artistId: 'p', role: ['Producer'] }, lead('b')], genres: [], albums: [], file: null, initialRating: null, syncWithAlbumCredits: false }),
  ));
  const t = lib.trackById.get('t')!;
  it('keeps every lead, in order, once each, and does not promote the producer', () => {
    expect(leadArtistIds(t.credits)).toEqual(['a', 'b', 'c', 'd']);
    expect(t.leads.map((l) => l.name)).toEqual(['Ann', 'Bob', 'Cy', 'Dee']);
    expect(t.artistName).toBe('Ann, Bob, Cy, Dee');
    expect(t.artistId).toBe('a'); // the primary is the first lead
    expect(hasLead(t.credits)).toBe(true);
  });
  it('is on the page of every credited artist, producer included', () => {
    for (const id of ['a', 'b', 'c', 'd', 'p']) expect(lib.tracks.filter((x) => x.credits.some((c) => c.artistId === id)).map((x) => x.id)).toEqual(['t']);
  });
  it('matches an artist: filter for the third and fourth lead too', () => {
    for (const name of ['Ann', 'Cy', 'Dee']) expect(matchesAll([makeChip(lib, 'artist', name)!], trackSubject(lib, t))).toBe(true);
    expect(matchesAll([makeChip(lib, 'artist', 'Nobody')!], trackSubject(lib, t))).toBe(false);
  });
});

describe('a track stops following its album (duo album, third artist added)', () => {
  const duo = [lead('a'), lead('b')];
  it('starts from the whole album duo, not just the one lead the record stored', () => {
    // an imported track stores only the first lead; it showed the album's duo while following
    const own = ownCreditsFromAlbum(duo, [lead('a')]);
    expect(own.map((c) => c.artistId)).toEqual(['a', 'b']);
    own.push(lead('c')); // the user adds the third
    expect(leadArtistIds(own)).toEqual(['a', 'b', 'c']);
  });
  it('keeps what the track had of its own, once, and copies the roles so the album is not changed', () => {
    const own = ownCreditsFromAlbum([{ artistId: 'a', role: ['Lead artist'] }, { artistId: 'p', role: ['Producer'] }], [{ artistId: 'a', role: ['lead ARTIST'] }, { artistId: 'p', role: ['Producer'] }, { artistId: 'f', role: ['Featured artist'] }]);
    expect(own.map((c) => `${c.artistId}:${c.role.join('+')}`)).toEqual(['a:Lead artist', 'p:Producer', 'f:Featured artist']);
    own[0].role.push('Writer'); expect(duo[0].role).toEqual(['Lead artist']);
  });
  it('handles an album with no credits or a track with none', () => {
    expect(ownCreditsFromAlbum([], [lead('x')]).map((c) => c.artistId)).toEqual(['x']);
    expect(ownCreditsFromAlbum(duo, [])).toHaveLength(2);
  });
});
