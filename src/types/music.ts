export type RatingMode = '1-10' | '1-5' | '1-5-hidden' | '1-10-hidden';

export interface Profile {
  id: string;
  name: string;
  theme: 'dark' | 'light';
  accentColor: string;
  playbackMode: 'local' | 'spotify' | 'youtube' | 'soundcloud';
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
  type: 'Full Album' | 'Deluxe' | 'EP' | 'Single' | 'Custom';
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
  rating: number; // Balanced rating
  initialRating: number;
  localFilePath?: string;
  spotifyUri?: string;
  youtubeUrl?: string;
  genres: string[];
  producers: string[];
  bitrate?: string;
}

export interface TimelineEntry {
  id: string;
  type: 'entry' | 'playback' | 'rating';
  timestamp: Date;
  title: string;
  description: string;
  entityId?: string;
}