import type { ReleaseData, TrackData } from '@curator/core';
import { appendTrack } from './defaults.ts';
import type { Library } from './library.ts';

type Album = Library['albums'][number];

/** The release an album is "really" published as: the chosen default, else the one with the most tracks. */
export function defaultRelease(lib: Library, album: Album) {
  const mine = lib.releases.filter((r) => r.albumId === album.id);
  return mine.find((r) => r.id === album.defaultReleaseId) ?? [...mine].sort((a, b) => b.trackIds.length - a.trackIds.length)[0];
}

/** Which releases of the album a track is put on when it is added to the album. */
export interface ReleaseChoice {
  /** existing releases that get the track appended */
  releaseIds: string[];
  /** also make a release of its own (titled like the track, with the track's cover) */
  newRelease: boolean;
}

/**
 * The starting choice: a track with its own cover came from a different edition (a single), so it becomes a
 * separate release carrying that cover. A track without a cover just joins the album's default release.
 */
export function defaultChoice(lib: Library, album: Album, hasOwnCover: boolean): ReleaseChoice {
  if (hasOwnCover) return { releaseIds: [], newRelease: true };
  const d = defaultRelease(lib, album);
  return { releaseIds: d ? [d.id] : [], newRelease: false };
}

export interface AlbumAddPlan {
  /** replacement `albums` links for the track: the new album first (its album, cover and genres come from the first link) */
  trackAlbums: TrackData['albums'];
  trackOrder: string[];
  releaseAppends: { id: string; trackIds: string[] }[];
  newRelease: ReleaseData | null;
}

/** Everything that changes when `trackId` is added to `album` (pure; the caller writes it). */
export function planAddToAlbum(lib: Library, raw: TrackData, trackId: string, album: Album, choice: ReleaseChoice): AlbumAddPlan {
  const releaseAppends = choice.releaseIds.flatMap((id) => {
    const r = lib.releases.find((x) => x.id === id && x.albumId === album.id);
    return r && !r.trackIds.includes(trackId) ? [{ id, trackIds: [...r.trackIds, trackId] }] : [];
  });
  return {
    trackAlbums: [{ albumId: album.id, order: album.trackIds.length }, ...(raw.albums ?? []).filter((l) => l.albumId !== album.id)],
    trackOrder: appendTrack(album.trackIds, trackId),
    releaseAppends,
    newRelease: choice.newRelease ? { albumId: album.id, title: raw.title, cover: raw.cover ?? null, releaseDate: null, trackIds: [trackId] } : null,
  };
}

/** Which tracks the album page shows: the chosen release, or every track linked to the album. */
export type AlbumView = { kind: 'all' } | { kind: 'release'; id: string };

/** The default release when it holds every track of the album, else all tracks (so nothing seems to vanish). */
export function initialView(lib: Library, album: Album): AlbumView {
  const d = defaultRelease(lib, album);
  if (!d) return { kind: 'all' };
  const inRelease = new Set(d.trackIds);
  return album.trackIds.every((id) => inRelease.has(id)) ? { kind: 'release', id: d.id } : { kind: 'all' };
}

/** Track ids shown for a view, in order. A release lists only tracks that still exist. */
export function viewTrackIds(lib: Library, album: Album, view: AlbumView): string[] {
  if (view.kind === 'all') return album.trackIds;
  const r = lib.releases.find((x) => x.id === view.id && x.albumId === album.id);
  return r ? r.trackIds.filter((id) => lib.trackById.has(id)) : album.trackIds;
}

/**
 * An album whose releases each hold just one song (and it is the same song) is really a single. Returns that track's
 * id, or null when the album is not such a thing.
 */
export function singleTrackOf(lib: Library, album: Album): string | null {
  const releases = lib.releases.filter((r) => r.albumId === album.id);
  if (!releases.length || album.trackIds.length !== 1) return null;
  const id = album.trackIds[0];
  return releases.every((r) => r.trackIds.length === 1 && r.trackIds[0] === id) ? id : null;
}

export interface SinglePlan {
  trackId: string;
  /** fields to merge into the raw track record */
  trackPatch: Pick<TrackData, 'albums' | 'cover' | 'credits' | 'genres' | 'syncWithAlbumCredits'>;
  removeReleaseIds: string[];
  removeAlbumId: string;
  /** the eras the album was in: the single takes its place in them */
  eraIds: string[];
}

/**
 * The track leaves the album and keeps what it showed: the default release's cover, the album's era, and the credits
 * and genres it had (copied, since it no longer has an album to follow). The album and its releases are then removed.
 */
export function planConvertToSingle(lib: Library, album: Album): SinglePlan | null {
  const trackId = singleTrackOf(lib, album);
  const t = trackId ? lib.trackById.get(trackId) : undefined;
  if (!trackId || !t) return null;
  const rel = defaultRelease(lib, album);
  return {
    trackId,
    trackPatch: {
      albums: (t.albums ?? []).filter((l) => l.albumId !== album.id),
      cover: rel?.cover || album.cover || t.cover || null,
      credits: t.credits.map((c) => ({ ...c, role: [...c.role] })),
      genres: [...t.allGenres],
      syncWithAlbumCredits: false,
    },
    removeReleaseIds: lib.releases.filter((r) => r.albumId === album.id).map((r) => r.id),
    removeAlbumId: album.id,
    eraIds: album.eraIds,
  };
}
