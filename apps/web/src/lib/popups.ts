import { create } from 'zustand';

const PIN = 'curator.queuePinned';
const read = () => { try { return localStorage.getItem(PIN) === '1'; } catch { return false; } };

/** Which player pop-ups are open. The mini queue can be pinned: it then stays open while you do other things. */
export const usePopups = create<{
  queueOpen: boolean; queuePinned: boolean; coverOpen: boolean; devicesOpen: boolean;
  toggleDevices(): void; closeDevices(): void;
  toggleQueue(): void; closeQueue(): void; setPinned(v: boolean): void;
  toggleCover(): void; closeCover(): void;
  /** the full-screen now-playing view (cover, lyrics, screensaver) */
  nowOpen: boolean; setNow(v: boolean): void;
}>((set, get) => ({
  queueOpen: read(), queuePinned: read(), coverOpen: false, devicesOpen: false,
  toggleDevices: () => set({ devicesOpen: !get().devicesOpen, coverOpen: false }),
  closeDevices: () => set({ devicesOpen: false }),
  toggleQueue: () => set({ queueOpen: !get().queueOpen, coverOpen: false }),
  closeQueue: () => set({ queueOpen: false }),
  setPinned: (v) => { try { localStorage.setItem(PIN, v ? '1' : '0'); } catch { /* ignore */ } set({ queuePinned: v, queueOpen: v ? true : get().queueOpen }); },
  toggleCover: () => set({ coverOpen: !get().coverOpen, devicesOpen: false }),
  closeCover: () => set({ coverOpen: false }),
  nowOpen: false, setNow: (v) => set({ nowOpen: v, ...(v ? { coverOpen: false, devicesOpen: false } : {}) }),
}));
