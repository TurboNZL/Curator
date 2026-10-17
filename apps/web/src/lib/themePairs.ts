import { getCatalog } from 'turbothemes';

/**
 * Which colour theme is the light/dark twin of which, so the picker's Light / Dark switch can flip the selected theme as well as the list.
 * Same rule as the engine's `counterpartOf` (a palette's own `pair`, then the two palettes a style lists as matching, always one light and one
 * dark, at most one twin each). Kept here until this app's pin of turbothemes carries that function; then replace this file with it.
 */
interface PaletteLike { id: string; mode: 'dark' | 'light'; pair?: string }
interface StyleLike { id: string; order?: number; matching?: { light: string; dark?: string } }

export function buildPairs(palettes: PaletteLike[], styles: StyleLike[]): Map<string, string> {
  const mode = new Map(palettes.map((p) => [p.id, p.mode]));
  const out = new Map<string, string>();
  const join = (a: string, b: string) => {
    if (a === b || out.has(a) || out.has(b) || !mode.has(a) || !mode.has(b) || mode.get(a) === mode.get(b)) return;
    out.set(a, b); out.set(b, a);
  };
  for (const p of palettes) if (p.pair) join(p.id, p.pair);
  for (const s of [...styles].sort((x, y) => (x.order ?? 1e9) - (y.order ?? 1e9) || x.id.localeCompare(y.id))) if (s.matching?.dark) join(s.matching.light, s.matching.dark);
  return out;
}

let cached: { key: unknown; pairs: Map<string, string> } | null = null;
/** The twin of a colour theme in the other mode, or undefined when it exists in one mode only (or is "auto" / "system"). */
export function counterpart(id: string): string | undefined {
  const cat = getCatalog();
  if (!cached || cached.key !== cat) cached = { key: cat, pairs: buildPairs(cat.palettes, cat.styles) };
  return cached.pairs.get(id);
}
