import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
  
  // Actions
  setPlaybackMode: (mode: Profile['playbackMode']) => void;
  setCurrentTrack: (trackId: string | null) => void;
  togglePlay: () => void;
  addToQueue: (trackId: string) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  addArtist: (artist: Artist) => void;
  addAlbum: (album: Album) => void;
  addRelease: (release: Release) => void;
  addTracks: (tracks: Track[]) => void;
  addPlaylist: (playlist: Playlist) => void;
  addTrackToPlaylist: (playlistId: string, trackId: string) => void;
  addTimelineEntry: (entry: Omit<TimelineEntry, 'id' | 'timestamp'>) => void;
  resetDatabase: () => void;
}

const DEFAULT_PROFILE: Profile = {
  id: '1',
  name: 'Main Curator',
  theme: 'dark',
  accentColor: '#3b82f6',
  playbackMode: 'local',
};

export const useMusicStore = create<MusicState>()(
  persist(
    (set) => ({
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

      addArtist: (artist) => 
        set((state) => ({ 
          artists: [...state.artists, artist],
          timeline: [
            { 
              id: Math.random().toString(36), 
              type: 'entry', 
              timestamp: new Date(), 
              title: `Added Artist: ${artist.name}`, 
              description: 'New root entity created in catalog.' 
            },
            ...state.timeline
          ]
        })),

      addAlbum: (album) =>
        set((state) => ({ 
          albums: [...state.albums, album],
          timeline: [
            { 
              id: Math.random().toString(36), 
              type: 'entry', 
              timestamp: new Date(), 
              title: `Added Album: ${album.title}`, 
              description: 'New project indexed.' 
            },
            ...state.timeline
          ]
        })),

      addRelease: (release) =>
        set((state) => ({ releases: [...state.releases, release] })),

      addTracks: (newTracks) =>
        set((state) => ({ tracks: [...state.tracks, ...newTracks] })),

      addPlaylist: (playlist) =>
        set((state) => ({ 
          playlists: [...state.playlists, playlist],
          timeline: [
            { 
              id: Math.random().toString(36), 
              type: 'entry', 
              timestamp: new Date(), 
              title: `Created Playlist: ${playlist.name}`, 
              description: 'New collection initialized.' 
            },
            ...state.timeline
          ]
        })),

      addTrackToPlaylist: (playlistId, trackId) =>
        set((state) => ({
          playlists: state.playlists.map(p => 
            p.id === playlistId ? { ...p, trackIds: [...new Set([...p.trackIds, trackId])] } : p
          )
        })),

      addTimelineEntry: (entry) => set((state) => ({
        timeline: [
          { ...entry, id: Math.random().toString(36), timestamp: new Date() },
          ...state.timeline
        ]
      })),

      resetDatabase: () => set({
        artists: [],
        albums: [],
        tracks: [],
        releases: [],
        playlists: [],
        timeline: [],
        queue: [],
        currentTrackId: null,
        isPlaying: false
      })
    }),
    {
      name: 'curator-local-db',
      storage: createJSONStorage(() => localStorage),
    }
  )
);