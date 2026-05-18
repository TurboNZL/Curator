export type RatingMode = '1-10' | '1-5' | '1-5-hidden' | '1-10-hidden';

export interface PlaybackRule {
  trackAId: string;
  trackBId: string;
  playFirstOnShuffle: boolean;
  disableOnAlbumPlayback?: boolean;
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
  eras: Era[];
  groups: string[]; 
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
  pendingFiles?: PendingFile[];
  genres?: string[];
  producers?: string[];
  writers?: string[];
  credits?: string[];
}

export interface ReleaseType {
  id: string;
  name: string;
}

export interface Release {
  id: string;
  albumId: string;
  title: string; 
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
  rating?: number;
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
  syncWithAlbum?: boolean;
}

export type PlaylistType = 'track' | 'album' | 'hybrid';

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  type: PlaylistType;
  entries: {
    type: 'track' | 'album';
    id: string;
  }[];
  createdAt: Date;
  sortConfig?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

export interface TimelineEntry {
  id: string;
  type: 'entry' | 'playback' | 'rating';
  timestamp: Date;
  title: string;
  description: string;
  entityId?: string;
}

export interface GroupMember {
  entityType: string;
  entityId: string;
  label: string;
  isVisible?: boolean;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  label?: string;
  type: 'collective' | 'thematic' | 'relationship';
  isArtistOnly: boolean;
  isEra?: boolean;
  startDate?: string;
  endDate?: string;
  members?: GroupMember[];
}