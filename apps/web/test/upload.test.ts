import { describe, expect, it } from 'vitest';
import { audioMime, titleFromFilename } from '../src/lib/defaults.ts';

describe('titleFromFilename', () => {
  it.each([
    ['01 - Intro.mp3', 'Intro'],
    ['02. Blinding Lights.flac', 'Blinding Lights'],
    ['3_Dark_Horse.m4a', 'Dark Horse'],
    ['/music/Album/04) Song Name.ogg', 'Song Name'],
    ['Song Name.mp3', 'Song Name'],
    ['1999.mp3', '1999'],
    ['05 Intro.mp3', 'Intro'],
    ['7 Rings.mp3', '7 Rings'],
    ['No Extension', 'No Extension'],
  ])('%s -> %s', (name, title) => expect(titleFromFilename(name)).toBe(title));
});

describe('audioMime', () => {
  it('keeps a real audio type and guesses from the extension otherwise', () => {
    expect(audioMime('a.mp3', 'audio/mpeg')).toBe('audio/mpeg');
    expect(audioMime('a.FLAC', '')).toBe('audio/flac');
    expect(audioMime('a.m4a', 'application/octet-stream')).toBe('audio/mp4');
    expect(audioMime('a.weird', '')).toBe('audio/mpeg');
  });
});
