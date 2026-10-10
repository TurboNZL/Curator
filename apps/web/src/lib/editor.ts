import { create } from 'zustand';

/** `release`: id = release id. `new-release`: id = album id. `track-details`: id = track id. `bio`: id = group id. `new-bio`: id = `entityType:entityId` to pre-link, or '' for none. `new-album`, `new-artist`, `new-playlist` ignore `id`; `upload`: id = album id to add the files to, or '' for singles; `playlist`: id = playlist id; `add-to-playlist` / `add-to-album`: id = track id; `era`: id = era id; `new-era` ignores `id`; `new-track` with id '' makes a single; `new-track` creates a track inside the album `id` */
export type EditTarget = { kind: 'track' | 'album' | 'artist' | 'new-album' | 'new-track' | 'bio' | 'new-bio' | 'import' | 'track-details' | 'release' | 'new-release' | 'new-artist' | 'upload' | 'playlist' | 'new-playlist' | 'add-to-playlist' | 'add-to-album' | 'era' | 'new-era'; id: string };

/** Which entity the edit dialog is open for (one dialog at a time, rendered by EditorHost). */
export const useEditor = create<{ target: EditTarget | null; open(t: EditTarget): void; close(): void }>((set) => ({
  target: null, open: (target) => set({ target }), close: () => set({ target: null }),
}));
