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
  };
  playbackRules: PlaybackRule[];
}

export interface Artist {
  id: string;
  name: string;
  image?: string;
  bio?: string;
  eras: Era[];
  groups: string[]; // IDs of other artists/collectives
}

export interface Era {
  id: string;
  name: string;
  artistId: string;
  description?: string;
}

export interface Album {
  id: string;
  title: string;
  artistId: string;
  eraId?: string;
  covers: string[];
  defaultReleaseId?: string;
  pendingFiles?: string[]; // URLs of uploaded but unassigned audio files
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
  albumIds: string[];
  rating?: number; // Balanced rating, nullable
  initialRating?: number;
  eloScore: number;
  comparisons: number;
  localFilePath?: string;
  spotifyUrl?: string;
  geniusUrl?: string;
  soundcloudUrl?: string;
  youtubeMusicUrl?: string;
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

export interface TimelineEntry {
  id: string;
  type: 'entry' | 'playback' | 'rating';
  timestamp: Date;
  title: string;
  description: string;
  entityId?: string;
}

export interface Note {
  id: string;
  entityType: 'artist' | 'album' | 'track';
  entityId: string;
  label?: string;
  content: string;
  isLinked: boolean;
  createdAt: Date;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  label?: string;
  type: 'collective' | 'thematic' | 'relationship';
  isArtistOnly: boolean;
}
