import type { Track } from './derive.ts';

export type SortKey = 'rating' | 'title' | 'artist' | 'album' | 'comparisons';
export type SortDir = 'asc' | 'desc';

/** Natural direction for a first click on each column: text A-Z, numbers high first. */
export const defaultDir = (k: SortKey): SortDir => (k === 'rating' || k === 'comparisons' ? 'desc' : 'asc');

const text = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
const asc: Record<SortKey, (a: Track, b: Track) => number> = {
  rating: (a, b) => a.effectiveRating - b.effectiveRating || a.elo - b.elo,
  title: (a, b) => text(a.title, b.title),
  artist: (a, b) => text(a.artistName, b.artistName) || text(a.title, b.title),
  album: (a, b) => text(a.albumTitle ?? '', b.albumTitle ?? '') || text(a.title, b.title),
  comparisons: (a, b) => a.comparisons - b.comparisons,
};

/** Sorted copy. Tracks with no album sort last whichever way the album column runs. */
export function sortTracks(tracks: Track[], key: SortKey, dir: SortDir): Track[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...tracks].sort((a, b) => {
    if (key === 'album' && !a.albumTitle !== !b.albumTitle) return a.albumTitle ? -1 : 1;
    return sign * asc[key](a, b);
  });
}
