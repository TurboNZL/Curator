import { describe, expect, it } from 'vitest';
import { userDataPath } from '../src/appName.ts';

describe('userDataPath', () => {
  it('keeps the folder the old product names made, so an update finds its settings', () => {
    expect(userDataPath('/home/u/.config', 'full')).toBe('/home/u/.config/Music Curator');
    expect(userDataPath('/home/u/.config', 'app')).toBe('/home/u/.config/Music Curator App');
    expect(userDataPath('/home/u/.config', 'server')).toBe('/home/u/.config/Music Curator Server');
  });
});
