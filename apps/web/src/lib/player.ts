import { create } from 'zustand';
import { advance, newId, pushHistory, type PlaybackSnapshot, shuffleWithRules, startTrack, type PlaybackLogData, type QueueState, type SourceType } from '@curator/core';
import { moveTrack } from './defaults.ts';
import { audioSource, imageSource, localAudio, streamUrl } from './files.ts';
import { nativeAudio, nativeAudioAvailable, type NativeEvent, type NativeItem } from './nativeAudio.ts';
import { getLibrary } from './derive.ts';
import { useStore } from './store.ts';
import { resumeEq, setEq } from './eq.ts';
import { eqConfig } from './eqConfig.ts';
import { isFlat } from './eqPresets.ts';

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
  /** pause without losing the position (a ranking preview does this) */
  pause(): void;
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
  /** the state other devices see, and the way for one of them to hand playback to this device (Connect) */
  snapshot(): PlaybackSnapshot;
  restore(snap: PlaybackSnapshot, opts?: { play?: boolean }): void;
  /** push the device's equaliser settings into the sound (creates the audio element if needed) */
  applyEq(): void;
}

let audio: HTMLAudioElement | null = null;
let loadSeq = 0;
let objectUrl: string | null = null;
/** where to jump to once the next track's metadata is known (a hand-over from another device) */
let pendingSeek: number | null = null;
let artUrl: string | null = null;
/** true while the Android app's own player (lib/nativeAudio.ts) plays the current track instead of the <audio> element */
let native = false;
/** files the app's player could not play: those go through the page's own <audio> instead */
const nativeBad = new Set<string>();
const NATIVE_AHEAD = 12;
let refreshNative: () => void = () => {};
const lib = getLibrary;
const rules = () => lib().rules;

