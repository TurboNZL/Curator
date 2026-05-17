import { create } from 'zustand';
import { Profile, Artist, Album, Track, Release, TimelineEntry, Playlist, Note, Group, ReleaseType, PlaybackRule } from '../types/music';

interface MusicState {
  activeProfile: Profile;
  artists: Artist[];
  albums: Album[];
  tracks: Track[];
  releases: Release[];
  playlists: Playlist[];
  notes: Note[];
  groups: (Group & { members?: { entityType: string, entityId: string, label: string }[] })[];
  releaseTypes: ReleaseType[];
  timeline: TimelineEntry[];
  playbackLogs: any[];
  
  // Queue System
  userQueue: string[]; // Manual queue
  activeQueue: string[]; // Tracks from current album/playlist
  currentTrackId: string | null;
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  isShuffled: boolean;
  
  fetchData: () => Promise<void>;
  setCurrentTrack: (trackId: string | null, context?: { type: 'album' | 'playlist' | 'track', id: string, tracks?: string[] }) => void;
  togglePlay: () => void;
  setVolume: (val: number) => void;
  toggleShuffle: () => void;
  
  nextTrack: () => void;
  previousTrack: () => void;
  
  logPlayback: (trackId: string, duration: number, source?: { type: string, id: string }, isSkip?: boolean) => Promise<void>;
  
  addToUserQueue: (trackId: string) => void;
  removeFromUserQueue: (index: number) => void;
  clearUserQueue: () => void;
  reorderUserQueue: (startIndex: number, endIndex: number) => void;
  
  mergeActiveToUserQueue: () => void;
  clearActiveQueue: () => void;
  shuffleActiveQueue: () => void;
  shuffleUserQueue: () => void;
  
  addArtist: (artist: Omit<Artist, 'id' | 'eras'>) => Promise<void>;
  updateArtist: (id: string, data: Partial<Artist>) => Promise<void>;
  deleteArtist: (id: string) => Promise<void>;
  
  addAlbum: (album: Omit<Album, 'id'>) => Promise<void>;
  updateAlbum: (id: string, data: Partial<Album>) => Promise<void>;
  deleteAlbum: (id: string) => Promise<void>;
  
  addTracks: (tracks: Omit<Track, 'id'>[]) => Promise<void>;
  updateTrack: (id: string, data: Partial<Track>) => Promise<void>;
  deleteTrack: (id: string) => Promise<void>;
  incrementMemories: (id: string) => Promise<void>;
  decrementMemories: (id: string) => Promise<void>;
  
  addPlaylist: (playlist: Omit<Playlist, 'id' | 'createdAt'>) => Promise<void>;
  addRelease: (release: Omit<Release, 'id'>) => Promise<void>;
  updateRelease: (id: string, data: Partial<Release>) => Promise<void>;
  addReleaseType: (name: string) => Promise<void>;
  addTimelineEntry:(entry: Omit<TimelineEntry, 'id' | 'timestamp'>) => Promise<void>;
  
