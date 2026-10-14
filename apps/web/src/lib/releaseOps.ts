import type { AlbumData, ReleaseData } from '@turbomusic/core';
import type { Library } from './library.ts';
import { insertNewTracks } from './albumMerge.ts';

type Rel = Library['releases'][number];
const uniq = <T,>(xs: T[]) => [...new Set(xs)];

/** The date a new release of an album should start with: the default release's, else the earliest date any release has. Null when none has one. */
export function siblingDate(releases: Pick<Rel, 'id' | 'releaseDate'>[], defaultReleaseId?: string | null, exceptId?: string): string | null {
  const others = releases.filter((r) => r.id !== exceptId && r.releaseDate);
  return others.find((r) => r.id === defaultReleaseId)?.releaseDate ?? [...others].map((r) => r.releaseDate!).sort()[0] ?? null;
}

export interface ReleaseMergePlan {
  /** what the surviving release becomes */
  keepPatch: { trackIds: string[]; releaseDate: string | null; cover: string | null; tags: string[] };
  /** pool and default-release changes of the album */
  albumPatch: Partial<Pick<AlbumData, 'covers' | 'defaultReleaseId'>>;
  removeId: string;
  summary: string[];
}

/**
 * Folds release `dropId` into release `keepId` of the same album: the survivor keeps its title, and takes the other's date, cover and
 * tags where it has none; its tracklist gains the tracks only the other had (each placed after the closest earlier track they share).
 * The dropped release's cover stays in the album's pool; if it was the default, the survivor is now. Pure; tested.
 */
export function planMergeReleases(lib: Library, keepId: string, dropId: string): ReleaseMergePlan | null {
  const keep = lib.releases.find((r) => r.id === keepId), drop = lib.releases.find((r) => r.id === dropId);
  if (!keep || !drop || keep.id === drop.id || keep.albumId !== drop.albumId) return null;
  const album = lib.albumById.get(keep.albumId);
  if (!album) return null;
  const have = new Set(keep.trackIds);
  const trackIds = insertNewTracks(keep.trackIds, drop.trackIds.map((id) => (have.has(id) ? { trackId: id, include: true } : { trackId: null, newId: id, include: true })));
  const added = trackIds.length - keep.trackIds.length;
  const pool = (album as { covers?: string[] }).covers ?? [];
  const droppedCover = drop.cover && drop.cover !== keep.cover && !pool.includes(drop.cover) ? drop.cover : null;
  const wasDefault = album.defaultReleaseId === drop.id;
  const summary: string[] = [];
  if (added) summary.push(`${added} track${added === 1 ? '' : 's'} only “${drop.title}” had are added`);
  if (!keep.releaseDate && drop.releaseDate) summary.push(`takes its date, ${drop.releaseDate}`);
  if (!keep.cover && drop.cover) summary.push('takes its cover');
  else if (droppedCover) summary.push('its cover stays available in the album’s pictures');
  if (wasDefault) summary.push('becomes the album’s default release');
  return {
    keepPatch: { trackIds, releaseDate: keep.releaseDate ?? drop.releaseDate ?? null, cover: keep.cover ?? drop.cover ?? null, tags: uniq([...(keep.tags ?? []), ...(drop.tags ?? [])]) },
    albumPatch: { ...(droppedCover ? { covers: [...pool, droppedCover] } : {}), ...(wasDefault ? { defaultReleaseId: keep.id } : {}) },
    removeId: drop.id, summary,
  };
}

/** The tracklist of an existing release after an imported edition is folded into it: the imported order decides where new tracks land. */
export function foldIntoRelease(existing: string[], imported: { trackId: string | null; newId?: string }[]): string[] {
  const have = new Set(existing);
  return insertNewTracks(existing, imported.map((r) => (r.trackId && have.has(r.trackId) ? { trackId: r.trackId, include: true } : { trackId: null, newId: r.trackId ?? r.newId, include: true })));
}

/** All the tags in use on any release, most used first (suggestions for the tag box). */
export function allReleaseTags(releases: { tags?: string[] }[]): string[] {
  const n = new Map<string, number>();
  for (const r of releases) for (const t of r.tags ?? []) n.set(t, (n.get(t) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
}

export type { ReleaseData };
