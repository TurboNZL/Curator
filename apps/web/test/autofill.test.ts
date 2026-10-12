import { describe, expect, it } from 'vitest';
import { cleanAlbumTitle, cleanArtistName, matchArtist } from '../src/lib/autofill.ts';

describe('import autofill', () => {
  it('strips channel decorations and finds the artist', () => {
    expect(cleanArtistName('Drake - Topic')).toBe('Drake');
    expect(cleanArtistName('DrakeVEVO')).toBe('Drake');
    expect(matchArtist([{ name: 'Beyoncé' }, { name: 'Drake' }], 'drake - Topic')?.name).toBe('Drake');
    expect(matchArtist([{ name: 'Beyoncé' }], 'Beyonce')?.name).toBe('Beyoncé');
    expect(matchArtist([{ name: 'Drake' }], 'Nobody')).toBeUndefined();
  });
  it('cleans YouTube Music album titles', () => {
    expect(cleanAlbumTitle('Album - Take Care')).toBe('Take Care');
    expect(cleanAlbumTitle('Take Care (Full Album)')).toBe('Take Care');
    expect(cleanAlbumTitle('Take Care')).toBe('Take Care');
  });
});

import { akaLine, makePrimary, matchArtist as matchA } from '../src/lib/autofill.ts';
describe('artist aliases', () => {
  const artists = [{ name: 'J. Cole', aliases: ['Jermaine Cole', 'Cole World', 'Born Sinner'] }, { name: 'Cole World' }];
  it('matches an alias, but a real name wins', () => {
    expect(matchA(artists, 'Jermaine Cole - Topic')?.name).toBe('J. Cole');
    expect(matchA(artists, 'cole world')?.name).toBe('Cole World');
  });
  it('writes the AKA line like Genius', () => {
    expect(akaLine(['A', 'B', 'C'])).toBe('AKA: A, B & 1 more');
    expect(akaLine(['A', 'B'])).toBe('AKA: A & B');
    expect(akaLine(['A'])).toBe('AKA: A');
    expect(akaLine([])).toBeNull();
  });
  it('swaps the primary', () => expect(makePrimary('J. Cole', ['X', 'Y'], 'Y')).toEqual({ name: 'Y', aliases: ['J. Cole', 'X'] }));
});