  addNote: (note: Omit<Note, 'id' | 'createdAt'>) => Promise<void>;
  updateNote: (id: string, data: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  
  addGroup: (group: Omit<Group, 'id'> & { members?: { entityType: string, entityId: string }[] }) => Promise<void>;
  updateGroup: (id: string, data: Partial<Group>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  addGroupMember: (groupId: string, entityType: string, entityId: string) => Promise<void>;
  removeGroupMember: (groupId: string, entityType: string, entityId: string) => Promise<void>;
  
  vote: (data: { trackAId: string, trackBId: string, winnerId?: string, isEqual?: boolean }) => Promise<void>;
  updateSettings: (settings: Partial<Profile['settings']>) => Promise<void>;
  updatePlaybackRules: (rules: PlaybackRule[]) => Promise<void>;
  
  uploadFile: (file: File, type: 'audio' | 'image') => Promise<string>;
  resetDatabase: () => Promise<void>;
}

const DEFAULT_PROFILE: Profile = {
  id: '1',
  name: 'Main Curator',
  theme: 'dark',
  accentColor: '#3b82f6',
  playbackMode: 'local',
  playbackRules: [],
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
  userQueue: [],
  activeQueue: [],
  currentTrackId: null,
  isPlaying: false,
  isLoading: false,
  volume: 0.8,
  isShuffled: false,

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
        settings: JSON.parse(profiles[0].settings || '{"showUnbalancedFirst": false}'),
        playbackRules: JSON.parse(profiles[0].playbackRules || '[]')
      } : DEFAULT_PROFILE;

      set({
        activeProfile,
        artists: artists.map((a: any) => ({ ...a, groups: JSON.parse(a.groups || '[]'), eras: [] })),
        albums: albums.map((al: any) => ({ 
          ...al, 
          covers: JSON.parse(al.covers || '[]'),
          pendingFiles: JSON.parse(al.pendingFiles || '[]')
        })),
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
        groups: groups.map((g: any) => ({
          ...g,
          isArtistOnly: !!g.isArtistOnly,
          members: g.members || []
        })),
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

  setCurrentTrack: (trackId, context) => {
    const state = get();
    let newActiveQueue = state.activeQueue;

    if (context) {
      if (context.type === 'album' || context.type === 'playlist') {
        // If playing from album/playlist, set active queue to tracks below this one
        const allTracks = context.tracks || [];
        const index = allTracks.indexOf(trackId || '');
        newActiveQueue = index !== -1 ? allTracks.slice(index + 1) : [];
      }
    }

    // Back-to-back rules
    if (trackId) {
      const rule = state.activeProfile.playbackRules.find(r => r.trackAId === trackId);
      if (rule) {
        // Add followup to user queue if not already there
        if (!state.userQueue.includes(rule.trackBId)) {
          set(s => ({ userQueue: [rule.trackBId, ...s.userQueue] }));
        }
      }
    }

    set({
      currentTrackId: trackId,
      isPlaying: !!trackId,
      activeQueue: newActiveQueue
    });
  },
    
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setVolume: (val) => set({ volume: val }),
  toggleShuffle: () => set((state) => ({ isShuffled: !state.isShuffled })),

  nextTrack: () => {
    const state = get();
    const { activeQueue, userQueue, currentTrackId, activeProfile } = state;
    
    // Log partial playback if skipping
    // Note: We don't have easy access to current time here,
    // but we can assume if nextTrack is called manually, it's a skip.
    // However, nextTrack is also called on end.
    // Let's handle logging in the component instead.

    // Check playback rules for current track
    const rule = activeProfile.playbackRules.find(r => r.trackAId === currentTrackId);
    if (rule) {
      // If there's a rule, trackB is next
      set({ currentTrackId: rule.trackBId, isPlaying: true });
      return;
    }

    if (activeQueue.length > 0) {
      const nextId = activeQueue[0];
      set({ 
        currentTrackId: nextId, 
        activeQueue: activeQueue.slice(1),
        isPlaying: true 
      });
    } else if (userQueue.length > 0) {
      const nextId = userQueue[0];
      set({ 
        currentTrackId: nextId, 
        userQueue: userQueue.slice(1),
        isPlaying: true 
      });
    } else {
      set({ currentTrackId: null, isPlaying: false });
    }
  },

  previousTrack: () => {
    // Simple implementation: just restart current track or do nothing for now
    // Real implementation would need a history stack
  },

  logPlayback: async (trackId, duration, source, isSkip) => {
    await fetch('/api/playback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId, duration, sourceType: source?.type, sourceId: source?.id, isSkip })
    });
  },

  addToUserQueue: (trackId) => set(state => ({ userQueue: [...state.userQueue, trackId] })),
  removeFromUserQueue: (index) => set(state => ({ userQueue: state.userQueue.filter((_, i) => i !== index) })),
  clearUserQueue: () => set({ userQueue: [] }),
  reorderUserQueue: (start, end) => {
    const newQueue = [...get().userQueue];
    const [removed] = newQueue.splice(start, 1);
    newQueue.splice(end, 0, removed);
    set({ userQueue: newQueue });
  },

  mergeActiveToUserQueue: () => set(state => ({ 
    userQueue: [...state.userQueue, ...state.activeQueue],
    activeQueue: []
  })),
  clearActiveQueue: () => set({ activeQueue: [] }),
  shuffleActiveQueue: () => {
    const state = get();
    const shuffled = [...state.activeQueue].sort(() => Math.random() - 0.5);
    
    // Apply shuffle rules
    const rules = state.activeProfile.playbackRules.filter(r => r.playFirstOnShuffle);
    for (const rule of rules) {
      const indexB = shuffled.indexOf(rule.trackBId);
      if (indexB !== -1) {
        // Remove B
        shuffled.splice(indexB, 1);
        // Find A or insert A at indexB
        const indexA = shuffled.indexOf(rule.trackAId);
        if (indexA !== -1) {
          // Move B after A
          shuffled.splice(indexA + 1, 0, rule.trackBId);
        } else {
          // Replace B with A and add B after
          shuffled.splice(indexB, 0, rule.trackAId, rule.trackBId);
        }
      }
    }

    set({ activeQueue: shuffled, isShuffled: true });
  },

  shuffleUserQueue: () => {
    const state = get();
    const shuffled = [...state.userQueue].sort(() => Math.random() - 0.5);
    
    // Apply shuffle rules
    const rules = state.activeProfile.playbackRules.filter(r => r.playFirstOnShuffle);
    for (const rule of rules) {
      const indexB = shuffled.indexOf(rule.trackBId);
      if (indexB !== -1) {
        shuffled.splice(indexB, 1);
        const indexA = shuffled.indexOf(rule.trackAId);
        if (indexA !== -1) {
          shuffled.splice(indexA + 1, 0, rule.trackBId);
        } else {
          shuffled.splice(indexB, 0, rule.trackAId, rule.trackBId);
        }
      }
    }

    set({ userQueue: shuffled, isShuffled: true });
  },

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

  deleteArtist: async (id) => {
    try {
      const res = await fetch(`/api/artists/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete artist');
      await get().fetchData();
      toast.success("Artist deleted from database");
    } catch (err) {
      toast.error("Failed to delete artist");
    }
  },

  addAlbum: async (albumData) => {
    const res = await fetch('/api/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(albumData)
    });
    const newAlbum = await res.json();
    set(state => ({ albums: [...state.albums, { ...newAlbum, covers: JSON.parse(newAlbum.covers), pendingFiles: [] }] }));
  },

  updateAlbum: async (id, data) => {
    await fetch(`/api/albums/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    await get().fetchData();
  },

  deleteAlbum: async (id) => {
    try {
      const res = await fetch(`/api/albums/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete album');
      await get().fetchData();
      toast.success("Album deleted from database");
    } catch (err) {
      toast.error("Failed to delete album");
    }
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

  deleteTrack: async (id) => {
    try {
      const res = await fetch(`/api/tracks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete track');
      await get().fetchData();
      toast.success("Track deleted from database");
    } catch (err) {
      toast.error("Failed to delete track");
    }
  },

  incrementMemories: async (id) => {
    const track = get().tracks.find(t => t.id === id);
    if (track) {
      await get().updateTrack(id, { memories: (track.memories || 0) + 1 });
    }
  },

  decrementMemories: async (id) => {
    const track = get().tracks.find(t => t.id === id);
    if (track && (track.memories || 0) > 0) {
      await get().updateTrack(id, { memories: track.memories - 1 });
    }
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
    
    const state = get();
    const album = state.albums.find(a => a.id === releaseData.albumId);
    if (album && album.covers.length === 0 && releaseData.coverImage) {
      await get().updateAlbum(album.id, { covers: [releaseData.coverImage] });
    }

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

  addGroup: async (groupData) => {
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(groupData)
    });
    await get().fetchData();
  },

  updateGroup: async (id, data) => {
    await fetch(`/api/groups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    await get().fetchData();
  },

  deleteGroup: async (id) => {
    try {
      const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete bio');
      await get().fetchData();
      toast.success("Relational bio deleted");
    } catch (err) {
      toast.error("Failed to delete bio");
    }
  },

  addGroupMember: async (groupId, entityType, entityId) => {
    console.log('Store: addGroupMember', { groupId, entityType, entityId });
    await fetch(`/api/groups/${groupId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, entityId })
    });
    await get().fetchData();
  },

  removeGroupMember: async (groupId, entityType, entityId) => {
    await fetch(`/api/groups/${groupId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, entityId })
    });
    await get().fetchData();
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

  updatePlaybackRules: async (rules) => {
    const profile = get().activeProfile;
    await fetch(`/api/profiles/${profile.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playbackRules: JSON.stringify(rules) })
    });
    set(state => ({ activeProfile: { ...state.activeProfile, playbackRules: rules } }));
  },

  resetDatabase: async () => {
    await fetch('/api/reset', { method: 'POST' });
    set({ artists: [], albums: [], tracks: [], releases: [], playlists: [], timeline: [], notes: [], groups: [] });
  }
}));
