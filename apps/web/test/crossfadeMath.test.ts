import { describe, expect, it } from 'vitest';
import { fadeGains, fadeLength, shouldFade, shouldPrepare } from '../src/lib/crossfadeMath.ts';

describe('crossfade arithmetic', () => {
  it('keeps the total power level through the fade', () => {
    for (let p = 0; p <= 1; p += 0.1) { const g = fadeGains(p); expect(g.out ** 2 + g.in ** 2).toBeCloseTo(1, 10); }
    expect(fadeGains(0)).toEqual({ out: 1, in: 0 });
    expect(fadeGains(1).out).toBeCloseTo(0, 10);
    expect(fadeGains(1).in).toBeCloseTo(1, 10);
    expect(fadeGains(-3).in).toBe(0); expect(fadeGains(9).in).toBeCloseTo(1, 10);
  });
  it('never gives away more than a third of the playing track or more than is left', () => {
    expect(fadeLength(5, 200, 5.2)).toBe(5);
    expect(fadeLength(12, 20, 12)).toBeCloseTo(20 / 3, 10);
    expect(fadeLength(8, 200, 4.9)).toBe(4.9);
    expect(fadeLength(0, 200, 5)).toBe(0);
    expect(fadeLength(5, Number.NaN, 5)).toBe(0);
    expect(fadeLength(5, 200, 0.2)).toBe(0); // nothing worth fading
  });
  it('prepares the spare before the fade starts', () => {
    expect(shouldPrepare(4, 11)).toBe(false);
    expect(shouldPrepare(4, 9.9)).toBe(true);
    expect(shouldFade(4, 4.2)).toBe(true);
    expect(shouldFade(4, 5)).toBe(false);
    expect(shouldFade(0, 0)).toBe(false);
  });
});
