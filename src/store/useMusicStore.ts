import { create } from 'zustand';
import { Profile, Artist, Album, Track, Release, TimelineEntry, Playlist, Group, ReleaseType, PlaybackRule, PlaybackLog, Credit, RoleCategory } from '../types/music';
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
  playbackLogs: PlaybackLog[];
  genres: string[];
  roleCategories: RoleCategory[]; 
  
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
  
  addArtist: (artist: Omit<Artist, 'id' | 'eras'>) => Promise<Artist>; // Removed 'groups'
  updateArtist: (id: string, data: Partial<Artist>) => Promise<void>;
  deleteArtist: (id: string) => Promise<void>;
  
  addAlbum: (album: Omit<Album, 'id'>) => Promise<Album>; // Removed 'artistIds'
  updateAlbum: (id: string, data: Partial<Album>) => Promise<void>;
  deleteAlbum: (id: string) => Promise<void>;
  
  addTracks: (tracks: Omit<Track, 'id' | 'eloScore' | 'comparisons' | 'memories' | 'isFavorite'>[]) => Promise<Track[]>; // Removed 'artistIds'
  updateTrack: (id: string, data: Partial<Track>) => Promise<void>;
  deleteTrack: (id: string) => Promise<void>;
  incrementMemories: (id: string) => Promise<void>;
  decrementMemories: (id: string) => Promise<void>;
  
  addPlaylist: (playlist: Omit<Playlist, 'id' | 'createdAt'>) => Promise<Playlist>; 
  updatePlaylist: (id: string, data: Partial<Playlist>) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addRelease: (release: Omit<Release, 'id'>) => Promise<Release>; 
  updateRelease: (id: string, data: Partial<Release>) => Promise<void>;
  addReleaseType: (name: string) => Promise<void>;
  addTimelineEntry:(entry: Omit<TimelineEntry, 'id' | 'timestamp'>) => Promise<void>;
  
  addGroup: (group: Omit<Group, 'id'>) => Promise<Group>; 
  updateGroup: (id: string, data: Partial<Omit<Group, 'id'>>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  addGroupMember: (groupId: string, entityType: string, entityId: string, showOnEntityPage?: boolean) => Promise<void>;
  removeGroupMember: (groupId: string, entityType: string, entityId: string) => Promise<void>;
  
  addRoleCategory: (name: string) => Promise<void>; 
  addGenre: (name: string) => Promise<void>; // New: Add Genre
  
  vote: (data: { trackAId: string, trackBId: string, winnerId?: string, isEqual?: boolean }) => Promise<void>;
  updateSettings: (settings: Partial<Profile['settings']>) => Promise<void>;
  updatePlaybackRules: (rules: PlaybackRule[]) => Promise<void>;
  
  uploadFile: (file: File, type: 'audio' | 'image') => Promise<string>;
  resetDatabase: () => Promise<void>;
  clearUnlinkedFiles: () => Promise<void>;
  clearUnusedCategoriesAndGenres: () => Promise<void>; 
  
  getRankedTenStarTracks: () => Track[];
}

const DEFAULT_PROFILE: Profile = {
  id: '1',
  name: 'Main Curator',
  theme: 'dark',
  accentColor: '#3b82f6',
  playbackMode: 'local',
  playbackRules: [],
  settings: {"showUnbalancedFirst": false}
};

