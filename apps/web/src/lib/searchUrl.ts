import { FILTER_DOCS, type Chip, type FilterKey, type FilterScope } from './filters.ts';

/** What the search page can list. `all` shows a few of each. */
export type SearchKind = 'all' | 'artists' | 'albums' | 'singles' | 'tracks' | 'eras';
export const SEARCH_KINDS: SearchKind[] = ['all', 'artists', 'albums', 'singles', 'tracks', 'eras'];
/** the filter scope each kind of result is checked against (a chip that does not apply to a kind hides that kind) */
export const KIND_SCOPE: Record<Exclude<SearchKind, 'all'>, FilterScope> = { artists: 'artists', albums: 'albums', singles: 'singles', tracks: 'tracks', eras: 'eras' };

export interface SearchState { q: string; chips: Chip[]; kind: SearchKind }

const KEYS = Object.keys(FILTER_DOCS) as FilterKey[];

/**
 * The address of a search: /search?q=words&in=albums&f=["artist","<id>","Name"]&f=… Everything lives in the address, so Back, links
 * from other pages (an artist's "Albums") and the top search bar all show the same thing.
 */
export function searchHref({ q = '', chips = [], kind = 'all' }: Partial<SearchState>): string {
  const p = new URLSearchParams();
  if (q.trim()) p.set('q', q.trim());
  if (kind !== 'all') p.set('in', kind);
  for (const c of chips) p.append('f', JSON.stringify([c.key, c.value, c.label]));
  const s = p.toString();
  return s ? `/search?${s}` : '/search';
}

export function parseSearch(params: URLSearchParams): SearchState {
  const kind = params.get('in') as SearchKind | null;
  const chips: Chip[] = [];
  for (const raw of params.getAll('f')) {
    try {
      const [key, value, label] = JSON.parse(raw) as [string, string, string];
      if (KEYS.includes(key as FilterKey) && typeof value === 'string' && value) chips.push({ key: key as FilterKey, value, label: typeof label === 'string' && label ? label : value });
    } catch { /* a damaged link: skip that filter */ }
  }
  return { q: params.get('q') ?? '', chips, kind: kind && SEARCH_KINDS.includes(kind) ? kind : 'all' };
}

/** Does every chip apply to this kind of result? (`album:` means nothing for albums themselves.) */
export const chipsApply = (chips: Chip[], kind: Exclude<SearchKind, 'all'>) => chips.every((c) => FILTER_DOCS[c.key].scopes.includes(KIND_SCOPE[kind]));

/** A chip for one thing, as the filter bar would make it from the id (the label is what the chip shows). */
export const idChip = (key: 'artist' | 'era' | 'album', id: string, label: string): Chip => ({ key, value: id, label });