export const usePlayer = create<PlayerState>((set, get) => {
  const el = () => {
    if (audio) return audio;
    audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous'; // the equaliser reads the sound; the server answers with CORS headers
    audio.addEventListener('play', resumeEq);
    audio.addEventListener('timeupdate', () => { if (!native) set({ time: audio!.currentTime }); });
    audio.addEventListener('durationchange', () => !native && set({ duration: Number.isFinite(audio!.duration) ? audio!.duration : 0 }));
    audio.addEventListener('play', () => { if (!native) set({ playing: true }); });
    audio.addEventListener('pause', () => { if (!native) set({ playing: false }); });
    audio.addEventListener('ended', () => { if (native) return; logPlay(false); get().next(); });
    audio.addEventListener('error', () => {
      if (!audio!.getAttribute('src')) return;
      const code = audio!.error?.code;
      set({ error: `Could not load this track${code ? ` (media error ${code})` : ''}`, playing: false });
    });
    audio.volume = get().volume;
    const eq = useStore.getState().settings;
    setEq(audio, eqConfig(eq));
    return audio;
  };

  /** playbackLogs are append-only; skips are logged too so stats can tell them apart */
  const position = () => (native ? get().time : audio?.currentTime ?? get().time);

  function logPlay(isSkip: boolean) {
    const id = get().queue.currentId;
    if (!id || (!audio && !native)) return;
    const dur = position();
    if (dur < 1) return;
    const s = get().source;
    const data: PlaybackLogData = { trackId: id, timestamp: Date.now(), duration: dur, sourceType: s.type, sourceId: s.id, isSkip };
    useStore.getState().put('playbackLogs', data);
  }

  /** Can the Android app's own player play this track? (needs the server's address, and no copy that only this page holds) */
  function nativeCan(file: string | null | undefined): boolean {
    if (!file || !nativeAudioAvailable() || nativeBad.has(file)) return false;
    if (useStore.getState().audioCache[file]) return false;
    return /^https?:/i.test(streamUrl(file));
  }

  function nativeItem(id: string): NativeItem | null {
    const t = lib().trackById.get(id);
    if (!t?.file || !nativeCan(t.file)) return null;
    return { id, key: t.file, url: streamUrl(t.file), title: t.title, artist: t.artistName, album: t.albumTitle ?? '', art: t.cover ? streamUrl(t.cover) : undefined };
  }

  /** The playing track with the one before it and the next few, in the order the queue and its rules will play them. */
  function nativeWindow(): NativeItem[] | null {
    const q = get().queue;
    if (!q.currentId) return null;
    const cur = nativeItem(q.currentId);
    if (!cur) return null;
    const out: NativeItem[] = [];
    const before = get().history[get().history.length - 1];
    const prev = before ? nativeItem(before) : null;
    if (prev) out.push(prev);
    out.push(cur);
    let sim = q;
    for (let i = 0; i < NATIVE_AHEAD; i++) {
      sim = advance(sim, rules(), get().source.type);
      if (!sim.currentId) break;
      const t = lib().trackById.get(sim.currentId);
      if (!t?.file) continue; // the page skips tracks without audio too
      const item = nativeItem(sim.currentId);
      if (!item) break; // a track only this page can play: the page takes over when the app's player gets there
      out.push(item);
    }
    return out;
  }

  function syncNative(hard: boolean, play = true, positionMs = 0) {
    const items = nativeWindow();
    const currentId = get().queue.currentId;
    if (!items || !currentId) return;
    nativeAudio.sync({ currentId, positionMs, play, hard, items });
  }

  /** Stop whichever engine is not the one about to play, so two never sound at once. */
  function useEngine(which: 'native' | 'web') {
    if (which === 'native') {
      if (audio && !audio.paused) audio.pause();
      if (audio && audio.getAttribute('src')) { audio.removeAttribute('src'); audio.load(); }
      if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
    } else if (native) nativeAudio.stop();
    native = which === 'native';
  }

  function load(trackId: string | null, autoStart = true) {
    const seq = ++loadSeq; // a newer load supersedes one still resolving its source
    if (!trackId) {
      if (native) nativeAudio.stop();
      native = false;
      if (audio) { audio.pause(); audio.removeAttribute('src'); }
      set({ time: 0, duration: 0, playing: false, error: null });
      return true;
    }
    const track = lib().trackById.get(trackId);
    if (!track?.file) return false;
    set({ error: null, time: 0 });
    const file = track.file;
    void (async () => {
      // the app's own player streams from the server; a copy kept on this device (or not uploaded yet) is played by the page
      if (nativeCan(file) && !(await localAudio(file).then((u) => { if (u) URL.revokeObjectURL(u); return !!u; }))) {
        if (seq !== loadSeq) return;
        useEngine('native');
        const at = pendingSeek ?? 0; pendingSeek = null;
        set({ time: at, playing: autoStart });
        syncNative(true, autoStart, Math.round(at * 1000));
        return;
      }
      useEngine('web');
      const a = el();
      const { url, local } = await audioSource(file);
      if (seq !== loadSeq) { if (local) URL.revokeObjectURL(url); return; }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = local ? url : null;
      a.src = url;
      if (pendingSeek != null) {
        const at = pendingSeek; pendingSeek = null;
        a.addEventListener('loadedmetadata', () => { a.currentTime = Math.min(at, Number.isFinite(a.duration) ? a.duration : at); set({ time: a.currentTime }); }, { once: true });
      }
      if (autoStart) void a.play().catch((e: Error) => set(e?.name === 'NotAllowedError' ? { playing: false, error: 'Press play: this browser blocked starting by itself.' } : { playing: false }));
    })().catch((e: Error) => { if (seq === loadSeq) set({ error: `Could not load this track (${e.message})`, playing: false }); });
    updateMediaSession(trackId);
    return true;
  }

  /** The app's player moved to another track by itself (the track ended, or Next/Previous in the notification, a headset or the car). Follow it. */
  function followNative(id: string, ids: string[], reason: string) {
    const trackId = id.startsWith('t/') ? id.split('/')[1] : id; // Android Auto's own ids
    const q = get().queue;
    if (!trackId || q.currentId === trackId) return;
    const source = get().source.type;
    let sim = q, history = get().history, steps = 0;
    while (sim.currentId !== trackId && steps++ < 30) {
      const left = sim.currentId;
      sim = advance(sim, rules(), source);
      history = pushHistory(history, left);
      if (!sim.currentId) break;
    }
    if (sim.currentId === trackId) {
      logPlay(reason !== 'auto');
      set({ queue: sim, history, time: 0, error: null });
    } else if (get().history[get().history.length - 1] === trackId) {
      logPlay(true);
      set({ history: get().history.slice(0, -1), time: 0, error: null, queue: { ...q, currentId: trackId, user: q.currentId ? [q.currentId, ...q.user] : q.user } });
    } else {
      // chosen somewhere else (Android Auto): carry on with what the app's player has queued
      const rest = ids.map((x) => (x.startsWith('t/') ? x.split('/')[1] : x));
      const at = rest.indexOf(trackId);
      if (get().queue.currentId) logPlay(true);
      set({ queue: { currentId: trackId, user: [], active: at >= 0 ? rest.slice(at + 1) : [] }, history: pushHistory(get().history, q.currentId), time: 0, error: null });
    }
    updateMediaSession(trackId);
  }

  function onNative(e: NativeEvent) {
    if (e.t === 'state') {
      if (!native) {
        // a page that was recreated while the app kept playing: show what is playing
        if (e.id && !get().queue.currentId && e.playing) { native = true; followNative(e.id, [e.id], 'adopt'); } else return;
      }
      set({ playing: e.playing, time: e.pos / 1000, duration: e.dur / 1000 });
    } else if (e.t === 'index') {
      if (native || !get().queue.currentId) { native = true; followNative(e.id, e.ids, e.reason); }
    } else if (e.t === 'next') {
      if (get().queue.currentId) get().next();
    } else if (e.t === 'prev') {
      if (get().queue.currentId) get().prev();
    } else if (e.t === 'ended') {
      if (!native) return;
      logPlay(false);
      get().next();
    } else if (e.t === 'error') {
      const file = e.id ? lib().trackById.get(e.id)?.file : null;
      if (native && file && e.id === get().queue.currentId && !nativeBad.has(file)) {
        // the app's player could not play it: try the page's own way once
        nativeBad.add(file);
        const at = get().time;
        pendingSeek = at > 1 ? at : null;
        load(e.id!, true);
      } else if (native) set({ error: `Could not load this track (${e.message})`, playing: false });
    }
  }

  function updateMediaSession(trackId: string) {
    if (!('mediaSession' in navigator)) return;
    const t = lib().trackById.get(trackId);
    if (!t) return;
    const meta = new MediaMetadata({ title: t.title, artist: t.artistName, album: t.albumTitle ?? '' });
    navigator.mediaSession.metadata = meta;
    // the lock screen / notification cover: 540 px is the size covers are stored at
    if (t.cover) void imageSource(t.cover).then(({ url, local }) => {
      if (lib().trackById.get(trackId) !== t || get().queue.currentId !== trackId) { if (local) URL.revokeObjectURL(url); return; }
      if (artUrl) URL.revokeObjectURL(artUrl);
      artUrl = local ? url : null;
      meta.artwork = [{ src: url, sizes: '540x540', type: 'image/jpeg' }];
    });
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

  // what the app's own player is told when the queue changes underneath it (queued, removed, reshuffled): the neighbours are replaced, the sound is not interrupted
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  refreshNative = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => { if (native) syncNative(false, get().playing, Math.round(get().time * 1000)); }, 80);
  };
  if (typeof window !== 'undefined') nativeAudio.on(onNative);

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
      if (!get().queue.currentId) return;
      if (native) { if (get().playing) { nativeAudio.pause(); set({ playing: false }); } else { nativeAudio.play(); set({ playing: true }); } return; }
      const a = el();
      if (a.paused) void a.play(); else a.pause();
    },

    pause() { if (native) { nativeAudio.pause(); set({ playing: false }); } else if (audio) audio.pause(); },

    next() {
      const q = get().queue;
      if (native || (audio && !audio.ended)) logPlay(true);
      set({ history: pushHistory(get().history, q.currentId) });
      go(advance(q, rules(), get().source.type));
    },

    prev() {
      const h = get().history;
      if (position() > 3 || !h.length) { if (native) { nativeAudio.seek(0); set({ time: 0 }); } else el().currentTime = 0; return; }
      const id = h[h.length - 1];
      const q = get().queue;
      set({ history: h.slice(0, -1) });
      go({ ...q, currentId: id, user: q.currentId ? [q.currentId, ...q.user] : q.user });
    },

    seek(t) { if (native) nativeAudio.seek(t); else el().currentTime = t; set({ time: t }); },
    setVolume(v) { el().volume = v; nativeAudio.volume(v); try { localStorage.setItem('curator.volume', String(v)); } catch { /* ignore */ } set({ volume: v }); },
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
    snapshot() {
      const s = get();
      return {
        trackId: s.queue.currentId, queue: s.queue, source: s.source, history: s.history.slice(-50),
        position: position(), duration: s.duration, playing: s.playing, volume: s.volume,
      };
    },

    restore(snap, opts) {
      const want = opts?.play ?? snap.playing;
      set({ source: snap.source as Source, history: snap.history, volume: snap.volume, queue: snap.queue });
      if (audio) audio.volume = snap.volume;
      if (!snap.queue.currentId) { load(null); return; }
      pendingSeek = snap.position;
      if (!load(snap.queue.currentId, want)) { pendingSeek = null; set({ error: 'This device has no audio for that track yet' }); }
      else set({ time: snap.position });
    },

    applyEq() { setEq(el(), eqConfig(useStore.getState().settings)); },
  };
});

// the queue changed while the app's player is playing: tell it about its neighbours
usePlayer.subscribe((s, prev) => { if (native && (s.queue !== prev.queue || s.history !== prev.history)) refreshNative(); });

// the equaliser is device-wide: apply it as soon as it changes (the page's own graph and, in the Android app, the phone's equaliser)
let lastEq = '';
const pushEq = (settings: ReturnType<typeof useStore.getState>['settings']) => {
  const cfg = eqConfig(settings);
  const key = JSON.stringify(cfg);
  if (key === lastEq) return;
  lastEq = key;
  nativeAudio.setEq(cfg);
  if (audio || !isFlat(cfg)) usePlayer.getState().applyEq();
};
useStore.subscribe((s) => pushEq(s.settings));
pushEq(useStore.getState().settings);
