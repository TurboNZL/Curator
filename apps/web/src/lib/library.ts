import { balancedRatings, replayVotes, type AlbumData, type ArtistData, type PlaylistData, type PlaybackRule, type ReleaseData, type SyncRecord, type TrackData, type VoteData, type GenreData, type GroupData, type NoteData, type ProfileData } from '@curator/core';

export type Row<T> = T & { id: string };

export interface Track extends Row<TrackData> {
  elo: number; comparisons: number;
  /** 0-10 from the votes (unfloored by comparisons); see effectiveRating */
  rating: number;
  /** what the UI should show as the rating (needs >=3 comparisons, else the manual initial rating) */
  effectiveRating: number;
  /** 1-based rank among 10-star tracks, else null */
  tenStarRank: number | null;
  artistName: string;
  albumId: string | null;
  albumTitle: string | null;
  cover: string | null;
  allGenres: string[];
}

export interface Library {
  tracks: Track[];
  trackById: Map<string, Track>;
  artists: Row<ArtistData>[];
  artistById: Map<string, Row<ArtistData>>;
  albums: (Row<AlbumData> & { artistName: string; trackIds: string[]; rating: number | null })[];
  albumById: Map<string, Library['albums'][number]>;
  releases: Row<ReleaseData>[];
  playlists: Row<PlaylistData>[];
  genres: Row<GenreData>[];
  groups: Row<GroupData>[];
  notes: Row<NoteData>[];
  votes: Row<VoteData>[];
  profile: Row<ProfileData> | null;
  rules: PlaybackRule[];
}

const live = <T,>(m: Map<string, SyncRecord>): Row<T>[] => {
  const out: Row<T>[] = [];
  for (const r of m.values()) if (!r.deleted) out.push({ ...(r.data as T), id: r.id });
  return out;
};

const by = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]));

export function buildLibrary(rows: Record<string, Map<string, SyncRecord>>): Library {
  const artists = live<ArtistData>(rows.artists);
  const artistById = by(artists);
  const rawAlbums = live<AlbumData>(rows.albums);
  const rawTracks = live<TrackData>(rows.tracks);
  const votes = live<VoteData>(rows.votes);
  const profile = live<ProfileData>(rows.profiles)[0] ?? null;

  const ranked = replayVotes(votes.map((v) => ({ ...v })), rawTracks.map((t) => t.id));
  const ratings = balancedRatings(ranked, new Map(rawTracks.map((t) => [t.id, t.initialRating])));

  const albumOf = new Map<string, Row<AlbumData>>();
  const albumsById = by(rawAlbums);
  const trackIdsByAlbum = new Map<string, { id: string; order: number }[]>();
  for (const t of rawTracks) {
    for (const link of t.albums ?? []) {
      if (!albumsById.has(link.albumId)) continue;
      if (!albumOf.has(t.id)) albumOf.set(t.id, albumsById.get(link.albumId)!);
      const list = trackIdsByAlbum.get(link.albumId) ?? [];
      list.push({ id: t.id, order: link.order });
      trackIdsByAlbum.set(link.albumId, list);
    }
  }

  const tracks: Track[] = rawTracks.map((t) => {
    const r = ranked.get(t.id)!;
    const rating = ratings.get(t.id) ?? 0;
    const album = albumOf.get(t.id) ?? null;
    const eff = r.comparisons >= 3 && rating > 0.001 ? rating : (t.initialRating ?? 0) > 0.001 ? t.initialRating! : 0;
    const genres = t.syncWithAlbumCredits && album ? album.genres : t.genres;
    return {
      ...t, elo: r.elo, comparisons: r.comparisons, rating, effectiveRating: eff, tenStarRank: null,
      artistName: artistById.get(t.artistId)?.name ?? 'Unknown artist',
      albumId: album?.id ?? null, albumTitle: album?.title ?? null, cover: album?.cover ?? null,
      allGenres: genres ?? [],
    };
  });
  tenStarRanks(tracks);
  const trackById = by(tracks);

  // Legacy data has album_tracks.order = 0 almost everywhere, but every album has an ordered release,
  // so a track's position comes from the album's default release (else its longest one), then `order`.
  const releases = live<ReleaseData>(rows.releases);
  const position = (albumId: string, defaultReleaseId?: string | null) => {
    const mine = releases.filter((r) => r.albumId === albumId);
    const rel = mine.find((r) => r.id === defaultReleaseId) ?? mine.sort((x, y) => y.trackIds.length - x.trackIds.length)[0];
    return new Map((rel?.trackIds ?? []).map((id, i) => [id, i]));
  };

  const albums = rawAlbums.map((a) => {
    const pos = position(a.id, a.defaultReleaseId);
    const at = (id: string) => pos.get(id) ?? Number.MAX_SAFE_INTEGER;
    const ids = (trackIdsByAlbum.get(a.id) ?? []).sort((x, y) => at(x.id) - at(y.id) || x.order - y.order).map((x) => x.id);
    const rated = ids.map((id) => trackById.get(id)!.effectiveRating).filter((x) => x > 0);
    return { ...a, artistName: artistById.get(a.artistId)?.name ?? 'Unknown artist', trackIds: ids,
      rating: rated.length ? rated.reduce((s, x) => s + x, 0) / rated.length : null };
  });

  return {
    tracks, trackById, artists, artistById, albums, albumById: by(albums),
    releases, playlists: live<PlaylistData>(rows.playlists),
    genres: live<GenreData>(rows.genres), groups: live<GroupData>(rows.groups), notes: live<NoteData>(rows.notes),
    votes, profile, rules: profile?.playbackRules ?? [],
  };
}

/** 10-star tracks are shown by rank (#1 = highest Elo), as in the original app. */
function tenStarRanks(tracks: Track[]) {
  // like the legacy store, the ranked list is keyed on the (initialRating-floored) rating...
  const top = tracks.filter((t) => t.rating >= 9.9999 && t.comparisons > 0).sort((a, b) => b.elo - a.elo);
  // ...but the badge only shows a rank when the displayed rating is 10 as well
  top.forEach((t, i) => { if (t.effectiveRating >= 9.9999) t.tenStarRank = i + 1; });
}

