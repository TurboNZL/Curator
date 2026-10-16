import { describe, expect, it } from 'vitest';
import { chipsApply, idChip, parseSearch, searchHref } from '../src/lib/searchUrl.ts';

describe('search addresses', () => {
  it('round-trips words, kind and chips (also odd characters)', () => {
    const chips = [idChip('artist', 'a1', 'Jorja & "Smith": live'), { key: 'before' as const, value: '2019', label: '2019' }];
    const href = searchHref({ q: ' love ', kind: 'albums', chips });
    const back = parseSearch(new URL(href, 'http://x').searchParams);
    expect(back).toEqual({ q: 'love', kind: 'albums', chips });
  });
  it('is plain /search when empty and ignores damaged filters', () => {
    expect(searchHref({})).toBe('/search');
    const p = new URLSearchParams('f=%7Bnope&f=%5B%22bogus%22%2C%22x%22%2C%22y%22%5D&in=weird');
    expect(parseSearch(p)).toEqual({ q: '', chips: [], kind: 'all' });
  });
  it('hides a kind when a chip does not apply to it', () => {
    const album = [idChip('album', 'x', 'GNX')];
    expect(chipsApply(album, 'tracks')).toBe(true);
    expect(chipsApply(album, 'albums')).toBe(false);
    expect(chipsApply([idChip('artist', 'a', 'A')], 'albums')).toBe(true);
    expect(chipsApply([idChip('artist', 'a', 'A')], 'artists')).toBe(false);
  });
});
