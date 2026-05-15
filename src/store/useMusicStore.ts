import { create } from 'zustand';
import { Profile, Artist, Album, Track, Release, TimelineEntry, Playlist, Note, Group, ReleaseType } from '../types/music';

interface MusicState {

  activeProfile: Profile;
  artists: Artist[];
  albums: Album[];
  tracks: Track[];
  releases: Release[];
  playlists: Playlist[];
  notes: Note[];
  groups: Group[];
  releaseTypes: ReleaseType[];
  timeline: TimelineEntry[];

  playbackLogs: any[];
  queue: string[];
  currentTrackId: string | null;
  isPlaying: boolean;
  isLoading: boolean;
  
  fetchData: () => Promise<void>;
  setCurrentTrack: (trackId: string | null) => void;
  togglePlay: () => void;
  logPlayback: (trackId: string, duration: number, source?: { type: string, id: string }, isSkip?: boolean) => Promise<void>;
  
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
  updateRelease: (id: string, data: Partial<Release>) => Promise<void>;
  addReleaseType: (name: string) => Promise<void>;
  addTimelineEntry:(entry: Omit<TimelineEntry, 'id' | 'timestamp'>) => Promise<void>;

  addNote: (note: Omit<Note, 'id' | 'createdAt'>) => Promise<void>;
  updateNote: (id: string, data: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  
  vote: (data: { trackAId: string, trackBId: string, winnerId?: string, isEqual?: boolean }) => Promise<void>;
  updateSettings: (settings: Partial<Profile['settings']>) => Promise<void>;
  updatePlaybackMode: (mode: Profile['playbackMode']) => Promise<void>;
  
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
  notes: [],
  groups: [],
  releaseTypes: [],
  timeline: [],
  playbackLogs: [],

  queue: [],
  currentTrackId: null,
  isPlaying: false,
  isLoading: false,

  fetchData: async () => {
    set({ isLoading: true });
    try {
      const [artists, albums, tracks, timeline, releases, playlists, logs, profiles, notes, groups, releaseTypes] = await Promise.all([
        fetch('/api/artists').then(res => res.json()),
        fetch('/api/albums').then(res => res.json()),
        fetch('/api/tracks').then(res => res.json()),
        fetch('/api/timeline').then(res => res.json()),
        fetch('/api/releases').then(res => res.json()).catch(() => []),
        fetch('/api/playlists').then(res => res.json()).catch(() => []),
        fetch('/api/playback-stats').then(res => res.json()).catch(() => []),
        fetch('/api/profiles').then(res => res.json()).catch(() => []),
        fetch('/api/notes').then(res => res.json()).catch(() => []),
        fetch('/api/groups').then(res => res.json()).catch(() => []),
        fetch('/api/release-types').then(res => res.json()).catch(() => []),
      ]);
      
      const activeProfile = profiles[0] ? {
        ...profiles[0],
        settings: JSON.parse(profiles[0].settings || '{"showUnbalancedFirst": false}')
      } : DEFAULT_PROFILE;

      set({
        activeProfile,
        artists: artists.map((a: any) => ({ ...a, groups: JSON.parse(a.groups || '[]'), eras: [] })),
        albums: albums.map((al: any) => ({ ...al, covers: JSON.parse(al.covers || '[]') })),
        tracks: tracks.map((t: any) => ({
          ...t,
          genres: typeof t.genres === 'string' ? JSON.parse(t.genres || '[]') : (t.genres || []),
          producers: typeof t.producers === 'string' ? JSON.parse(t.producers || '[]') : (t.producers || []),
          writers: typeof t.writers === 'string' ? JSON.parse(t.writers || '[]') : (t.writers || []),
          credits: typeof t.credits === 'string' ? JSON.parse(t.credits || '[]') : (t.credits || []),
          queueRules: typeof t.queueRules === 'string' ? JSON.parse(t.queueRules || '{}') : (t.queueRules || {}),
          isFavorite: !!t.isFavorite
        })),
        releases,
        playlists,
        notes: notes.map((n: any) => ({ ...n, createdAt: new Date(n.createdAt) })),
        groups,
        releaseTypes,
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

  logPlayback: async (trackId, duration, source, isSkip) => {
    await fetch('/api/playback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId, duration, sourceType: source?.type, sourceId: source?.id, isSkip })
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

  updateRelease: async (id, data) => {
    await fetch(`/api/releases/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    await get().fetchData();
  },

  addReleaseType: async (name) => {
    await fetch('/api/release-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    await get().fetchData();
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

  addNote: async (noteData) => {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteData)
    });
    const newNote = await res.json();
    set(state => ({ notes: [...state.notes, { ...newNote, createdAt: new Date(newNote.createdAt) }] }));
  },

  updateNote: async (id, data) => {
    await fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    await get().fetchData();
  },

  deleteNote: async (id) => {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    set(state => ({ notes: state.notes.filter(n => n.id !== id) }));
  },

  vote: async (voteData) => {
    await fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(voteData)
    });
    await get().fetchData();
  },

  updateSettings: async (newSettings) => {
    const profile = get().activeProfile;
    const updatedSettings = { ...profile.settings, ...newSettings };
    
    await fetch(`/api/profiles/${profile.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: JSON.stringify(updatedSettings) })
    });
    
    set(state => ({
      activeProfile: {
        ...state.activeProfile,
        settings: updatedSettings
      }
    }));
  },

  updatePlaybackMode: async (mode) => {
    const profile = get().activeProfile;
    await fetch(`/api/profiles/${profile.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playbackMode: mode })
    });
    set(state => ({ activeProfile: { ...state.activeProfile, playbackMode: mode } }));
  },

  resetDatabase: async () => {
    await fetch('/api/reset', { method: 'POST' });
    set({ artists: [], albums: [], tracks: [], releases: [], playlists: [], timeline: [], notes: [], groups: [] });
  }
}));
