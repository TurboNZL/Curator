import { create } from 'zustand';

/** `bio`: id = group id. `new-bio`: id = `entityType:entityId` to pre-link, or '' for none. `new-album` ignores `id`; `new-track` creates a track inside the album `id` */
export type EditTarget = { kind: 'track' | 'album' | 'artist' | 'new-album' | 'new-track' | 'bio' | 'new-bio' | 'import'; id: string };

/** Which entity the edit dialog is open for (one dialog at a time, rendered by EditorHost). */
export const useEditor = create<{ target: EditTarget | null; open(t: EditTarget): void; close(): void }>((set) => ({
  target: null, open: (target) => set({ target }), close: () => set({ target: null }),
}));
