import type { Library, Track } from './library.ts';
import type { SortDir } from './trackSort.ts';

/** One sortable column of a list page: what it is called and which way a first click should go. */
export interface SortOption<K extends string = string> { value: K; label: string; dir: SortDir }

const text = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
const sign = (dir: SortDir) => (dir === 'asc' ? 1 : -1);
const memoriesOf = (lib: Library, ids: string[]) => ids.reduce((n, id) => n + (lib.trackById.get(id)?.memories ?? 0), 0);

type Album = Library['albums'][number];
export type AlbumSort = 'title' | 'artist' | 'rating' | 'tracks' | 'memories' | 'released';
export const ALBUM_SORTS: SortOption<AlbumSort>[] = [
  { value: 'title', label: 'Title', dir: 'asc' }, { value: 'artist', label: 'Artist', dir: 'asc' }, { value: 'rating', label: 'Rating', dir: 'desc' },
  { value: 'tracks', label: 'Track count', dir: 'desc' }, { value: 'memories', label: 'Memories', dir: 'desc' }, { value: 'released', label: 'Release date', dir: 'desc' },
];
/** Missing ratings and dates sort last whichever way the column runs. */
export function sortAlbums(lib: Library, albums: Album[], key: AlbumSort, dir: SortDir): Album[] {
  const s = sign(dir);
  return [...albums].sort((a, b) => {
    if (key === 'rating' && (a.rating == null) !== (b.rating == null)) return a.rating == null ? 1 : -1;
    if (key === 'released' && !a.releaseDate !== !b.releaseDate) return a.releaseDate ? -1 : 1;
    switch (key) {
      case 'title': return s * text(a.title, b.title);
      case 'artist': return s * (text(a.artistName, b.artistName) || text(a.title, b.title));
      case 'rating': return s * ((a.rating ?? 0) - (b.rating ?? 0));
      case 'tracks': return s * (a.trackIds.length - b.trackIds.length);
      case 'memories': return s * (memoriesOf(lib, a.trackIds) - memoriesOf(lib, b.trackIds));
      case 'released': return s * (a.releaseDate ?? '').localeCompare(b.releaseDate ?? '');
    }
  });
}

export interface ArtistRow { id: string; name: string; image: string | null | undefined; tracks: number; albums: number; memories: number; rating: number | null }
export type ArtistSort = 'name' | 'tracks' | 'albums' | 'rating' | 'memories';
export const ARTIST_SORTS: SortOption<ArtistSort>[] = [
  { value: 'tracks', label: 'Track count', dir: 'desc' }, { value: 'name', label: 'Name', dir: 'asc' }, { value: 'albums', label: 'Album count', dir: 'desc' },
  { value: 'rating', label: 'Rating', dir: 'desc' }, { value: 'memories', label: 'Memories', dir: 'desc' },
];
export function artistRows(lib: Library): ArtistRow[] {
  const byArtist = new Map<string, Track[]>();
  for (const t of lib.tracks) for (const l of t.leads) byArtist.set(l.id, [...(byArtist.get(l.id) ?? []), t]);
  return lib.artists.map((a) => {
    const ts = byArtist.get(a.id) ?? [];
    const rated = ts.filter((t) => t.effectiveRating > 0.001);
    return {
      id: a.id, name: a.name, image: a.image, tracks: ts.length, albums: new Set(ts.flatMap((t) => (t.albumId ? [t.albumId] : []))).size,
      memories: ts.reduce((n, t) => n + (t.memories ?? 0), 0), rating: rated.length ? rated.reduce((n, t) => n + t.effectiveRating, 0) / rated.length : null,
    };
  });
}
export function sortArtists(rows: ArtistRow[], key: ArtistSort, dir: SortDir): ArtistRow[] {
  const s = sign(dir);
  return [...rows].sort((a, b) => {
    if (key === 'rating' && (a.rating == null) !== (b.rating == null)) return a.rating == null ? 1 : -1;
    const n = key === 'name' ? s * text(a.name, b.name) : s * ((key === 'rating' ? (a.rating ?? 0) - (b.rating ?? 0) : a[key] - b[key]));
    return n || text(a.name, b.name);
  });
}

type Era = Library['eras'][number];
export interface EraRow { era: Era; albums: Album[]; singles: Track[]; cover: string | null; newest: string }
export type EraSort = 'name' | 'albums' | 'items' | 'newest';
export const ERA_SORTS: SortOption<EraSort>[] = [
  { value: 'name', label: 'Name', dir: 'asc' }, { value: 'albums', label: 'Album count', dir: 'desc' }, { value: 'items', label: 'Albums + singles', dir: 'desc' }, { value: 'newest', label: 'Newest release', dir: 'desc' },
];
export function eraRows(lib: Library, eras: Era[] = lib.eras): EraRow[] {
  return eras.map((e) => {
    const albums = e.albumIds.flatMap((id) => lib.albumById.get(id) ?? []);
    const singles = e.trackIds.flatMap((id) => lib.trackById.get(id) ?? []);
    const dates = [...albums.map((a) => a.releaseDate), ...singles.map((t) => t.releaseDate)].filter((d): d is string => !!d).sort();
    return { era: e, albums, singles, cover: e.cover || albums.find((a) => a.cover)?.cover || null, newest: dates[dates.length - 1] ?? '' };
  });
}
export function sortEras(rows: EraRow[], key: EraSort, dir: SortDir): EraRow[] {
  const s = sign(dir);
  return [...rows].sort((a, b) => {
    if (key === 'newest' && !a.newest !== !b.newest) return a.newest ? -1 : 1;
    const n = key === 'name' ? text(a.era.name, b.era.name) : key === 'albums' ? a.albums.length - b.albums.length : key === 'items' ? a.albums.length + a.singles.length - b.albums.length - b.singles.length : a.newest.localeCompare(b.newest);
    return s * n || text(a.era.name, b.era.name);
  });
}
