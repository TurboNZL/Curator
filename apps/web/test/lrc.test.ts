import { describe, expect, it } from 'vitest';
import { activeLine, parseLrc } from '../src/lib/lrc.ts';

describe('lrc', () => {
  const lines = parseLrc('[ar:Someone]\n[00:12.50] first\n[01:02.5][00:05.00] second and chorus\n[00:20] ');
  it('parses stamps, repeated stamps and ignores tags', () => {
    expect(lines.map((l) => [l.time, l.text])).toEqual([[5, 'second and chorus'], [12.5, 'first'], [20, ''], [62.5, 'second and chorus']]);
  });
  it('finds the line being sung', () => {
    expect(activeLine(lines, 1)).toBe(-1);
    expect(activeLine(lines, 5)).toBe(0);
    expect(activeLine(lines, 19.9)).toBe(1);
    expect(activeLine(lines, 999)).toBe(3);
  });
});
