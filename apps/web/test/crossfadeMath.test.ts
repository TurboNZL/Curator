import { describe, expect, it } from 'vitest';
import { fadeGains, fadeLabel, fadeLength, fadeStops, nearestStop, shouldFade, shouldPrepare } from '../src/lib/crossfadeMath.ts';

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
    expect(fadeLength(5, 200, 0.05)).toBe(0); // nothing worth fading
    expect(fadeLength(0.3, 200, 5)).toBe(0.3); // short fades are real fades
  });
  it('prepares the spare before the fade starts', () => {
    expect(shouldPrepare(4, 11)).toBe(false);
    expect(shouldPrepare(4, 9.9)).toBe(true);
    expect(shouldFade(4, 4.2)).toBe(true);
    expect(shouldFade(4, 5)).toBe(false);
    expect(shouldFade(0, 0)).toBe(false);
  });
  it('has fine stops for short fades and coarser ones for long fades', () => {
    const stops = fadeStops(12);
    expect(stops[0]).toBe(0); expect(stops[1]).toBe(0.1); expect(stops[stops.length - 1]).toBe(12);
    expect(stops).toContain(0.3); expect(stops).toContain(2); expect(stops).toContain(2.25); expect(stops).toContain(5); expect(stops).toContain(5.5);
    expect(stops).not.toContain(2.1); expect(stops).not.toContain(5.25);
    expect([...stops].sort((a, b) => a - b)).toEqual(stops);
    expect(new Set(stops).size).toBe(stops.length);
    expect(nearestStop(stops, 0.33)).toBe(stops.indexOf(0.3));
    expect(nearestStop(stops, 99)).toBe(stops.length - 1);
    expect(fadeLabel(0)).toBe('off'); expect(fadeLabel(2.25)).toBe('2.25 s'); expect(fadeLabel(8)).toBe('8 s');
  });
});
