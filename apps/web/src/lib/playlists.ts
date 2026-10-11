import type { Library } from './library.ts';

type Playlist = Library['playlists'][number];

export const isAlbumList = (p: Pick<Playlist, 'kind'>) => p.kind === 'albums';

/** One entry of an album playlist: a whole album, or one release of an album (its own cover and tracklist). */
export interface AlbumEntry { id: string; title: string; cover: string | null; trackIds: string[]; leads: Library['albums'][number]['leads']; to: string; release: boolean }

/**
 * The entries of an album playlist that still exist, in order. `albumIds` holds album ids and release ids (they never collide),
 * so a playlist can mix whole albums with single releases and keep one order.
 */
export function playlistAlbums(lib: Library, p: Playlist): AlbumEntry[] {
  return (p.albumIds ?? []).flatMap((id): AlbumEntry[] => {
    const a = lib.albumById.get(id);
    if (a) return [{ id, title: a.title, cover: a.cover, trackIds: a.trackIds, leads: a.leads, to: `/albums/${a.id}`, release: false }];
    const r = lib.releases.find((x) => x.id === id);
    const alb = r && lib.albumById.get(r.albumId);
    if (!r || !alb) return [];
    return [{ id, title: r.title === alb.title ? alb.title : `${alb.title} (${r.title})`, cover: r.cover ?? alb.cover, trackIds: r.trackIds.filter((t) => lib.trackById.has(t)), leads: alb.leads, to: `/albums/${alb.id}?release=${r.id}`, release: true }];
  });
}

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
