import { desktop } from './settings.ts';

/** How far the self-update of an installed app (the desktop app or the Android app) has got. */
export type UpdateState = {
  status: 'idle' | 'disabled' | 'checking' | 'none' | 'downloading' | 'ready' | 'error';
  version?: string; percent?: number; message?: string;
};

export interface NativeUpdates {
  state(): Promise<UpdateState>;
  check(): Promise<UpdateState>;
  /** restart the app on the new version (desktop) or open the installer (Android) */
  install(): void;
  onState(cb: (s: UpdateState) => void): () => void;
}

/** What the Android app puts on `window` (a Java interface: strings only, so results come back as JSON and updates as events). */
interface AndroidBridge { version(): string; updateState(): string; checkForUpdate(): void; installUpdate(): void }
const android = (): AndroidBridge | undefined => (typeof window === 'undefined' ? undefined : (window as unknown as { CuratorAndroid?: AndroidBridge }).CuratorAndroid);

export const isAndroidApp = () => !!android();
export const appVersion = (): string | null => desktop()?.version ?? android()?.version() ?? null;

export function nativeUpdates(): NativeUpdates | null {
  const d = desktop();
  if (d?.updates) return d.updates;
  const a = android();
  if (!a) return null;
  const read = (): UpdateState => { try { return JSON.parse(a.updateState()) as UpdateState; } catch { return { status: 'idle' }; } };
  return {
    state: async () => read(),
    check: async () => { a.checkForUpdate(); return read(); },
    install: () => a.installUpdate(),
    onState: (cb) => {
      const h = (e: Event) => cb((e as CustomEvent<UpdateState>).detail);
      window.addEventListener('curator-update', h);
      return () => window.removeEventListener('curator-update', h);
    },
  };
}
