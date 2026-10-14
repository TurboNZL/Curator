import { useCallback, useState } from 'react';
import type { SortDir } from './trackSort.ts';
import type { SortOption } from './listSort.ts';

export type ViewMode = 'grid' | 'list';
interface Saved { sort: string; dir: SortDir; view: ViewMode }

const read = (page: string): Partial<Saved> => { try { return JSON.parse(localStorage.getItem(`turbomusic.page.${page}`) ?? '{}'); } catch { return {}; } };
const write = (page: string, s: Saved) => { try { localStorage.setItem(`turbomusic.page.${page}`, JSON.stringify(s)); } catch { /* private window: not remembered */ } };

/**
 * Sort column, direction and grid/list choice of a list page, remembered per page on this device (a per-viewer convenience,
 * so localStorage and not a synced record). Choosing the column already in use flips its direction, like a table header.
 */
export function usePageState<K extends string>(page: string, options: SortOption<K>[], defaults: { sort: K; view?: ViewMode }) {
  const [s, setS] = useState<Saved>(() => {
    const saved = read(page);
    const sort = options.some((o) => o.value === saved.sort) ? (saved.sort as K) : defaults.sort;
    const dir = saved.dir === 'asc' || saved.dir === 'desc' ? saved.dir : options.find((o) => o.value === sort)!.dir;
    return { sort, dir, view: saved.view === 'list' || saved.view === 'grid' ? saved.view : defaults.view ?? 'grid' };
  });
  const set = useCallback((next: Saved) => { setS(next); write(page, next); }, [page]);
  return {
    sort: s.sort as K, dir: s.dir, view: s.view,
    setSort: (k: K) => set(k === s.sort ? { ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { ...s, sort: k, dir: options.find((o) => o.value === k)!.dir }),
    flip: () => set({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }),
    setView: (view: ViewMode) => set({ ...s, view }),
  };
}
