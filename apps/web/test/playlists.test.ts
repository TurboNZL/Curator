import { describe, expect, it } from 'vitest';
import { coverPlan } from '../src/lib/playlists.ts';

describe('playlist cover', () => {
  it('own picture wins', () => expect(coverPlan('own', ['a', 'b', 'c', 'd'])).toEqual({ mode: 'own', hash: 'own' }));
  it('four different covers make a 2x2 mosaic of the first four', () => expect(coverPlan(null, ['a', 'b', 'c', 'd', 'e'])).toEqual({ mode: 'mosaic', hashes: ['a', 'b', 'c', 'd'] }));
  it('fewer than four show the first alone', () => { expect(coverPlan(null, ['a', 'b', 'c'])).toEqual({ mode: 'single', hash: 'a' }); expect(coverPlan(null, ['a'])).toEqual({ mode: 'single', hash: 'a' }); });
  it('none falls back to the gradient', () => expect(coverPlan(null, [])).toEqual({ mode: 'none' }));
});
