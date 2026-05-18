export type RatingMode = '1-10' | '1-5' | '1-5-hidden' | '1-10-hidden';

export interface PlaybackRule {
  trackAId: string;
  trackBId: string;
  playFirstOnShuffle: boolean;
}

export interface Profile {
  id: string;
  name: string;
  theme: 'dark' | 'light';
  accentColor: string;
  playbackMode: 'local' | 'spotify' | 'youtube' | 'soundcloud';
  settings?: {
    showUnbalancedFirst: boolean;
    defaultArtistImage?: string;
    defaultAlbumImage?: string;
    applyRulesFromAlbum?: boolean; // New setting
  };
  playbackRules: PlaybackRule[];
}

export interface Artist {
  id: string;
  name: string;
  image?: string;
  eras: Era[];
  groups: string[]; // IDs of other artists/collectives
}

export interface Era {
  id: string;
  name: string;
  artistId: string;
  description?: string;
}

export interface PendingFile {
  url: string;
  name: string;
}

export interface Album {
  id: string;
  title: string;
  artistId: string;
  artistIds?: string[];
  eraId?: string;
  covers: string[];
  defaultReleaseId?: string;
  pendingFiles?: PendingFile[]; // Uploaded but unassigned audio files
}

export interface ReleaseType {
  id: string;
  name: string;
}

export interface Release {
  id: string;
  albumId: string;
  title: string; // e.g. "Deluxe Edition"
  coverImage: string;
  trackIds: string[];
  releaseDate?: string;
  spotifyUri?: string;
}

export interface Track {
  id: string;
  title: string;
  artistId: string;
  artistIds?: string[];
  albumIds: string[];
  rating?: number; // Balanced rating, nullable
  initialRating?: number;
  eloScore: number;
  comparisons: number;
  localFilePath?: string;
  spotifyUrl?: string;
  geniusUrl?: string;
  youtubeMusicUrl?: string; // Removed soundcloudUrl
  genres: string[];
  producers: string[];
  writers: string[];
  credits: string[];
  bitrate?: string;
  bpm?: number;
  key?: string;
  memories: number;
  queueRules?: {
    nextTrackId?: string;
    forbiddenStandalone?: boolean;
  };
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  trackIds: string[];
  createdAt: Date;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  label?: string;
  type: 'collective' | 'thematic' | 'relationship' | 'era'; // Added 'era' type
  // Removed isArtistOnly
  members?: { entityType: string, entityId: string, label?: string, showOnEntityPage?: boolean }[]; // Added showOnEntityPage
}

export interface TimelineEntry {
  id: string;
  type: string;
  timestamp: Date;
  title: string;
  description: string;
  entityId?: string;
}