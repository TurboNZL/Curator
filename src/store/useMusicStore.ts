import { create } from 'zustand';
import { Profile, Artist, Album, Track, Release, TimelineEntry, Playlist, Group, ReleaseType, PlaybackRule } from '../types/music';
import { toast } from 'sonner';

interface MusicState {
  activeProfile: Profile;
  artists: Artist[];
  albums: Album[];
  tracks: Track[];
  releases: Release[];
  playlists: Playlist[];
  groups: (Group & { members?: { entityType: string, entityId: string, label: string, showOnEntityPage?: boolean }[] })[];
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
  currentProgress: number;
  currentDuration: number;
  
  fetchData: () => Promise<void>;
  setCurrentTrack: (trackId: string | null, context?: { type: 'album' | 'playlist' | 'track', id: string, tracks?: string[] }) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
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
  
  addArtist: (artist: Omit<Artist, 'id' | 'eras' | 'groups'>) => Promise<Artist>; 
  updateArtist: (id: string, data: Partial<Artist>) => Promise<void>;
  deleteArtist: (id: string) => Promise<void>;
  
  addAlbum: (album: Omit<Album, 'id'>) => Promise<Album>; 
  updateAlbum: (id: string, data: Partial<Album>) => Promise<void>;
  deleteAlbum: (id: string) => Promise<void>;
  
  addTracks: (tracks: Omit<Track, 'id'>[]) => Promise<Track[]>; 
  updateTrack: (id: string, data: Partial<Track>) => Promise<void>;
  deleteTrack: (id: string) => Promise<void>;
  incrementMemories: (id: string) => Promise<void>;
  // Removed decrementMemories as it wasn't requested and can be handled via updateTrack if needed
  
  addPlaylist: (playlist: Omit<Playlist, 'id' | 'createdAt'>) => Promise<Playlist>; 
  updatePlaylist: (id: string, data: Partial<Playlist>) => Promise<void>;
  addRelease: (release: Omit<Release, 'id'>) => Promise<Release>; 
  updateRelease: (id: string, data: Partial<Release>) => Promise<void>;
  addReleaseType: (name: string) => Promise<void>;
  addTimelineEntry:(entry: Omit<TimelineEntry, 'id' | 'timestamp'>) => Promise<void>;
  
