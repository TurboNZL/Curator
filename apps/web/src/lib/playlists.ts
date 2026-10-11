import type { Library } from './library.ts';

type Playlist = Library['playlists'][number];

export const isAlbumList = (p: Pick<Playlist, 'kind'>) => p.kind === 'albums';

/** The albums of an album playlist that still exist, in order. */
export const playlistAlbums = (lib: Library, p: Playlist) => (p.albumIds ?? []).flatMap((id) => lib.albumById.get(id) ?? []);

/** What plays: the playlist's tracks, or for an album playlist every album's tracks front to back (a track on two of them plays once). */
export function playlistTrackIds(lib: Library, p: Playlist): string[] {
  if (!isAlbumList(p)) return p.trackIds.filter((id) => lib.trackById.has(id));
  return [...new Set(playlistAlbums(lib, p).flatMap((a) => a.trackIds))];
}

/** How many things the list holds, and what to call them. */
export const playlistCount = (lib: Library, p: Playlist) => (isAlbumList(p) ? { n: playlistAlbums(lib, p).length, noun: 'album' } : { n: p.trackIds.length, noun: 'track' });

/** The covers that stand for the playlist: those of its first items, each picture once, in order. */
export function playlistCovers(lib: Library, p: Playlist, max = 4): string[] {
  const hashes = isAlbumList(p)
    ? playlistAlbums(lib, p).map((a) => a.cover)
    : p.trackIds.map((id) => lib.trackById.get(id)?.cover);
  const out: string[] = [];
  for (const h of hashes) { if (h && !out.includes(h)) out.push(h); if (out.length >= max) break; }
  return out;
}

/**
 * Spotify's rule for a playlist with no picture of its own: four different covers make a 2x2 mosaic of the first four; fewer
 * than four show the first one alone (a mosaic with repeats looks like a mistake); none shows the generated gradient.
 */
export function coverPlan(own: string | null, covers: string[]): { mode: 'own'; hash: string } | { mode: 'mosaic'; hashes: string[] } | { mode: 'single'; hash: string } | { mode: 'none' } {
  if (own) return { mode: 'own', hash: own };
  if (covers.length >= 4) return { mode: 'mosaic', hashes: covers.slice(0, 4) };
  if (covers.length) return { mode: 'single', hash: covers[0] };
  return { mode: 'none' };
}
