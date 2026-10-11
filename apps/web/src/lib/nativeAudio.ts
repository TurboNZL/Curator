import type { EqConfig } from './eqPresets.ts';

/**
 * The Android app's own player (apps/android NativeAudio): inside the app the page hands the current track and the next few to it
 * instead of playing them in an <audio> element, which gets the notification with controls, lock-screen and Bluetooth/car buttons,
 * and keeps playing when the page is suspended. It reports back with `curator-audio` events. Absent in browsers and in app
 * versions from before this existed (then the page plays the sound itself, as it always did).
 */
interface Bridge {
  audioSync?(json: string): void; audioPlay?(): void; audioPause?(): void; audioSeek?(ms: number): void; audioVolume?(v: number): void; audioStop?(): void;
  audioState?(): string; setEq?(json: string): void;
}
const bridge = (): Bridge | undefined => (typeof window === 'undefined' ? undefined : (window as unknown as { CuratorAndroid?: Bridge }).CuratorAndroid);

export const nativeAudioAvailable = () => typeof bridge()?.audioSync === 'function';

export interface NativeItem { id: string; key: string; url: string; title: string; artist: string; album: string; art?: string }
export interface NativeSync { currentId: string; positionMs: number; play: boolean; hard: boolean; items: NativeItem[] }

export type NativeEvent =
  | { t: 'state'; id: string; playing: boolean; pos: number; dur: number; buffering: boolean }
  | { t: 'index'; id: string; ids: string[]; reason: 'auto' | 'seek' | 'playlist' | 'repeat' }
  | { t: 'ended'; id: string }
  /** the notification, a headset or the car pressed Next/Previous and the app's player has no neighbour left: the page decides */
  | { t: 'next' } | { t: 'prev' }
  | { t: 'error'; id?: string; code?: string; message: string };

export const nativeAudio = {
  sync: (s: NativeSync) => bridge()?.audioSync?.(JSON.stringify(s)),
  play: () => bridge()?.audioPlay?.(),
  pause: () => bridge()?.audioPause?.(),
  seek: (seconds: number) => bridge()?.audioSeek?.(Math.round(seconds * 1000)),
  volume: (v: number) => bridge()?.audioVolume?.(v),
  stop: () => bridge()?.audioStop?.(),
  state: (): NativeEvent | null => { try { const s = JSON.parse(bridge()?.audioState?.() ?? '{}') as NativeEvent; return s.t === 'state' ? s : null; } catch { return null; } },
  setEq: (c: EqConfig) => { try { bridge()?.setEq?.(JSON.stringify(c)); } catch { /* older app */ } },
  on(cb: (e: NativeEvent) => void): () => void {
    const h = (e: Event) => cb((e as CustomEvent<NativeEvent>).detail);
    window.addEventListener('curator-audio', h);
    return () => window.removeEventListener('curator-audio', h);
  },
};
