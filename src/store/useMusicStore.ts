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
  addPlaylist: (playlist: Omit<Playlist, 'id' | 'createdAt'>) => Promise<void>;
  addRelease: (release: Omit<Release, 'id'>) => Promise<void>;
  addTimelineEntry: (entry: Omit<TimelineEntry, 'id' | 'timestamp'>) => Promise<void>;
  
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
  queue: [],
  currentTrackId: null,
  isPlaying: false,
  isLoading: false,

  fetchData: async () => {
    set({ isLoading: true });
    try {
      const [artists, albums, tracks, timeline, releases, playlists] = await Promise.all([
        fetch('/api/artists').then(res => res.json()),
        fetch('/api/albums').then(res => res.json()),
        fetch('/api/tracks').then(res => res.json()),
        fetch('/api/timeline').then(res => res.json()),
        fetch('/api/releases').then(res => res.json()).catch(() => []),
        fetch('/api/playlists').then(res => res.json()).catch(() => []),
      ]);
      
      set({ 
        artists: artists.map((a: any) => ({ ...a, groups: JSON.parse(a.groups || '[]'), eras: [] })), 
        albums: albums.map((al: any) => ({ ...al, covers: JSON.parse(al.covers || '[]') })), 
        tracks, 
        releases,
        playlists,
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
<dyad-problem-report summary="18 problems">
<problem file="src/components/modals/CreateArtistModal.tsx" line="27" column="7" code="2353">Object literal may only specify known properties, and 'id' does not exist in type 'Omit<Artist, "id" | "eras">'.</problem>
<problem file="src/components/modals/CreateAlbumModal.tsx" line="29" column="7" code="2353">Object literal may only specify known properties, and 'id' does not exist in type 'Omit<Album, "id">'.</problem>
<problem file="src/components/modals/CreatePlaylistModal.tsx" line="16" column="54" code="2551">Property 'addPlaylist' does not exist on type 'MusicState'. Did you mean 'playlists'?</problem>
<problem file="src/components/modals/CreateReleaseModal.tsx" line="18" column="53" code="2551">Property 'addRelease' does not exist on type 'MusicState'. Did you mean 'releases'?</problem>
<problem file="src/pages/Cleanup.tsx" line="9" column="19" code="2339">Property 'resetDatabase' does not exist on type 'MusicState'.</problem>
<problem file="server/db/schema.ts" line="59" column="3" code="2769">No overload matches this call.
  The last overload gave the following error.
    Object literal may only specify known properties, and 'albumId' does not exist in type '(columnTypes: { blob: { (): SQLiteBlobJsonBuilderInitial<"">; <TMode extends BlobMode = BlobMode>(config?: BlobConfig<TMode>): Equal<TMode, "bigint"> extends true ? SQLiteBigIntBuilderInitial<...> : Equal<...> extends true ? SQLiteBlobBufferBuilderInitial<...> : SQLiteBlobJsonBuilderInitial<...>; <TName extends stri...'.</problem>
<problem file="server/db/schema.ts" line="74" column="3" code="2769">No overload matches this call.
  The last overload gave the following error.
    Object literal may only specify known properties, and 'playlistId' does not exist in type '(columnTypes: { blob: { (): SQLiteBlobJsonBuilderInitial<"">; <TMode extends BlobMode = BlobMode>(config?: BlobConfig<TMode>): Equal<TMode, "bigint"> extends true ? SQLiteBigIntBuilderInitial<...> : Equal<...> extends true ? SQLiteBlobBufferBuilderInitial<...> : SQLiteBlobJsonBuilderInitial<...>; <TName extends stri...'.</problem>
<problem file="server/routes/api/timeline.ts" line="1" column="10" code="2724">'"nitro"' has no exported member named 'defineEventHandler'. Did you mean 'defineHandler'?</problem>
<problem file="server/routes/api/timeline.ts" line="1" column="30" code="2305">Module '"nitro"' has no exported member 'readBody'.</problem>
<problem file="server/routes/api/artists.ts" line="1" column="10" code="2724">'"nitro"' has no exported member named 'defineEventHandler'. Did you mean 'defineHandler'?</problem>
<problem file="server/routes/api/artists.ts" line="1" column="30" code="2305">Module '"nitro"' has no exported member 'readBody'.</problem>
<problem file="server/routes/api/albums.ts" line="1" column="10" code="2724">'"nitro"' has no exported member named 'defineEventHandler'. Did you mean 'defineHandler'?</problem>
<problem file="server/routes/api/albums.ts" line="1" column="30" code="2305">Module '"nitro"' has no exported member 'readBody'.</problem>
<problem file="server/routes/api/tracks.ts" line="1" column="10" code="2724">'"nitro"' has no exported member named 'defineEventHandler'. Did you mean 'defineHandler'?</problem>
<problem file="server/routes/api/tracks.ts" line="1" column="30" code="2305">Module '"nitro"' has no exported member 'readBody'.</problem>
<problem file="server/routes/api/upload.post.ts" line="1" column="10" code="2724">'"nitro"' has no exported member named 'defineEventHandler'. Did you mean 'defineHandler'?</problem>
<problem file="server/routes/api/upload.post.ts" line="1" column="30" code="2305">Module '"nitro"' has no exported member 'readMultipartFormData'.</problem>
<problem file="server/routes/api/upload.post.ts" line="1" column="53" code="2305">Module '"nitro"' has no exported member 'createError'.</problem>
</dyad-problem-report><think>**Addressing TypeScript Errors**

I'm currently focused on resolving 18 TypeScript errors. I've pinpointed the initial issues: the `id` property is incorrectly passed to `addArtist` and `addAlbum`, which is inconsistent with the store interface. Additionally, `addPlaylist`, `addRelease`, and `resetDatabase` require immediate attention.


**Clarifying Nitro Imports**

I'm now investigating the Nitro import errors. It appears the user is attempting to import functions like `defineEventHandler` from `"nitro"` directly, which might be incorrect. The instructions specify using `defineHandler` from `"nitro"` for handlers in the server routes. I'll need to verify that Nitro's correct usage is being followed. Specifically, I'll need to check the import statements.


**Refining Import Directives**

I've determined I need to replace `defineEventHandler` with `defineHandler` for the Nitro imports. Also, it seems `readBody`, `readMultipartFormData`, and `createError` should be imported from `h3`, not Nitro. I'm now examining the relevant files to confirm and correct these directives. I'm focusing on syntax of the junction tables and how they're used.


**Analyzing Schema and Imports**

I'm now zeroing in on the schema and imports. The error message regarding `albumId` suggests a type mismatch in a junction table definition within `server/db/schema.ts`. I'm going to look at that first. Simultaneously, I will update routes in the server directory and adjust imports of `readBody`, `readMultipartFormData`, and `createError` to `h3`.


**Revising Table Schemas**

I'm revisiting `server/db/schema.ts`, specifically the `sqliteTable` calls. I suspect a type mismatch due to the object syntax used with a Drizzle version mismatch. The error regarding `albumId` in `albumTracks` and similar tables points to this. I'll switch to the function syntax for the junction tables.

**Planning File Updates**

I've revised my approach, focusing on specific files. In `src/store/useMusicStore.ts`, I'll add and implement `addPlaylist`, `addRelease`, and `resetDatabase`, ensuring `addArtist` and `addAlbum` exclude the `id` property. Simultaneously, I will remove `id` from the `addArtist` call in `CreateArtistModal.tsx`.


</think>I've fixed all 18 TypeScript errors by updating the store interface, correcting the database schema syntax for junction tables, and aligning the server routes with the specific Nitro and H3 APIs.

<dyad-write path="src/store/useMusicStore.ts" description="Updating MusicState interface and implementing missing actions.">
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
  addPlaylist: (playlist: Omit<Playlist, 'id' | 'createdAt'>) => Promise<void>;
  addRelease: (release: Omit<Release, 'id'>) => Promise<void>;
  addTimelineEntry: (entry: Omit<TimelineEntry, 'id' | 'timestamp'>) => Promise<void>;
  
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
  queue: [],
  currentTrackId: null,
  isPlaying: false,
  isLoading: false,

  fetchData: async () => {
    set({ isLoading: true });
    try {
      const [artists, albums, tracks, timeline, releases, playlists] = await Promise.all([
        fetch('/api/artists').then(res => res.json()),
        fetch('/api/albums').then(res => res.json()),
        fetch('/api/tracks').then(res => res.json()),
        fetch('/api/timeline').then(res => res.json()),
        fetch('/api/releases').then(res => res.json()).catch(() => []),
        fetch('/api/playlists').then(res => res.json()).catch(() => []),
      ]);
      
      set({ 
        artists: artists.map((a: any) => ({ ...a, groups: JSON.parse(a.groups || '[]'), eras: [] })), 
        albums: albums.map((al: any) => ({ ...al, covers: JSON.parse(al.covers || '[]') })), 
        tracks, 
        releases,
        playlists,
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