  addGroup: (group: Omit<Group, 'id' | 'members'> & { members?: { entityType: string, entityId: string, showOnEntityPage?: boolean }[] }) => Promise<Group>; 
  updateGroup: (id: string, data: Partial<Group>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  addGroupMember: (groupId: string, entityType: string, entityId: string, showOnEntityPage?: boolean) => Promise<void>;
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
  currentProgress: 0,
  currentDuration: 0,

  fetchData: async () => {
    set({ isLoading: true });
    try {
      const [artists, albums, tracks, timeline, releases, playlists, logs, profiles, groups, releaseTypes] = await Promise.all([
        fetch('/api/artists').then(res => res.json()),
        fetch('/api/albums').then(res => res.json()),
        fetch('/api/tracks').then(res => res.json()),
        fetch('/api/timeline').then(res => res.json()),
        fetch('/api/releases').then(res => res.json()).catch(() => []),
        fetch('/api/playlists').then(res => res.json()).catch(() => []),
        fetch('/api/playback-stats').then(res => res.json()).catch(() => []),
        fetch('/api/profiles').then(res => res.json()).catch(() => []),
        fetch('/api/groups').then(res => res.json()).catch(() => []),
        fetch('/api/release-types').then(res => res.json()).catch(() => []),
      ]);
      
      const activeProfile = profiles[0] ? {
        ...profiles[0],
        settings: JSON.parse(profiles[0].settings || '{"showUnbalancedFirst": false, "applyRulesFromAlbum": true}'),
        playbackRules: JSON.parse(profiles[0].playbackRules || '[]')
      } : DEFAULT_PROFILE;

      set({
        activeProfile,
        artists: artists.map((a: any) => ({ ...a, groups: JSON.parse(a.groups || '[]'), eras: [] })),
        albums: albums.map((al: any) => ({
          ...al,
          covers: JSON.parse(al.covers || '[]'),
          pendingFiles: JSON.parse(al.pendingFiles || '[]'),
          artistIds: JSON.parse(al.artistIds || '[]')
        })),
        tracks: tracks.map((t: any) => ({
          ...t,
          genres: typeof t.genres === 'string' ? JSON.parse(t.genres || '[]') : (t.genres || []),
          producers: typeof t.producers === 'string' ? JSON.parse(t.producers || '[]') : (t.producers || []),
          writers: typeof t.writers === 'string' ? JSON.parse(t.writers || '[]') : (t.writers || []),
          credits: typeof t.credits === 'string' ? JSON.parse(t.credits || '[]') : (t.credits || []),
          queueRules: typeof t.queueRules === 'string' ? JSON.parse(t.queueRules || '{}') : (t.queueRules || {}),
          artistIds: typeof t.artistIds === 'string' ? JSON.parse(t.artistIds || '[]') : (t.artistIds || []),
          isFavorite: !!t.isFavorite
        })),
        releases,
        playlists,
        groups: groups.map((g: any) => ({
          ...g,
          isArtistOnly: !!g.isArtistOnly,
          members: g.members ? g.members.map((m: any) => ({ ...m, showOnEntityPage: !!m.showOnEntityPage })) : []
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
        const allTracks = context.tracks || [];
        const index = allTracks.indexOf(trackId || '');
        newActiveQueue = index !== -1 ? allTracks.slice(index + 1) : [];
      }
    }

    if (trackId) {
      const rule = state.activeProfile.playbackRules.find(r => r.trackAId === trackId);
      if (rule) {
        // Apply rule only if not from album or if applyRulesFromAlbum is true
        const shouldApply = !context || context.type !== 'album' || state.activeProfile.settings?.applyRulesFromAlbum;

        if (shouldApply) {
          const isNextInUserQueue = state.userQueue.length > 0 && state.userQueue[0] === rule.trackBId;
          const isNextInActiveQueue = newActiveQueue.length > 0 && newActiveQueue[0] === rule.trackBId;
          
          if (!isNextInUserQueue && !isNextInActiveQueue) {
            set(s => ({ userQueue: [rule.trackBId, ...s.userQueue] }));
          }
        }
      }
    }

    set({
      currentTrackId: trackId,
      isPlaying: !!trackId,
      activeQueue: newActiveQueue,
      currentProgress: 0,
      currentDuration: 0
    });
  },

  setProgress: (progress) => set({ currentProgress: progress }),
  setDuration: (duration) => set({ currentDuration: duration }),
    
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setVolume: (val) => set({ volume: val }),
  toggleShuffle: () => set((state) => ({ isShuffled: !state.isShuffled })),

  nextTrack: () => {
    const state = get();
    const { activeQueue, userQueue, currentTrackId, activeProfile } = state;
    
    // Check for a rule that applies to the current track
    const rule = activeProfile.playbackRules.find(r => r.trackAId === currentTrackId);
    if (rule) {
      // Apply rule only if not from album or if applyRulesFromAlbum is true
      // This part is a bit tricky to determine 'source' dynamically here in nextTrack,
      // as currentTrackId doesn't carry its source context. For a robust solution,
      // context would need to be persisted with currentTrackId.
      // For now, if we assume nextTrack is called generally, we'll apply the rule
      // unless we explicitly track the current playback context.
      
      const nextIdFromRule = rule.trackBId;
      const isNextInUserQueue = state.userQueue.length > 0 && state.userQueue[0] === nextIdFromRule;
      const isNextInActiveQueue = activeQueue.length > 0 && activeQueue[0] === nextIdFromRule;

      if (!isNextInUserQueue && !isNextInActiveQueue) {
        set({ currentTrackId: nextIdFromRule, isPlaying: true });
        // Also remove from actual queue if it was in there
        set(s => ({
          userQueue: s.userQueue.filter(id => id !== nextIdFromRule),
          activeQueue: s.activeQueue.filter(id => id !== nextIdFromRule)
        }));
        return;
      }
    }

    if (userQueue.length > 0) { // Prioritize manual queue
      const nextId = userQueue[0];
      set({ 
        currentTrackId: nextId, 
        userQueue: userQueue.slice(1),
        isPlaying: true 
      });
    } else if (activeQueue.length > 0) { // Then active queue
      const nextId = activeQueue[0];
      set({ 
        currentTrackId: nextId, 
        activeQueue: activeQueue.slice(1),
        isPlaying: true 
      });
    } else {
      set({ currentTrackId: null, isPlaying: false });
    }
  },

  previousTrack: () => {},

  logPlayback: async (trackId, duration, source, isSkip) => {
    // Memories increment removed from here
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
    
    const rules = state.activeProfile.playbackRules.filter(r => r.playFirstOnShuffle);
    for (const rule of rules) {
      const indexB = shuffled.indexOf(rule.trackBId);
      if (indexB !== -1) {
        shuffled.splice(indexB, 1);
        const indexA = shuffled.indexOf(rule.trackAId);
        if (indexA !== -1) {
          shuffled.splice(indexA + 1, 0, rule.trackBId);
        } else {
          // If trackA is not in shuffled, place A and B at the start
          shuffled.unshift(rule.trackBId);
          shuffled.unshift(rule.trackAId);
        }
      }
    }

    set({ activeQueue: shuffled, isShuffled: true });
  },

  shuffleUserQueue: () => {
    const state = get();
    const shuffled = [...state.userQueue].sort(() => Math.random() - 0.5);
    
    const rules = state.activeProfile.playbackRules.filter(r => r.playFirstOnShuffle);
    for (const rule of rules) {
      const indexB = shuffled.indexOf(rule.trackBId);
      if (indexB !== -1) {
        shuffled.splice(indexB, 1);
        const indexA = shuffled.indexOf(rule.trackAId);
        if (indexA !== -1) {
          shuffled.splice(indexA + 1, 0, rule.trackBId);
        } else {
          // If trackA is not in shuffled, place A and B at the start
          shuffled.unshift(rule.trackBId);
          shuffled.unshift(rule.trackAId);
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
    const parsedNewArtist = { ...newArtist, eras: [], groups: JSON.parse(newArtist.groups || '[]') };
    set(state => ({ artists: [...state.artists, parsedNewArtist] }));
    return parsedNewArtist;
  },

  updateArtist: async (id, data) => {
    await fetch(`/api/artists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    // Optimistic update, then full fetch to sync complex relations
    set(state => ({
      artists: state.artists.map(a => a.id === id ? { ...a, ...data } : a)
    }));
    await get().fetchData(); 
  },

  deleteArtist: async (id) => {
    try {
      const res = await fetch(`/api/artists/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete artist');
      set(state => ({ artists: state.artists.filter(a => a.id !== id) }));
      await get().fetchData(); // Refetch to clean up all related entities
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
    const parsedNewAlbum = { 
      ...newAlbum, 
      covers: JSON.parse(newAlbum.covers || '[]'), 
      pendingFiles: JSON.parse(newAlbum.pendingFiles || '[]'), 
      artistIds: JSON.parse(newAlbum.artistIds || '[]') 
    };
    set(state => ({ albums: [...state.albums, parsedNewAlbum] }));
    return parsedNewAlbum;
  },

  updateAlbum: async (id, data) => {
    const res = await fetch(`/api/albums/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update album');
    set(state => ({
      albums: state.albums.map(a => a.id === id ? { 
        ...a, 
        ...data,
        covers: data.covers !== undefined ? data.covers : a.covers, // Ensure covers are preserved if not updated
        pendingFiles: data.pendingFiles !== undefined ? data.pendingFiles : a.pendingFiles,
        artistIds: data.artistIds !== undefined ? data.artistIds : a.artistIds,
      } : a)
    }));
    await get().fetchData();
  },

  deleteAlbum: async (id) => {
    try {
      const res = await fetch(`/api/albums/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete album');
      set(state => ({ albums: state.albums.filter(a => a.id !== id) }));
      await get().fetchData(); 
      toast.success("Album deleted from database");
    } catch (err) {
      toast.error("Failed to delete album");
    }
  },

  addTracks: async (tracksData) => {
    const createdTracks: Track[] = [];
    for (const trackData of tracksData) {
      const res = await fetch('/api/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackData)
      });
      const newTrack = await res.json();
      set(state => ({ tracks: [...state.tracks, newTrack] }));
      createdTracks.push(newTrack);
    }
    return createdTracks;
  },

  updateTrack: async (id, data) => {
    await fetch(`/api/tracks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    // Optimistic update for immediate feedback
    set(state => ({
      tracks: state.tracks.map(t => t.id === id ? { ...t, ...data } : t)
    }));
    await get().fetchData(); // Full refetch to ensure all relations (e.g. playcounts) are updated
  },

  deleteTrack: async (id) => {
    try {
      const res = await fetch(`/api/tracks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete track');
      set(state => ({ tracks: state.tracks.filter(t => t.id !== id) }));
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
      set(state => ({ // Optimistic update
        tracks: state.tracks.map(t => t.id === id ? { ...t, memories: (t.memories || 0) + 1 } : t)
      }));
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
    return newPlaylist;
  },

  updatePlaylist: async (id, data) => {
    await fetch(`/api/playlists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    await get().fetchData();
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
    if (album && releaseData.coverImage) {
      // Ensure existing covers are merged
      const updatedCovers = Array.from(new Set([...album.covers, releaseData.coverImage]));
      if (updatedCovers.length !== album.covers.length) { // Only update if there's a change
        await get().updateAlbum(album.id, { covers: updatedCovers });
      }
    }

    set(state => ({ releases: [...state.releases, newRelease] }));
    return newRelease;
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

  addGroup: async (groupData) => {
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(groupData)
    });
    const newGroup = await res.json();
    // Update local state optimistically
    const parsedNewGroup = {
      ...newGroup,
      isArtistOnly: !!newGroup.isArtistOnly,
      members: groupData.members ? groupData.members.map(m => ({...m, label: m.label || ''})) : []
    };
    set(state => ({ groups: [...state.groups, parsedNewGroup] }));
    await get().fetchData(); // Refetch to get updated members with labels
    return parsedNewGroup;
  },

  updateGroup: async (id, data) => {
    await fetch(`/api/groups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    // Optimistic update
    set(state => ({
      groups: state.groups.map(g => g.id === id ? { 
        ...g, 
        ...data,
        members: data.members !== undefined ? data.members.map(m => ({...m, label: m.label || ''})) : g.members, // Ensure members are updated
      } : g)
    }));
    await get().fetchData(); // Full refetch to ensure member labels are correct
  },

  deleteGroup: async (id) => {
    try {
      const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete bio');
      set(state => ({ groups: state.groups.filter(g => g.id !== id) }));
      await get().fetchData();
      toast.success("Relational bio deleted");
    } catch (err) {
      toast.error("Failed to delete bio");
    }
  },

  addGroupMember: async (groupId, entityType, entityId, showOnEntityPage = false) => {
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, entityId, showOnEntityPage })
    });
    if (!res.ok) throw new Error('Failed to add group member');
    await get().fetchData(); // Refetch to ensure state is fully consistent
  },

  removeGroupMember: async (groupId, entityType, entityId) => {
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, entityId })
    });
    if (!res.ok) throw new Error('Failed to remove group member');
    await get().fetchData(); // Refetch to ensure state is fully consistent
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
    set({ artists: [], albums: [], tracks: [], releases: [], playlists: [], timeline: [], groups: [] });
  }
}));