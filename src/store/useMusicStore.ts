import { create } from 'zustand';
import { Profile, Artist, Album, Track, Release, TimelineEntry, Playlist } from '../types/music';

interface MusicState {
  activeProfile: Profile;
  artists: Artist[];
  albums: Album[];
  tracks: Track[];
  releases: Release[];
  playlists: Playlist[];
  timeline: TimelineEntry[];
  queue: string[];
  currentTrackId: string | null;
  isPlaying: boolean;
  isLoading: boolean;
  
  // Actions
  fetchData: () => Promise<void>;
  setPlaybackMode: (mode: Profile['playbackMode']) => void;
  setCurrentTrack: (trackId: string | null) => void;
  togglePlay: () => void;
  addToQueue: (trackId: string) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  
  addArtist: (artist: Omit<Artist, 'id' | 'eras'>) => Promise<void>;
  addAlbum: (album: Omit<Album, 'id'>) => Promise<void>;
  addTracks: (tracks: Omit<Track, 'id'>[]) => Promise<void>;
  addTimelineEntry: (entry: Omit<TimelineEntry, 'id' | 'timestamp'>) => Promise<void>;
  
  uploadFile: (file: File, type: 'audio' | 'image') => Promise<string>;
}

const DEFAULT_PROFILE: Profile = {
  id: '1',
  name: 'Main Curator',
  theme: 'dark',
  accentColor: '#3b82f6',
  playbackMode: 'local',
};

export const useMusicStore = create<MusicState>((set, get) => ({
  activeProfile: DEFAULT_PROFILE,
  artists: [],
  albums: [],
  tracks: [],
  releases: [],
  playlists: [],
  timeline: [],
  queue: [],
  currentTrackId: null,
  isPlaying: false,
  isLoading: false,

  fetchData: async () => {
    set({ isLoading: true });
    try {
      const [artists, albums, tracks, timeline] = await Promise.all([
        fetch('/api/artists').then(res => res.json()),
        fetch('/api/albums').then(res => res.json()),
        fetch('/api/tracks').then(res => res.json()),
        fetch('/api/timeline').then(res => res.json()),
      ]);
      
      set({ 
        artists: artists.map((a: any) => ({ ...a, groups: JSON.parse(a.groups || '[]'), eras: [] })), 
        albums: albums.map((al: any) => ({ ...al, covers: JSON.parse(al.covers || '[]') })), 
        tracks, 
        timeline: timeline.map((t: any) => ({ ...t, timestamp: new Date(t.timestamp) })),
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
      set({ isLoading: false });
    }
  },

  setPlaybackMode: (mode) => 
    set((state) => ({ activeProfile: { ...state.activeProfile, playbackMode: mode } })),
    
  setCurrentTrack: (trackId) => 
    set({ currentTrackId: trackId, isPlaying: !!trackId }),
    
  togglePlay: () => 
    set((state) => ({ isPlaying: !state.isPlaying })),

  addToQueue: (trackId) =>
    set((state) => ({ queue: [...state.queue, trackId] })),

  removeFromQueue: (trackId) =>
    set((state) => ({ queue: state.queue.filter(id => id !== trackId) })),

  clearQueue: () => set({ queue: [] }),

  uploadFile: async (file: File, type: 'audio' | 'image') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return data.url;
  },

  addArtist: async (artistData) => {
    const res = await fetch('/api/artists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(artistData)
    });
    const newArtist = await res.json();
    set(state => ({ artists: [...state.artists, { ...newArtist, eras: [], groups: JSON.parse(newArtist.groups) }] }));
    
    await get().addTimelineEntry({
      type: 'entry',
      title: `Added Artist: ${newArtist.name}`,
      description: 'New root entity created in catalog.'
    });
  },

  addAlbum: async (albumData) => {
    const res = await fetch('/api/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(albumData)
    });
    const newAlbum = await res.json();
    set(state => ({ albums: [...state.albums, { ...newAlbum, covers: JSON.parse(newAlbum.covers) }] }));
    
    await get().addTimelineEntry({
      type: 'entry',
      title: `Added Album: ${newAlbum.title}`,
      description: 'New project indexed.'
    });
  },

  addTracks: async (tracksData) => {
    for (const trackData of tracksData) {
      const res = await fetch('/api/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackData)
      });
      const newTrack = await res.json();
      set(state => ({ tracks: [...state.tracks, newTrack] }));
    }
  },

  addTimelineEntry: async (entry) => {
    const res = await fetch('/api/timeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    const newEntry = await res.json();
    set(state => ({ 
      timeline: [{ ...newEntry, timestamp: new Date(newEntry.timestamp) }, ...state.timeline] 
    }));
  },

  resetDatabase: () => {
    // This would need a DELETE route on the backend
    console.warn('Reset database not implemented on backend yet');
  }
}));
