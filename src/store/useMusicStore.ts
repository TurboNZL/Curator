import { create } from 'zustand';
import { Profile, Artist, Album, Track, Release, TimelineEntry } from '../types/music';

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
  artists: [],
  albums: [],
  tracks: [],
  releases: [],
  timeline: [],
  currentTrackId: null,
  isPlaying: false,

  setPlaybackMode: (mode) => 
    set((state) => ({ activeProfile: { ...state.activeProfile, playbackMode: mode } })),
    
  setCurrentTrack: (trackId) => 
    set({ currentTrackId: trackId, isPlaying: !!trackId }),
    
  togglePlay: () => 
    set((state) => ({ isPlaying: !state.isPlaying })),

  addTimelineEntry: (entry) => set((state) => ({
    timeline: [
      { ...entry, id: Math.random().toString(36), timestamp: new Date() },
      ...state.timeline
    ]
  })),
}));