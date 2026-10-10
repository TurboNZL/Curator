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
