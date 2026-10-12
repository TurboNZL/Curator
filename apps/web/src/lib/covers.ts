/**
 * An album's cover pool. Every image that belongs to the album lives in ONE pool: images uploaded to the album, the
 * album's picked cover and every release's cover. Nothing is permanently tied to a release or to the album itself:
 * releases and the album each just point at one image of the pool (or at nothing, which means "inherit").
 *
 *  - the album shows the cover it was told to pick, otherwise its default release's cover;
 *  - a release shows its own pick, otherwise the album's cover.
 */
interface AlbumCovers { cover?: string | null; covers?: string[]; coverPicked?: boolean }
interface ReleaseCover { cover: string | null }

/** Unique images of the album, album uploads first, then the picked cover, then the releases' covers. */
export function coverPool(album: AlbumCovers, releases: ReleaseCover[]): string[] {
  const out: string[] = [];
  for (const h of [...(album.covers ?? []), album.cover, ...releases.map((r) => r.cover)]) if (h && !out.includes(h)) out.push(h);
  return out;
}

/** Whether the album has a cover of its own choosing. Old records have no flag: a cover that is set counts as chosen. */
export const coverPicked = (album: AlbumCovers) => album.coverPicked ?? !!album.cover;

/** What the album shows. `defaultRelease` is the release it inherits from. */
export function albumCover(album: AlbumCovers, releases: ReleaseCover[], defaultRelease?: ReleaseCover): string | null {
  if (coverPicked(album) && album.cover) return album.cover;
  return defaultRelease?.cover || releases.find((r) => r.cover)?.cover || album.covers?.[0] || album.cover || null;
}

/** Hashes a record pointed at before and no longer points at (an overwritten or cleared cover). */
export function droppedCover(prev: string | null | undefined, next: string | null | undefined): string | null {
  return prev && prev !== next ? prev : null;
}

/** The album's `covers` with `hash` added (same array when it is already in the pool, so callers can skip a write). */
export function withCoverKept(album: AlbumCovers, releases: ReleaseCover[], hash: string): string[] {
  const covers = album.covers ?? [];
  return coverPool(album, releases).includes(hash) ? covers : [...covers, hash];
}

export interface CoverRemoval { album: { covers: string[]; cover: string | null; coverPicked: boolean }; releaseIds: string[] }

/**
 * Deleting an image from the pool for good: it leaves the album's list, stops being the picked cover, and every release
 * that used it goes back to "inherit". Returns what to write; nothing is left pointing at the image.
 */
export function planRemoveCover(album: AlbumCovers, releases: { id: string; cover: string | null }[], hash: string): CoverRemoval {
  const picked = album.cover === hash;
  return {
    album: { covers: (album.covers ?? []).filter((h) => h !== hash), cover: picked ? null : album.cover ?? null, coverPicked: picked ? false : coverPicked(album) },
    releaseIds: releases.filter((r) => r.cover === hash).map((r) => r.id),
  };
}
