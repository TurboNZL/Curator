import { describe, expect, it } from 'vitest';
import { mergeSuggestions, tasteSeeds } from '../src/lib/recommend.ts';
import type { Library } from '../src/lib/library.ts';

const track = (artist: string, rating: number, comparisons = 5) => ({ effectiveRating: rating, comparisons, leads: [{ id: artist, name: artist }] });

describe('taste seeds', () => {
  it('prefers artists you keep rating highly and ignores thin or low data', () => {
    const lib = { tracks: [track('A', 9), track('A', 8), track('A', 9), track('B', 10), track('C', 3), track('C', 4), track('D', 9, 1)] } as unknown as Library;
    expect(tasteSeeds(lib).map((s) => s.name)).toEqual(['A', 'B']);
  });
});

describe('merging suggestions', () => {
  const seeds = [{ name: 'A', weight: 1 }, { name: 'B', weight: 0.5 }];
  const similar = [[{ name: 'X', mbid: 'x', score: 10 }, { name: 'Y', mbid: 'y', score: 5 }, { name: 'Mine', mbid: 'm', score: 9 }], [{ name: 'Y', mbid: 'y', score: 8 }, { name: 'Z', mbid: 'z', score: 2 }]];
  it('drops artists you have, adds up shared ones and says why', () => {
    const r = mergeSuggestions(seeds, similar, ['Mine', 'A', 'B']);
    expect(r.map((x) => x.name)).toEqual(['X', 'Y', 'Z']);
    expect(r.find((x) => x.name === 'Y')!.because).toEqual(['A', 'B']);
    expect(r[0].score).toBeCloseTo(1);
  });
});