const parseJsonOrDefault = (value: any, defaultValue: any) => {
  if (value === undefined || value === null) return defaultValue;

  if (typeof value !== 'string') return value;

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(defaultValue)) {
      return Array.isArray(parsed) ? parsed : defaultValue;
    }
    if (typeof defaultValue === 'object' && defaultValue !== null) {
      return typeof parsed === 'object' && parsed !== null ? parsed : defaultValue;
    }
    return parsed;
  } catch (e) {
    console.error("Error parsing JSON:", e, value);
    return defaultValue;
  }
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
  genres: [],
  roleCategories: [], 
  
  userQueue: [],
  activeQueue: [],
  currentTrackId: null,
  isPlaying: false,
  isLoading: false,
  volume: 0.4,
  isShuffled: false,
  currentProgress: 0,
  currentDuration: 0,

  fetchData: async () => {
    set({ isLoading: true });
    try {
      const fetchJson = async (url: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) {
            console.error(`Fetch failed for ${url}: ${res.status} ${res.statusText}`);
            return [];
          }
          return await res.json();
        } catch (e) {
          console.error(`Fetch failed for ${url}:`, e);
          return [];
        }
      };

      const [artists, albums, tracks, timeline, releases, playlists, logs, profiles, groups, releaseTypes, allGenres, roleCategories] = await Promise.all([
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
        fetchJson('/api/genres'),
        fetchJson('/api/role-categories'),
      ]);
      
      const activeProfile = profiles && profiles[0] ? {
        ...profiles[0],
        settings: parseJsonOrDefault(profiles[0].settings, {"showUnbalancedFirst": false}),
        playbackRules: parseJsonOrDefault(profiles[0].playbackRules, [])
      } : DEFAULT_PROFILE;

      set({
        activeProfile,
        artists: (artists || []).map((a: any) => ({ ...a, eras: [] })), // Removed groups from Artist parsing
        albums: (albums || []).map((al: any) => ({
          ...al,
          // Removed artistIds parsing
          primaryCover: al.primaryCover || null,
          pendingFiles: parseJsonOrDefault(al.pendingFiles, []),
          // Removed credits: parseJsonOrDefault(al.credits, []), 
          artistCredits: parseJsonOrDefault(al.artistCredits, []), // Artist credits (role: string[])
          genres: parseJsonOrDefault(al.genres, []), // Parse genres for Album
        })),
        tracks: (tracks || []).map((t: any) => ({
          ...t,
          genres: t.genres || [], 
          artistCredits: parseJsonOrDefault(t.artistCredits, []), // Artist credits (role: string[])
          // Removed artistIds parsing
          queueRules: parseJsonOrDefault(t.queueRules, {}),
          albumIds: parseJsonOrDefault(t.albumIds, []),
          isFavorite: !!t.isFavorite,
          bitrate: t.bitrate || 'Unknown',
          syncWithAlbumCredits: !!t.syncWithAlbumCredits 
        })),
        releases: releases || [],
        groups: (groups || []).map((g: any) => ({
          ...g,
          isArtistOnly: !!g.isArtistOnly,
          members: g.members ? g.members.map((m: any) => ({ ...m, showOnEntityPage: !!m.showOnEntityPage })) : []
        })),
        playlists: playlists || [],
        releaseTypes: releaseTypes || [],
        timeline: (timeline || []).map((t: any) => ({ ...t, timestamp: new Date(t.timestamp) })),
        playbackLogs: (logs || []).map((log: any) => ({ ...log, timestamp: new Date(log.timestamp), isSkip: !!log.isSkip })),
        genres: allGenres || [],
        roleCategories: roleCategories || [],
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
    let newPlayingState = !!trackId;

    if (context) {
      if (context.type === 'album' || context.type === 'playlist') {
        const allTracks = context.tracks || [];
        const index = allTracks.indexOf(trackId || '');
        newActiveQueue = index !== -1 ? allTracks.slice(index + 1) : [];
      }
    }

    let finalUserQueue = [...state.userQueue];

    // Apply rule if current track is trackA
    if (trackId) {
      const rule = state.activeProfile.playbackRules.find(r => r.trackAId === trackId);
      if (rule) {
        const shouldApplyRule = rule.applyToAlbumSource === true
          ? (context?.type === 'album')
          : true;
        
        if (shouldApplyRule) {
          const nextIdFromRule = rule.trackBId;
          const isNextDirectlyInUserQueue = finalUserQueue.length > 0 && finalUserQueue[0] === nextIdFromRule;
          const isNextDirectlyInActiveQueue = newActiveQueue.length > 0 && newActiveQueue[0] === nextIdFromRule;

          // If trackB is not already directly next, insert it at the beginning of the user queue
          if (!isNextDirectlyInUserQueue && !isNextDirectlyInActiveQueue) {
            finalUserQueue.unshift(nextIdFromRule);
          }
        }
      } 
    }

    set({
      currentTrackId: trackId,
      isPlaying: newPlayingState,
      activeQueue: newActiveQueue,
      userQueue: finalUserQueue,
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
    
    // Check for rule application from the *current* track first
    if (currentTrackId) {
      const rule = activeProfile.playbackRules.find(r => r.trackAId === currentTrackId);
      if (rule) {
        const shouldApplyRule = rule.applyToAlbumSource === true
          ? (currentTrackContext?.type === 'album')
          : true;

        if (shouldApplyRule) {
          const nextIdFromRule = rule.trackBId;
          // If the rule's trackB is at the very front of the user queue, play it and remove it
          if (userQueue.length > 0 && userQueue[0] === nextIdFromRule) {
            set({ currentTrackId: nextIdFromRule, userQueue: userQueue.slice(1), isPlaying: true });
            return;
          }
        }
      }
    }

    // Fallback to regular queue logic if no rule applied or rule already handled
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
    const tempLogId = `temp-${Math.random().toString(36).substring(2, 9)}`;

    const newLog = {
      id: tempLogId,
      trackId,
      timestamp: new Date(),
      duration,
      sourceType: source?.type,
      sourceId: source?.id,
      isSkip: !!isSkip,
    };

    set(state => ({
      playbackLogs: [...state.playbackLogs, newLog]
    }));

    try {
      const res = await fetch('/api/playback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId,
          duration,
          sourceType: source?.type,
          sourceId: source?.id,
          isSkip: !!isSkip,
        })
      });
      if (res.ok) {
        const serverLog = await res.json();
        set(state => ({
          playbackLogs: state.playbackLogs.map(log => log.id === tempLogId ? { ...serverLog, timestamp: new Date(serverLog.timestamp) } : log)
        }));
      } else {
        console.error(`Failed to log playback to server: ${trackId}`, await res.text());
        set(state => ({
          playbackLogs: state.playbackLogs.filter(log => log.id !== tempLogId)
        }));
      }
    } catch (e) {
      console.error("Error logging playback:", e);
      set(state => ({
        playbackLogs: state.playbackLogs.filter(log => log.id !== tempLogId)
      }));
    }
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
    let shuffled = [...state.activeQueue].sort(() => Math.random() - 0.5);
    const rules = state.activeProfile.playbackRules.filter(r => r.playFirstOnShuffle);
    
    for (const rule of rules) {
      const indexA = shuffled.indexOf(rule.trackAId);
      const indexB = shuffled.indexOf(rule.trackBId);

      if (indexA !== -1 && indexB !== -1) {
        shuffled.splice(indexB, 1);
        shuffled.splice(indexA + 1, 0, rule.trackBId);
      }
    }
    set({ activeQueue: shuffled, isShuffled: true });
  },

  shuffleUserQueue: () => {
    const state = get();
    let shuffled = [...state.userQueue].sort(() => Math.random() - 0.5);
    const rules = state.activeProfile.playbackRules.filter(r => r.playFirstOnShuffle);

    for (const rule of rules) {
      const indexA = shuffled.indexOf(rule.trackAId);
      const indexB = shuffled.indexOf(rule.trackBId);

      if (indexA !== -1 && indexB !== -1) {
        shuffled.splice(indexB, 1);
        shuffled.splice(indexA + 1, 0, rule.trackBId);
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
    const parsedNewArtist = { ...newArtist, eras: [] }; // Removed groups from Artist parsing
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
      body: JSON.stringify({
        ...albumData,
        // Removed `credits` from here
        artistCredits: JSON.stringify(albumData.artistCredits || []), // Album artist credits (role: string[])
        genres: JSON.stringify(albumData.genres || []), // Stringify genres for DB
      })
    });
    const newAlbum = (await res.json()) as Album; // Cast to Album
    const parsedNewAlbum = { 
      ...newAlbum, 
      pendingFiles: parseJsonOrDefault(newAlbum.pendingFiles, []),
      // Removed credits: parseJsonOrDefault(newAlbum.credits, []), 
      artistCredits: parseJsonOrDefault(newAlbum.artistCredits, []), // Parse album artist credits (role: string[])
      genres: parseJsonOrDefault(newAlbum.genres, []), // Parse genres for Album
    };
    set(state => ({ albums: [...state.albums, parsedNewAlbum] }));
    return parsedNewAlbum;
  },

  updateAlbum: async (id, data) => {
    const updateData: Partial<any> = { ...data };
    // Removed artistIds
    // if (updateData.credits !== undefined) updateData.credits = JSON.stringify(updateData.credits); // Removed general credits
    if (updateData.artistCredits !== undefined) updateData.artistCredits = JSON.stringify(updateData.artistCredits); // Album artist credits (role: string[])
    if (updateData.genres !== undefined) updateData.genres = JSON.stringify(updateData.genres); // Stringify genres for DB

    await fetch(`/api/albums/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData) 
    });
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
        body: JSON.stringify({
          ...trackData,
          // Removed artistIds
          artistCredits: JSON.stringify(trackData.artistCredits || []), // Artist credits (role: string[])
          genres: trackData.genres || [], 
          queueRules: JSON.stringify(trackData.queueRules || {}),
        })
      });
      if (res.ok) {
        const newTrack = await res.json();
        set(state => ({ tracks: [...state.tracks, newTrack] }));
        createdTracks.push(newTrack);
      } else {
        console.error(`Failed to add track: ${trackData.title}`, await res.text());
      }
    }
    return createdTracks;
  },

  updateTrack: async (id, data) => {
    const updateData: Partial<any> = { ...data };
    // Removed artistIds
    if (updateData.artistCredits !== undefined) updateData.artistCredits = JSON.stringify(updateData.artistCredits); // Artist credits (role: string[])
    if (updateData.genres !== undefined) updateData.genres = updateData.genres; 
    if (updateData.queueRules !== undefined) updateData.queueRules = JSON.stringify(updateData.queueRules);

    await fetch(`/api/tracks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
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

  decrementMemories: async (id) => {
    const track = get().tracks.find(t => t.id === id);
    if (track && (track.memories || 0) > 0) {
      await get().updateTrack(id, { memories: (track.memories || 0) - 1 });
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
    const updateData = { ...data };
    if (data.trackIds) updateData.trackIds = data.trackIds;
    await fetch(`/api/playlists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
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
    const updateData = { ...data };
    if (data.trackIds) updateData.trackIds = data.trackIds;
    await fetch(`/api/releases/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
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
      body: JSON.stringify({ entityType, entityId, showOnEntityPage }),
    });
    await get().fetchData();
  },

  removeGroupMember: async (groupId, entityType, entityId) => {
    await fetch(`/api/groups/${groupId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, entityId }),
    });
    await get().fetchData();
  },

  addRoleCategory: async (name: string) => {
    await fetch('/api/role-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    await get().fetchData();
  },

  addGenre: async (name: string) => {
    try {
      const res = await fetch('/api/genres/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (!res.ok) throw new Error('Failed to add genre');
      await get().fetchData();
      toast.success(`Genre "${name}" added.`);
    } catch (err) {
      toast.error("Failed to add genre.");
    }
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
      body: JSON.stringify({ settings: updatedSettings })
    });
    set(state => ({ activeProfile: { ...state.activeProfile, settings: updatedSettings } }));
  },

  updatePlaybackRules: async (rules) => {
    const profile = get().activeProfile;
    await fetch(`/api/profiles/${profile.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playbackRules: rules })
    });
    set(state => ({ activeProfile: { ...state.activeProfile, playbackRules: rules } }));
  },

  resetDatabase: async () => {
    await fetch('/api/reset', { method: 'POST' });
    set({ artists: [], albums: [], tracks: [], releases: [], playlists: [], timeline: [], groups: [], playbackLogs: [], genres: [], roleCategories: [] });
  },

  clearUnlinkedFiles: async () => {
    const res = await fetch('/api/cleanup-files', { method: 'POST' });
    if (!res.ok) throw new Error('File cleanup failed');
    const data = await res.json();
    if (data.success) {
      toast.success(data.message);
    } else {
      toast.error(data.message);
    }
    return data;
  },

  clearUnusedCategoriesAndGenres: async () => {
    try {
      const res = await fetch('/api/genres/cleanup', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to clear unused categories and genres');
      await get().fetchData();
      toast.success("Unused categories and genres cleared.");
    } catch (err) {
      toast.error("Failed to clear unused categories and genres.");
    }
  },

  getRankedTenStarTracks: () => {
    const allTracks = get().tracks;
    const tenStarTracks = allTracks.filter(t => 
      t.rating !== undefined && t.rating !== null && t.rating >= 9.9999 && t.comparisons > 0
    );
    return [...tenStarTracks].sort((a, b) => (b.eloScore ?? 0) - (a.eloScore ?? 0));
  }
}));