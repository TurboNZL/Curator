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
