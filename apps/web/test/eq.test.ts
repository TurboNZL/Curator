import { describe, expect, it } from 'vitest';
import { bassAt, cleanBands, EQ_FREQS, EQ_PRESETS, gainAt, isFlat, peakBoost, preGainDb, presetFor } from '../src/lib/eqPresets.ts';

const flat = { on: true, bands: cleanBands([]), preamp: 0, bass: 0 };

describe('equaliser maths', () => {
  it('cleans stored bands to ten finite values inside the range', () => {
    expect(cleanBands(undefined)).toEqual(Array(10).fill(0));
    expect(cleanBands([20, -20, 'x', NaN, 3])).toEqual([12, -12, 0, 0, 3, 0, 0, 0, 0, 0]);
  });
  it('every preset has ten bands inside the range, and is recognised again', () => {
    for (const p of EQ_PRESETS) {
      expect(p.bands).toHaveLength(EQ_FREQS.length);
      expect(Math.max(...p.bands.map(Math.abs))).toBeLessThanOrEqual(12);
      expect(presetFor(p.bands)?.id).toBe(p.id);
    }
    expect(presetFor([1, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toBeNull();
  });
  it('treats off and flat as flat, anything else not', () => {
    expect(isFlat(flat)).toBe(true);
    expect(isFlat({ ...flat, on: false, bass: 6 })).toBe(true);
    expect(isFlat({ ...flat, bass: 1 })).toBe(false);
    expect(isFlat({ ...flat, preamp: -3 })).toBe(false);
  });
  it('makes room for boosts but never adds gain for cuts', () => {
    expect(preGainDb(flat)).toBe(0);
    expect(preGainDb({ ...flat, bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, -6] })).toBe(0);
    const boosted = { ...flat, bands: [6, 0, 0, 0, 0, 0, 0, 0, 0, 0], bass: 4 };
    expect(peakBoost(boosted)).toBe(10);
    expect(preGainDb(boosted)).toBeCloseTo(-5.5);
    expect(preGainDb({ ...boosted, preamp: 2 })).toBeCloseTo(-3.5);
  });
  it('interpolates the curve on a log axis and holds the ends', () => {
    const b = [0, 4, 0, 0, 0, 0, 0, 0, 0, -8];
    expect(gainAt(b, 10)).toBe(0);
    expect(gainAt(b, 62)).toBeCloseTo(4);
    expect(gainAt(b, Math.sqrt(31 * 62))).toBeCloseTo(2); // halfway between 31 and 62 Hz in log terms
    expect(gainAt(b, 20000)).toBe(-8);
  });
  it('fades the bass shelf out between 80 and 220 Hz', () => {
    expect(bassAt(6, 40)).toBe(6);
    expect(bassAt(6, 300)).toBe(0);
    expect(bassAt(6, 120)).toBeGreaterThan(0);
    expect(bassAt(6, 120)).toBeLessThan(6);
  });
});
