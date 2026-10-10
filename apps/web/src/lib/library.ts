import { leadArtistId, leadArtistIds, hasLead } from './defaults.ts';
import { albumCover, coverPool } from './covers.ts';
import { balancedRatings, replayVotes, type AlbumData, type Credit, type ArtistData, type PlaylistData, type PlaybackRule, type ReleaseData, type SyncRecord, type TrackData, type VoteData, type GenreData, type GroupData, type NoteData, type ProfileData, type PlaybackLogData, type RoleCategoryData, type TimelineData, type EraData } from '@curator/core';

export type Row<T> = T & { id: string };

export interface Lead { id: string; name: string }

export interface Track extends Omit<Row<TrackData>, 'artistId'> {
  /** derived from the credits (first Lead artist); never stored */
  artistId: string;
  /** every Lead artist, for individual links */
  leads: Lead[];
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
  /** the track's own cover, else its album's */
  cover: string | null;
  /** era of the album, or of the single itself */
  eraId: string | null;
  allGenres: string[];
}

export interface Library {
  tracks: Track[];
  trackById: Map<string, Track>;
  artists: Row<ArtistData>[];
  artistById: Map<string, Row<ArtistData>>;
  eras: Row<EraData>[];
  eraById: Map<string, Row<EraData>>;
  /** tracks that are not on any album */
  singles: Track[];
  albums: (Omit<Row<AlbumData>, 'artistId'> & { artistId: string; leads: Lead[]; artistName: string; trackIds: string[]; rating: number | null; /** every image of the album: uploads, its picked cover and its releases' covers */ coverPool: string[] })[];
  albumById: Map<string, Library['albums'][number]>;
  releases: Row<ReleaseData>[];
  playlists: Row<PlaylistData>[];
  genres: Row<GenreData>[];
  roles: Row<RoleCategoryData>[];
  timeline: Row<TimelineData>[];
  groups: Row<GroupData>[];
  notes: Row<NoteData>[];
  votes: Row<VoteData>[];
  logs: Row<PlaybackLogData>[];
  profile: Row<ProfileData> | null;
  rules: PlaybackRule[];
}

const live = <T,>(m: Map<string, SyncRecord> | undefined): Row<T>[] => {
  const out: Row<T>[] = [];
  for (const r of m?.values() ?? []) if (!r.deleted) out.push({ ...(r.data as T), id: r.id });
  return out;
};

/** Every lead artist (falls back to a legacy stored artist until it is migrated into the credits). */
const leadsOf = (credits: Credit[], legacy: string | undefined, artistById: Map<string, { name: string }>): Lead[] => {
  const ids = leadArtistIds(credits);
  return (ids.length ? ids : legacy ? [legacy] : []).flatMap((id) => { const n = artistById.get(id)?.name; return n ? [{ id, name: n }] : []; });
};
const namesOf = (leads: Lead[]) => (leads.length ? leads.map((l) => l.name).join(', ') : 'Unknown artist');

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

  const releases = live<ReleaseData>(rows.releases);
  // the album's cover is its picked one, else its default release's (see covers.ts); everything below sees the derived cover
  const defaultRel = (a: Row<AlbumData>) => { const mine = releases.filter((r) => r.albumId === a.id); return mine.find((r) => r.id === a.defaultReleaseId) ?? [...mine].sort((x, y) => y.trackIds.length - x.trackIds.length)[0]; };
  const coveredAlbums = rawAlbums.map((a) => ({ ...a, cover: albumCover(a, releases.filter((r) => r.albumId === a.id), defaultRel(a)) }));
  const albumOf = new Map<string, Row<AlbumData>>();
  const albumsById = by(coveredAlbums);
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
    // a track that follows its album takes the album's credits (when the album has a lead artist)
    const credits = t.syncWithAlbumCredits && album && hasLead(album.credits ?? []) ? album.credits : (t.credits ?? []);
    const artistId = leadArtistId(credits, t.artistId ?? '');
    const leads = leadsOf(credits, t.artistId, artistById);
    return {
      ...t, credits, artistId, leads, elo: r.elo, comparisons: r.comparisons, rating, effectiveRating: eff, tenStarRank: null,
      artistName: namesOf(leads),
      albumId: album?.id ?? null, albumTitle: album?.title ?? null, cover: t.cover || album?.cover || null,
      eraId: album ? album.eraId ?? null : t.eraId ?? null,
      allGenres: genres ?? [],
    };
  });
  tenStarRanks(tracks);
  const trackById = by(tracks);

  // Legacy data has album_tracks.order = 0 almost everywhere, but every album has an ordered release,
  // so a track's position comes from the album's default release (else its longest one), then `order`.
  const eras = live<EraData>(rows.eras);
  const position = (albumId: string, defaultReleaseId?: string | null) => {
    const mine = releases.filter((r) => r.albumId === albumId);
    const rel = mine.find((r) => r.id === defaultReleaseId) ?? mine.sort((x, y) => y.trackIds.length - x.trackIds.length)[0];
    return new Map((rel?.trackIds ?? []).map((id, i) => [id, i]));
  };

  const albums = coveredAlbums.map((a) => {
    // an explicit order (set when the user reorders/adds by hand) wins over the release tracklist
    const pos = a.trackOrder?.length ? new Map(a.trackOrder.map((id, i) => [id, i])) : position(a.id, a.defaultReleaseId);
    const at = (id: string) => pos.get(id) ?? Number.MAX_SAFE_INTEGER;
    const ids = (trackIdsByAlbum.get(a.id) ?? []).sort((x, y) => at(x.id) - at(y.id) || x.order - y.order).map((x) => x.id);
    const rated = ids.map((id) => trackById.get(id)!.effectiveRating).filter((x) => x > 0);
    const artistId = leadArtistId(a.credits ?? [], a.artistId ?? '');
    const leads = leadsOf(a.credits ?? [], a.artistId, artistById);
    const raw = rawAlbums.find((x) => x.id === a.id)!;
    return { ...a, artistId, leads, artistName: namesOf(leads), trackIds: ids, coverPool: coverPool(raw, releases.filter((r) => r.albumId === a.id)),
      rating: rated.length ? rated.reduce((s, x) => s + x, 0) / rated.length : null };
  });

  return {
    tracks, trackById, artists, artistById, albums, albumById: by(albums),
    eras: eras, eraById: by(eras), singles: tracks.filter((t) => !t.albumId),
    releases, playlists: live<PlaylistData>(rows.playlists),
    genres: live<GenreData>(rows.genres), roles: live<RoleCategoryData>(rows.roleCategories), timeline: live<TimelineData>(rows.timeline), groups: live<GroupData>(rows.groups), notes: live<NoteData>(rows.notes),
    votes, logs: live<PlaybackLogData>(rows.playbackLogs), profile, rules: profile?.playbackRules ?? [],
  };
}

/** 10-star tracks are shown by rank (#1 = highest Elo), as in the original app. */
function tenStarRanks(tracks: Track[]) {
  // like the legacy store, the ranked list is keyed on the (initialRating-floored) rating...
  const top = tracks.filter((t) => t.rating >= 9.9999 && t.comparisons > 0).sort((a, b) => b.elo - a.elo);
  // ...but the badge only shows a rank when the displayed rating is 10 as well
  top.forEach((t, i) => { if (t.effectiveRating >= 9.9999) t.tenStarRank = i + 1; });
}

