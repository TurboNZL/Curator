import { describe, expect, it } from 'vitest';
import { inheritFromAlbum, sameCredits } from '../src/lib/defaults.ts';

describe('what a track added to an album inherits', () => {
  const lead = (id: string) => [{ artistId: id, role: ['Lead artist'] }];
  const album = { credits: lead('a'), artistId: 'a', genres: ['Jazz'] };

  it('compares credits by artist and role, ignoring order and case', () => {
    expect(sameCredits([{ artistId: 'a', role: ['Lead artist', 'Writer'] }, { artistId: 'b', role: ['Producer'] }], [{ artistId: 'b', role: ['producer'] }, { artistId: 'a', role: ['writer', 'lead artist'] }])).toBe(true);
    expect(sameCredits(lead('a'), lead('b'))).toBe(false);
    expect(sameCredits(lead('a'), [...lead('a'), { artistId: 'b', role: ['Producer'] }])).toBe(false);
  });

  it('follows the album when the credits are the album\'s', () => {
    expect(inheritFromAlbum(album, lead('a'))).toEqual({ syncWithAlbumCredits: true, genres: [] });
  });

  it('keeps its own credits but starts with the album\'s genres when the credits were changed', () => {
    expect(inheritFromAlbum(album, [...lead('a'), { artistId: 'b', role: ['Featured'] }])).toEqual({ syncWithAlbumCredits: false, genres: ['Jazz'] });
  });

  it('is a plain single without an album', () => {
    expect(inheritFromAlbum(undefined, lead('a'))).toEqual({ syncWithAlbumCredits: false, genres: [] });
  });
});
