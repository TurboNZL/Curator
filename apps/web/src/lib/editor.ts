import { create } from 'zustand';

export type EditTarget = { kind: 'track' | 'album' | 'artist'; id: string };

/** Which entity the edit dialog is open for (one dialog at a time, rendered by EditorHost). */
export const useEditor = create<{ target: EditTarget | null; open(t: EditTarget): void; close(): void }>((set) => ({
  target: null, open: (target) => set({ target }), close: () => set({ target: null }),
}));
