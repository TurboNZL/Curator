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
  
  userQueue: string[];
  activeQueue: string[];
  currentTrackId: string | null;
  currentTrackContext?: { type: 'album' | 'playlist' | 'track', id: string } | null;
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
  
  addPlaylist: (playlist: Omit<Playlist, 'id' | 'createdAt'>) => Promise<Playlist>; 
  updatePlaylist: (id: string, data: Partial<Playlist>) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
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
      const fetchJson = async (url: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return [];
          return await res.json();
        } catch (e) {
          console.error(`Fetch failed for ${url}:`, e);
          return [];
        }
      };

      const [artists, albums, tracks, timeline, releases, playlists, logs, profiles, groups, releaseTypes] = await Promise.all([
        fetchJson('/api/artists'),
        fetchJson('/api/albums'),
        fetchJson('/api/tracks'),
        fetchJson('/api/timeline'),
        fetchJson('/api/releases'),
        fetchJson('/api/playlists'),
        fetchJson('/api/playback-stats'),
        fetchJson('/api/profiles'),
        fetchJson('/api/groups'),
        fetchJson('/api/release-types'),
      ]);
      
      const activeProfile = profiles && profiles[0] ? {
        ...profiles[0],
        settings: JSON.parse(profiles[0].settings || '{"showUnbalancedFirst": false}'),
        playbackRules: JSON.parse(profiles[0].playbackRules || '[]')
      } : DEFAULT_PROFILE;

      set({
        activeProfile,
        artists: (artists || []).map((a: any) => ({ ...a, groups: JSON.parse(a.groups || '[]'), eras: [] })),
        albums: (albums || []).map((al: any) => ({
          ...al,
          covers: JSON.parse(al.covers || '[]'),
          pendingFiles: JSON.parse(al.pendingFiles || '[]'),
          artistIds: JSON.parse(al.artistIds || '[]')
        })),
        tracks: (tracks || []).map((t: any) => ({
          ...t,
          genres: typeof t.genres === 'string' ? JSON.parse(t.genres || '[]') : (t.genres || []),
          producers: typeof t.producers === 'string' ? JSON.parse(t.producers || '[]') : (t.producers || []),
          writers: typeof t.writers === 'string' ? JSON.parse(t.writers || '[]') : (t.writers || []),
          credits: typeof t.credits === 'string' ? JSON.parse(t.credits || '[]') : (t.credits || []),
          queueRules: typeof t.queueRules === 'string' ? JSON.parse(t.queueRules || '{}') : (t.queueRules || {}),
          artistIds: typeof t.artistIds === 'string' ? JSON.parse(t.artistIds || '[]') : (t.artistIds || []),
          albumIds: typeof t.albumIds === 'string' ? JSON.parse(t.albumIds || '[]') : (t.albumIds || []),
          isFavorite: !!t.isFavorite
        })),
        releases: releases || [],
        playlists: playlists || [],
        groups: (groups || []).map((g: any) => ({
          ...g,
          isArtistOnly: !!g.isArtistOnly,
          members: g.members ? g.members.map((m: any) => ({ ...m, showOnEntityPage: !!m.showOnEntityPage })) : []
        })),
        releaseTypes: releaseTypes || [],
        timeline: (timeline || []).map((t: any) => ({ ...t, timestamp: new Date(t.timestamp) })),
        playbackLogs: logs || [],
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
        const shouldApplyRule = rule.applyToAlbumSource === true
          ? (context?.type === 'album')
          : true;
        if (shouldApplyRule) {
          const nextIdFromRule = rule.trackBId;
          const isNextInUserQueue = state.userQueue.length > 0 && state.userQueue[0] === nextIdFromRule;
          const isNextInActiveQueue = newActiveQueue.length > 0 && newActiveQueue[0] === nextIdFromRule;
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
      currentDuration: 0,
      currentTrackContext: trackId && context ? { type: context.type, id: context.id } : null
    });
  },

  setProgress: (progress) => set({ currentProgress: progress }),
  setDuration: (duration) => set({ currentDuration: duration }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setVolume: (val) => set({ volume: val }),
  toggleShuffle: () => set((state) => ({ isShuffled: !state.isShuffled })),

  nextTrack: () => {
    const state = get();
    const { activeQueue, userQueue, currentTrackId, activeProfile, currentTrackContext } = state;
    const rule = activeProfile.playbackRules.find(r => r.trackAId === currentTrackId);
    if (rule) {
      const shouldApplyRule = rule.applyToAlbumSource === true
        ? (currentTrackContext?.type === 'album')
        : true;

      if (shouldApplyRule) {
        const nextIdFromRule = rule.trackBId;
        const isNextInUserQueue = state.userQueue.length > 0 && state.userQueue[0] === nextIdFromRule;
        const isNextInActiveQueue = activeQueue.length > 0 && activeQueue[0] === nextIdFromRule;
        if (!isNextInUserQueue && !isNextInActiveQueue) {
          set({ currentTrackId: nextIdFromRule, isPlaying: true });
          set(s => ({
            userQueue: s.userQueue.filter(id => id !== nextIdFromRule),
            activeQueue: s.activeQueue.filter(id => id !== nextIdFromRule)
          }));
          return;
        }
      }
    }
    if (userQueue.length > 0) {
      const nextId = userQueue[0];
      set({ currentTrackId: nextId, userQueue: userQueue.slice(1), isPlaying: true });
    } else if (activeQueue.length > 0) {
      const nextId = activeQueue[0];
      set({ currentTrackId: nextId, activeQueue: activeQueue.slice(1), isPlaying: true });
    } else {
      set({ currentTrackId: null, isPlaying: false });
    }
  },

  previousTrack: () => {},
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

  mergeActiveToUserQueue: () => set(state => ({ userQueue: [...state.userQueue, ...state.activeQueue], activeQueue: [] })),
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
        if (indexA !== -1) shuffled.splice(indexA + 1, 0, rule.trackBId);
        else { shuffled.unshift(rule.trackBId); shuffled.unshift(rule.trackAId); }
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
        if (indexA !== -1) shuffled.splice(indexA + 1, 0, rule.trackBId);
        else { shuffled.unshift(rule.trackBId); shuffled.unshift(rule.trackAId); }
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
    await get().fetchData(); 
  },

  deleteArtist: async (id) => {
    try {
      const res = await fetch(`/api/artists/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete artist');
      await get().fetchData();
      toast.success("Artist deleted");
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
    await get().fetchData();
  },

  deleteAlbum: async (id) => {
    try {
      const res = await fetch(`/api/albums/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete album');
      await get().fetchData(); 
      toast.success("Album deleted");
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
      if (res.ok) { // Only process if the response is OK
        const newTrack = await res.json();
        set(state => ({ tracks: [...state.tracks, newTrack] }));
        createdTracks.push(newTrack);
      } else {
        console.error(`Failed to add track: ${trackData.title}`, await res.text());
        // Optionally toast an error for individual track failure, or aggregate for a single toast at the end
      }
    }
    return createdTracks;
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
      toast.success("Track deleted");
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

  deletePlaylist: async (id) => {
    try {
      const res = await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete playlist');
      await get().fetchData(); 
      toast.success("Playlist deleted");
    }

    catch (err) {
      toast.error("Failed to delete playlist");
    }
  },

  addRelease: async (releaseData) => {
    const res = await fetch('/api/releases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(releaseData)
    });
    const newRelease = await res.json();
    await get().fetchData();
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
    await get().fetchData();
    return newGroup;
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

  addGroupMember: async (groupId, entityType, entityId, showOnEntityPage = false) => {
    await fetch(`/api/groups/${groupId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, entityId, showOnEntityPage })
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
    set(state => ({ activeProfile: { ...state.activeProfile, settings: updatedSettings } }));
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