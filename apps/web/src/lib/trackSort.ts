import type { Track } from './derive.ts';

export type SortKey = 'rating' | 'title' | 'artist' | 'album' | 'comparisons' | 'memories' | 'released';
export type SortDir = 'asc' | 'desc';

/** Natural direction for a first click on each column: text A-Z, numbers high first. */
export const defaultDir = (k: SortKey): SortDir => (k === 'rating' || k === 'comparisons' || k === 'memories' || k === 'released' ? 'desc' : 'asc');

const text = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
const asc: Record<SortKey, (a: Track, b: Track) => number> = {
  rating: (a, b) => a.effectiveRating - b.effectiveRating || a.elo - b.elo,
  title: (a, b) => text(a.title, b.title),
  artist: (a, b) => text(a.artistName, b.artistName) || text(a.title, b.title),
  album: (a, b) => text(a.albumTitle ?? '', b.albumTitle ?? '') || text(a.title, b.title),
  comparisons: (a, b) => a.comparisons - b.comparisons,
  memories: (a, b) => (a.memories ?? 0) - (b.memories ?? 0) || a.effectiveRating - b.effectiveRating,
  released: (a, b) => (a.releaseDate ?? '').localeCompare(b.releaseDate ?? ''),
};

/** Sorted copy. Tracks with no album sort last whichever way the album column runs. */
export function sortTracks(tracks: Track[], key: SortKey, dir: SortDir): Track[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...tracks].sort((a, b) => {
    if (key === 'album' && !a.albumTitle !== !b.albumTitle) return a.albumTitle ? -1 : 1;
    if (key === 'released' && !a.releaseDate !== !b.releaseDate) return a.releaseDate ? -1 : 1; // undated last
    return sign * asc[key](a, b);
  });
}
