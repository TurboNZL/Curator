import { create } from 'zustand';
import { advance, newId, pushHistory, shuffleWithRules, startTrack, type PlaybackLogData, type QueueState, type SourceType } from '@curator/core';
import { moveTrack } from './defaults.ts';
import { audioSource } from './files.ts';
import { getLibrary } from './derive.ts';
import { useStore } from './store.ts';

interface Source { type: SourceType; id: string | null }

interface PlayerState {
  queue: QueueState;
  history: string[];
  source: Source;
  playing: boolean;
  time: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  /** shown when the current track has no audio file or failed to load */
  error: string | null;
  play(trackId: string, list: string[], source?: Source): void;
  toggle(): void;
  next(): void;
  prev(): void;
  seek(t: number): void;
  setVolume(v: number): void;
  toggleShuffle(): void;
  /** put at the front of the user queue ("play next") or the back ("add to queue") */
  enqueue(trackId: string, where?: 'next' | 'last'): void;
  dequeue(index: number): void;
  /** reorder the user queue */
  moveQueued(from: number, to: number): void;
  clearQueued(): void;
  /** shuffle what is queued by you / what is left of the album or list (rules keep pairs together) */
  shuffleQueued(): void;
  shuffleRest(): void;
  /** the rest of the album or list becomes part of the user queue / is dropped */
  keepRest(): void;
  clearRest(): void;
}

let audio: HTMLAudioElement | null = null;
let loadSeq = 0;
let objectUrl: string | null = null;
const lib = getLibrary;
const rules = () => lib().rules;

export const usePlayer = create<PlayerState>((set, get) => {
  const el = () => {
    if (audio) return audio;
    audio = new Audio();
    audio.preload = 'auto';
    audio.addEventListener('timeupdate', () => set({ time: audio!.currentTime }));
    audio.addEventListener('durationchange', () => set({ duration: Number.isFinite(audio!.duration) ? audio!.duration : 0 }));
    audio.addEventListener('play', () => set({ playing: true }));
    audio.addEventListener('pause', () => set({ playing: false }));
    audio.addEventListener('ended', () => { logPlay(false); get().next(); });
    audio.addEventListener('error', () => {
      if (!audio!.getAttribute('src')) return;
      set({ error: 'Could not load this track', playing: false });
    });
    audio.volume = get().volume;
    return audio;
  };

  /** playbackLogs are append-only; skips are logged too so stats can tell them apart */
  function logPlay(isSkip: boolean) {
    const id = get().queue.currentId;
    if (!id || !audio) return;
    const dur = audio.currentTime;
    if (dur < 1) return;
    const s = get().source;
    const data: PlaybackLogData = { trackId: id, timestamp: Date.now(), duration: dur, sourceType: s.type, sourceId: s.id, isSkip };
    useStore.getState().put('playbackLogs', data);
  }

  function load(trackId: string | null) {
    const a = el();
    const seq = ++loadSeq; // a newer load supersedes one still resolving its source
    if (!trackId) { a.pause(); a.removeAttribute('src'); set({ time: 0, duration: 0, playing: false, error: null }); return true; }
    const track = lib().trackById.get(trackId);
    if (!track?.file) return false;
    set({ error: null, time: 0 });
    void audioSource(track.file).then(({ url, local }) => {
      if (seq !== loadSeq) { if (local) URL.revokeObjectURL(url); return; }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = local ? url : null;
      a.src = url;
      void a.play().catch(() => set({ playing: false }));
    });
    updateMediaSession(trackId);
    return true;
  }

  function updateMediaSession(trackId: string) {
    if (!('mediaSession' in navigator)) return;
    const t = lib().trackById.get(trackId);
    if (!t) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artistName, album: t.albumTitle ?? '' });
    navigator.mediaSession.setActionHandler('nexttrack', () => get().next());
    navigator.mediaSession.setActionHandler('previoustrack', () => get().prev());
    navigator.mediaSession.setActionHandler('play', () => void el().play());
    navigator.mediaSession.setActionHandler('pause', () => el().pause());
  }

  /** Move to `q.currentId`, skipping tracks that have no audio yet. */
  function go(q: QueueState, guard = 0): void {
    if (!q.currentId) { set({ queue: q }); load(null); return; }
    if (load(q.currentId)) { set({ queue: q }); return; }
    if (guard > 100) { set({ queue: q, error: 'No playable tracks in the queue', playing: false }); return; }
    go(advance(q, rules(), get().source.type), guard + 1);
  }

  return {
    queue: { user: [], active: [], currentId: null }, history: [], source: { type: 'track', id: null },
    playing: false, time: 0, duration: 0, volume: Number(localStorage.getItem('curator.volume') ?? 0.8), shuffle: false, error: null,

    play(trackId, list, source = { type: 'track', id: null }) {
      const track = lib().trackById.get(trackId);
      if (!track?.file) { set({ error: 'This track has no audio file yet', source }); return; }
      const shuffled = get().shuffle ? shuffleWithRules(list.filter((id) => id !== trackId), rules()) : null;
      const ordered = shuffled ? [trackId, ...shuffled] : list;
      const prev = get().queue.currentId;
      if (prev) logPlay(true);
      set({ source, history: pushHistory(get().history, prev) });
      go(startTrack(get().queue, trackId, ordered, rules(), source.type));
    },

    toggle() {
      const a = el();
      if (!get().queue.currentId) return;
      if (a.paused) void a.play(); else a.pause();
    },

    next() {
      const q = get().queue;
      if (audio && !audio.ended) logPlay(true);
      set({ history: pushHistory(get().history, q.currentId) });
      go(advance(q, rules(), get().source.type));
    },

    prev() {
      const a = el();
      const h = get().history;
      if (a.currentTime > 3 || !h.length) { a.currentTime = 0; return; }
      const id = h[h.length - 1];
      const q = get().queue;
      set({ history: h.slice(0, -1) });
      go({ ...q, currentId: id, user: q.currentId ? [q.currentId, ...q.user] : q.user });
    },

    seek(t) { el().currentTime = t; set({ time: t }); },
    setVolume(v) { el().volume = v; try { localStorage.setItem('curator.volume', String(v)); } catch { /* ignore */ } set({ volume: v }); },
    toggleShuffle() { set({ shuffle: !get().shuffle }); },

    enqueue(trackId, where = 'last') {
      const q = get().queue;
      set({ queue: { ...q, user: where === 'next' ? [trackId, ...q.user] : [...q.user, trackId] } });
    },
    dequeue(index) {
      const q = get().queue;
      set({ queue: { ...q, user: q.user.filter((_, i) => i !== index) } });
    },
    moveQueued(from, to) {
      const q = get().queue;
      set({ queue: { ...q, user: moveTrack(q.user, from, to) } });
    },
    clearQueued() { set({ queue: { ...get().queue, user: [] } }); },
    shuffleQueued() { const q = get().queue; set({ queue: { ...q, user: shuffleWithRules(q.user, rules()) } }); },
    shuffleRest() { const q = get().queue; set({ queue: { ...q, active: shuffleWithRules(q.active, rules()) } }); },
    keepRest() { const q = get().queue; set({ queue: { ...q, user: [...q.user, ...q.active], active: [] } }); },
    clearRest() { set({ queue: { ...get().queue, active: [] } }); },
  };
});
