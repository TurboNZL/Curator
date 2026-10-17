import { describe, expect, it } from 'vitest';
import { buildPairs } from '../src/lib/themePairs.ts';

const P = (id: string, mode: 'dark' | 'light', pair?: string) => ({ id, mode, pair });

describe('buildPairs', () => {
  const palettes = [P('tm', 'dark', 'tm-light'), P('tm-light', 'light', 'tm'), P('win', 'light'), P('win-dark', 'dark'), P('nord', 'dark'), P('lone-light', 'light')];
  const styles = [{ id: 'win', matching: { light: 'win', dark: 'win-dark' } }, { id: 'x', matching: { light: 'lone-light' } }];
  const pairs = buildPairs(palettes, styles);
  it('takes a palette\'s own pair', () => { expect(pairs.get('tm')).toBe('tm-light'); expect(pairs.get('tm-light')).toBe('tm'); });
  it('takes the palettes a style lists as matching', () => { expect(pairs.get('win')).toBe('win-dark'); expect(pairs.get('win-dark')).toBe('win'); });
  it('leaves one-mode looks alone', () => { expect(pairs.has('nord')).toBe(false); expect(pairs.has('lone-light')).toBe(false); });
  it('never pairs two palettes of the same mode, or one palette twice', () => {
    const odd = buildPairs([P('a', 'dark', 'b'), P('b', 'dark'), P('c', 'light', 'a'), P('d', 'light', 'a')], []);
    expect(odd.get('a')).toBe('c');
    expect(odd.has('b')).toBe(false);
    expect(odd.has('d')).toBe(false);
  });
});
