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
  playbackLogs: any[];
  queue: string[];
  currentTrackId: string | null;
  isPlaying: boolean;
  isLoading: boolean;
  
  fetchData: () => Promise<void>;
  setCurrentTrack: (trackId: string | null) => void;
  togglePlay: () => void;
  logPlayback: (trackId: string, duration: number) => Promise<void>;
  
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  
  addArtist: (artist: Omit<Artist, 'id' | 'eras'>) => Promise<void>;
  updateArtist: (id: string, data: Partial<Artist>) => Promise<void>;
  
  addAlbum: (album: Omit<Album, 'id'>) => Promise<void>;
  updateAlbum: (id: string, data: Partial<Album>) => Promise<void>;
  
  addTracks: (tracks: Omit<Track, 'id'>[]) => Promise<void>;
  updateTrack: (id: string, data: Partial<Track>) => Promise<void>;
  
  addPlaylist: (playlist: Omit<Playlist, 'id' | 'createdAt'>) => Promise<void>;
  addRelease: (release: Omit<Release, 'id'>) => Promise<void>;
  addTimelineEntry:(entry: Omit<TimelineEntry, 'id' | 'timestamp'>) => Promise<void>;
  
  uploadFile: (file: File, type: 'audio' | 'image') => Promise<string>;
  resetDatabase: () => Promise<void>;
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
  playbackLogs: [],
  queue: [],
  currentTrackId: null,
  isPlaying: false,
  isLoading: false,

  fetchData: async () => {
    set({ isLoading: true });
    try {
      const [artists, albums, tracks, timeline, releases, playlists, logs] = await Promise.all([
        fetch('/api/artists').then(res => res.json()),
        fetch('/api/albums').then(res => res.json()),
        fetch('/api/tracks').then(res => res.json()),
        fetch('/api/timeline').then(res => res.json()),
        fetch('/api/releases').then(res => res.json()).catch(() => []),
        fetch('/api/playlists').then(res => res.json()).catch(() => []),
        fetch('/api/playback-stats').then(res => res.json()).catch(() => []),
      ]);
      
      set({ 
        artists: artists.map((a: any) => ({ ...a, groups: JSON.parse(a.groups || '[]'), eras: [] })), 
        albums: albums.map((al: any) => ({ ...al, covers: JSON.parse(al.covers || '[]') })), 
        tracks, 
        releases,
        playlists,
        timeline: timeline.map((t: any) => ({ ...t, timestamp: new Date(t.timestamp) })),
        playbackLogs: logs,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
      set({ isLoading: false });
    }
  },

  setCurrentTrack: (trackId) => 
    set({ currentTrackId: trackId, isPlaying: !!trackId }),
    
  togglePlay: () => 
    set((state) => ({ isPlaying: !state.isPlaying })),

  logPlayback: async (trackId, duration) => {
    await fetch('/api/playback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId, duration })
    });
  },

  removeFromQueue: (trackId) =>
    set((state) => ({ queue: state.queue.filter(id => id !== trackId) })),

  clearQueue: () => set({ queue: [] }),

  uploadFile: async (file: File, type: 'audio' | 'image') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
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
  },

  updateArtist: async (id, data) => {
    await fetch(`/api/artists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    await get().fetchData();
  },

  addAlbum: async (albumData) => {
    const res = await fetch('/api/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(albumData)
    });
    const newAlbum = await res.json();
    set(state => ({ albums: [...state.albums, { ...newAlbum, covers: JSON.parse(newAlbum.covers) }] }));
  },

  updateAlbum: async (id, data) => {
    await fetch(`/api/albums/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    await get().fetchData();
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

  updateTrack: async (id, data) => {
    await fetch(`/api/tracks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    await get().fetchData();
  },

  addPlaylist: async (playlistData) => {
    const res = await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playlistData)
    });
    const newPlaylist = await res.json();
    set(state => ({ playlists: [...state.playlists, newPlaylist] }));
  },

  addRelease: async (releaseData) => {
    const res = await fetch('/api/releases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(releaseData)
    });
    const newRelease = await res.json();
    set(state => ({ releases: [...state.releases, newRelease] }));
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

  resetDatabase: async () => {
    await fetch('/api/reset', { method: 'POST' });
    set({ artists: [], albums: [], tracks: [], releases: [], playlists: [], timeline: [] });
  }
}));