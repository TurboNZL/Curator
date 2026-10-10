/**
 * Shapes of `SyncRecord.data` per table. These are the app's canonical entities.
 * Images and audio are referenced by content hash (sha256 hex) and resolved to a
 * URL/blob by each client, never by server-relative path.
 *
 * NOT stored on purpose: a track's elo, comparisons and rating. They are derived from
 * the `votes` log (see elo.ts), which is what makes multi-device voting mergeable.
 */
export interface Credit { artistId: string; role: string[] }
export interface FileRef { hash: string | null }

export interface ArtistData { name: string; image: string | null }
/** An era groups albums and singles (Era > Album > Release > Track). Relational bios can be attached to it. */
export interface EraData { name: string; description: string | null; cover: string | null }
export interface AlbumData {
  title: string;
  credits: Credit[];
  /** @deprecated the old single-artist field. Credits (Lead artist) are the only artist now; kept only so old records can be migrated. */
  artistId?: string;
  genres: string[];
  cover: string | null;
  eraId?: string | null;
  defaultReleaseId?: string | null;
  /** explicit track order (ids); wins over the release tracklist. Set when the user reorders or adds tracks by hand. */
  trackOrder?: string[];
}
export interface ReleaseData {
  albumId: string;
  title: string;
  cover: string | null;
  releaseDate: string | null;
  /** ordered */
  trackIds: string[];
}
export interface TrackData {
  title: string;
  /** @deprecated see AlbumData.artistId */
  artistId?: string;
  credits: Credit[];
  /** the track's own cover (a single's artwork); an album track without one shows its album's cover */
  cover?: string | null;
  /** only for tracks that are not on an album: the era they belong to */
  eraId?: string | null;
  /** only used when syncWithAlbumCredits is false; otherwise genres come from the album */
  genres: string[];
  albums: { albumId: string; order: number }[];
  /** audio content hash; null = no file yet */
  file: string | null;
  initialRating: number | null;
  spotifyUrl: string | null;
  geniusUrl: string | null;
  youtubeMusicUrl: string | null;
  bitrate: string | null;
  bpm: number | null;
  key: string | null;
  memories: number;
  syncWithAlbumCredits: boolean;
  queueRules: Record<string, unknown>;
}
export interface PlaylistData {
  name: string;
  description: string | null;
  cover: string | null;
  createdAt: number;
  trackIds: string[];
}
export interface GroupMemberData {
  entityType: 'artist' | 'album' | 'track' | 'release' | 'era';
  entityId: string;
  showOnEntityPage: boolean;
}
export interface GroupData {
  name: string;
  description: string | null;
  label: string | null;
  type: string;
  members: GroupMemberData[];
}
export interface NoteData {
  entityType: string;
  entityId: string;
  label: string;
  content: string;
  isLinked: boolean;
  createdAt: number;
}
export interface GenreData { name: string }
export interface RoleCategoryData { name: string; isRemovable: boolean }
export interface TimelineData { type: string; title: string; description: string; entityId: string | null; timestamp: number }
export interface VoteData {
  trackAId: string; trackBId: string;
  winnerId: string | null; isEqual: boolean;
  timestamp: number;
}
export interface PlaybackLogData {
  trackId: string; timestamp: number; duration: number | null;
  sourceType: string | null; sourceId: string | null; isSkip: boolean;
}
export interface ProfileData {
  name: string; theme: string; accentColor: string; playbackMode: string;
  settings: Record<string, unknown>;
  playbackRules: import('./queue.ts').PlaybackRule[];
}
