export interface Credit {
  artistId: string;
  role: string;
}

export interface Profile {
  id: string;
  name: string;
  theme: string;
  accentColor: string;
  playbackMode: string;
  settings?: {
    showUnbalancedFirst?: boolean;
    defaultArtistImage?: string;
    defaultAlbumImage?: string;
    applyRulesFromAlbum?: boolean;
  };
  playbackRules: PlaybackRule[];
}

export interface Artist {
  id: string;
  name: string;
  image?: string;
  groups: string[];
  eras: any[]; // Based on mock data, could be further refined
  bio?: string;
}

export interface Album {
  id: string;
  title: string;
  credits: Credit[]; // Primary artist and additional artists with roles
  eraId?: string;
  primaryCover?: string; // Album's explicitly set primary cover (optional manual override)
  defaultReleaseId?: string;
  pendingFiles: { url: string; name: string }[];
  credits: string[]; // Added album-level credits
}

export interface Release {
  id: string;
  albumId: string;
  title: string;
  coverImage?: string;
  releaseDate?: string;
  spotifyUri?: string;
  trackIds: string[]; // Array of track IDs in this release
}

export interface Track {
  id: string;
  title: string;
  artistCredits: Credit[]; // Combined primary and additional artists with roles
  rating?: number; // Balanced rating (0-10)
  initialRating?: number; // Unbalanced rating
  eloScore: number;
  comparisons: number;
  localFilePath?: string;
  spotifyUrl?: string;
  geniusUrl?: string;
  youtubeMusicUrl?: string;
  genres: string[];
  producers: string[];
  writers: string[];
  credits: string[];
  bitrate?: string;
  bpm?: number;
  key?: string;
  memories: number;
  queueRules: any; // Could be further refined
  syncWithAlbumCredits: boolean; // New field to control individual credit editing
  albumIds: { albumId: string; order: number }[]; // Relation to albums
  isFavorite: boolean;
}

export interface TimelineEntry {
  id: string;
  type: string;
  timestamp: Date;
  title: string;
  description: string;
  entityId?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  createdAt: Date;
  trackIds: string[];
}

export interface GroupMember {
  entityType: 'artist' | 'album' | 'track' | 'release';
  entityId: string;
  label: string; // For UI display
  showOnEntityPage?: boolean;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  label?: string;
  type: 'collective' | 'thematic' | 'relationship' | 'era';
  isArtistOnly: boolean;
  members?: GroupMember[];
}

export interface ReleaseType {
  id: string;
  name: string;
}

export interface PlaybackRule {
  trackAId: string;
  trackBId: string;
  playFirstOnShuffle: boolean;
  applyToAlbumSource: boolean;
}

export interface PlaybackLog {
  id: string;
  trackId: string;
  timestamp: Date;
  duration?: number; // seconds played
  sourceType?: string; // 'album', 'playlist', 'shuffle', 'search'
  sourceId?: string;
  isSkip: boolean;
}