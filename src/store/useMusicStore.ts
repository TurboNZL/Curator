import { create } from 'zustand';
import { Profile, Artist, Album, Track, Release, TimelineEntry } from '../types/music';
import { MOCK_ARTISTS, MOCK_ALBUMS, MOCK_TIMELINE } from './mockData';

interface MusicState {
  activeProfile: Profile;
  artists: Artist[];
  albums: Album[];
  tracks: Track[];
  releases: Release[];
  timeline: TimelineEntry[];
  currentTrackId: string | null;
  isPlaying: boolean;
  
  // Actions
  setPlaybackMode: (mode: Profile['playbackMode']) => void;
  setCurrentTrack: (trackId: string | null) => void;
  togglePlay: () => void;
  addArtist: (artist: Artist) => void;
  addTimelineEntry: (entry: Omit<TimelineEntry, 'id' | 'timestamp'>) => void;
}

const DEFAULT_PROFILE: Profile = {
  id: '1',
  name: 'Main Curator',
  theme: 'dark',
  accentColor: '#3b82f6',
  playbackMode: 'local',
};

export const useMusicStore = create<MusicState>((set) => ({
  activeProfile: DEFAULT_PROFILE,
  artists: MOCK_ARTISTS,
  albums: MOCK_ALBUMS,
  tracks: [],
  releases: [],
  timeline: MOCK_TIMELINE,
  currentTrackId: null,
  isPlaying: false,

  setPlaybackMode: (mode) => 
    set((state) => ({ activeProfile: { ...state.activeProfile, playbackMode: mode } })),
    
  setCurrentTrack: (trackId) => 
    set({ currentTrackId: trackId, isPlaying: !!trackId }),
    
  togglePlay: () => 
    set((state) => ({ isPlaying: !state.isPlaying })),

  addArtist: (artist) => 
    set((state) => ({ artists: [...state.artists, artist] })),

  addTimelineEntry: (entry) => set((state) => ({
    timeline: [
      { ...entry, id: Math.random().toString(36), timestamp: new Date() },
      ...state.timeline
    ]
  })),
}));