import { describe, expect, it } from 'vitest';
import { THEME_DEFS, THEMES, OWN_THEME_IDS, PLATFORM_THEME_IDS, curatorVars, hex, isTheme, readableOn, resolveTheme } from '../src/lib/theme.ts';
import { UI_STYLES, isUiStyle } from '../src/lib/uiStyle.ts';
import { LAYOUTS, isLayout } from '../src/lib/layout.ts';
import { inheritFromAlbum, sameCredits } from '../src/lib/defaults.ts';

const TOKENS = ['bg', 'surface', 'raised', 'line', 'hover', 'fg', 'muted', 'accent', 'accent-fg', 'good', 'warn', 'bad', 'top'];
const HSL = /^\d+(\.\d+)? \d+(\.\d+)?% \d+(\.\d+)?%$/;

describe('colour themes', () => {
  it('has unique ids and keeps the three own themes', () => {
    const ids = THEME_DEFS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(OWN_THEME_IDS).toEqual(['default', 'classic', 'light']);
    expect(THEMES.slice(0, 2).map((t) => t.id)).toEqual(['auto', 'system']);
  });

  it('gives every other theme a full, valid set of the app\'s colour tokens', () => {
    for (const d of THEME_DEFS.filter((x) => !x.own)) {
      const v = curatorVars(d);
      for (const t of TOKENS) expect(v[t], `${d.id}.${t}`).toMatch(HSL);
    }
  });

  it('applies no inline colours for the own themes (index.css owns them)', () => {
    for (const id of OWN_THEME_IDS) expect(curatorVars(resolveTheme(id))).toEqual({});
  });

  it('lists every platform theme and pairs every UI style with real themes', () => {
    for (const id of PLATFORM_THEME_IDS) expect(isTheme(id)).toBe(true);
    for (const s of UI_STYLES) {
      for (const id of Object.values(s.matching ?? {})) expect(isTheme(id), `${s.id} -> ${id}`).toBe(true);
    }
  });

  it('resolves unknown ids to the default and rejects them in isTheme', () => {
    expect(resolveTheme('does-not-exist').id).toBe('default');
    expect(isTheme('nord')).toBe(true);
    expect(isTheme('nope')).toBe(false);
    expect(isUiStyle('win98')).toBe(true);
    expect(isUiStyle('nope')).toBe(false);
  });

  it('converts hex to HSL and picks a readable text colour for an accent', () => {
    expect(hex('#ffffff')).toEqual([0, 0, 100]);
    expect(hex('#ff0000')).toEqual([0, 100, 50]);
    expect(readableOn('#f59e0b')).toBe('240 10% 8%'); // amber: dark text
    expect(readableOn('#1e3a8a')).toBe('0 0% 100%'); // navy: white text
  });
});

describe('the Toolbar style and Zinc colours (the first version)', () => {
  it('pairs the Toolbar UI style with the Zinc colours and uses the toolbar layout', () => {
    expect(isUiStyle('toolbar')).toBe(true);
    expect(isTheme('zinc')).toBe(true);
    expect(UI_STYLES.find((x) => x.id === 'toolbar')?.matching).toEqual({ light: 'zinc', dark: 'zinc' });
    expect(isLayout('toolbar')).toBe(true);
    expect(isLayout('nope')).toBe(false);
    expect(LAYOUTS.map((l) => l.id)).toEqual(['side', 'toolbar', 'rail', 'topbar', 'dock']);
  });

  it('uses the original Tailwind zinc and blue values', () => {
    const v = curatorVars(resolveTheme('zinc'));
    const css = (colour: string) => { const [h, sat, l] = hex(colour); return `${h} ${sat}% ${l}%`; };
    expect(v.bg).toBe(css('#09090b')); // zinc-950, the page
    expect(v.raised).toBe(css('#18181b')); // zinc-900, fields and buttons
    expect(v.line).toBe(css('#27272a')); // zinc-800, borders
    expect(v.muted).toBe(css('#71717a')); // zinc-500, captions
    expect(v.accent).toBe(css('#2563eb')); // blue-600, primary buttons
    expect(v.good).toBe(css('#10b981')); // emerald-500
    expect(v.bad).toBe(css('#ef4444')); // red-500
    expect(resolveTheme('zinc').dark).toBe(true);
  });
});

describe('what a track added to an album inherits', () => {
  const lead = (id: string) => [{ artistId: id, role: ['Lead artist'] }];
  const album = { credits: lead('a'), artistId: 'a', genres: ['Jazz'] };

  it('compares credits by artist and role, ignoring order and case', () => {
    expect(sameCredits([{ artistId: 'a', role: ['Lead artist', 'Writer'] }, { artistId: 'b', role: ['Producer'] }], [{ artistId: 'b', role: ['producer'] }, { artistId: 'a', role: ['writer', 'lead artist'] }])).toBe(true);
    expect(sameCredits(lead('a'), lead('b'))).toBe(false);
    expect(sameCredits(lead('a'), [...lead('a'), { artistId: 'b', role: ['Producer'] }])).toBe(false);
  });

  it('follows the album when the credits are the album\'s', () => {
    expect(inheritFromAlbum(album, lead('a'))).toEqual({ syncWithAlbumCredits: true, genres: [] });
  });

  it('keeps its own credits but starts with the album\'s genres when the credits were changed', () => {
    expect(inheritFromAlbum(album, [...lead('a'), { artistId: 'b', role: ['Featured'] }])).toEqual({ syncWithAlbumCredits: false, genres: ['Jazz'] });
  });

  it('is a plain single without an album', () => {
    expect(inheritFromAlbum(undefined, lead('a'))).toEqual({ syncWithAlbumCredits: false, genres: [] });
  });
});
