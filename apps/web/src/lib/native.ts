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
  /** a GitHub token for updates from a private repository */
  hasToken(): Promise<boolean>;
  setToken(token: string): Promise<void>;
  onState(cb: (s: UpdateState) => void): () => void;
}

/** What the Android app puts on `window` (a Java interface: strings only, so results come back as JSON and updates as events). */
interface AndroidBridge { setServer(url: string, token: string): void; version(): string; updateState(): string; checkForUpdate(): void; installUpdate(): void; hasUpdateToken(): boolean; setUpdateToken(t: string): void;
  // newer app versions only
  webClientState?(): string; webClientVersion?(): string; updateWebClient?(): void; reloadWebClient?(): void; useBundledWebClient?(): void }
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
    hasToken: async () => a.hasUpdateToken(),
    setToken: async (t) => a.setUpdateToken(t),
    onState: (cb) => {
      const h = (e: Event) => cb((e as CustomEvent<UpdateState>).detail);
      window.addEventListener('curator-update', h);
      return () => window.removeEventListener('curator-update', h);
    },
  };
}

/** Tells the Android app which server this device uses, so Android Auto browses the same library. No effect elsewhere. */
export function syncNativeServer(serverUrl: string, token: string): void {
  try { android()?.setServer(serverUrl, token); } catch { /* not in the app */ }
}

/** Updating the web client of the Android app from the user's server, without installing a new APK. Null outside the app (or in an app too old to do it). */
export interface WebClientUpdates {
  state(): UpdateState;
  /** the build the app currently shows from the server ('' = the one bundled in the APK) */
  version(): string;
  update(): void;
  reload(): void;
  useBundled(): void;
  onState(cb: (s: UpdateState) => void): () => void;
}
export function webClientUpdates(): WebClientUpdates | null {
  const a = android();
  if (!a?.updateWebClient || !a.webClientState) return null;
  return {
    state: () => { try { return JSON.parse(a.webClientState!()) as UpdateState; } catch { return { status: 'idle' }; } },
    version: () => a.webClientVersion?.() ?? '',
    update: () => a.updateWebClient!(),
    reload: () => a.reloadWebClient?.(),
    useBundled: () => a.useBundledWebClient?.(),
    onState: (cb) => {
      const h = (e: Event) => cb((e as CustomEvent<UpdateState>).detail);
      window.addEventListener('curator-webclient', h);
      return () => window.removeEventListener('curator-webclient', h);
    },
  };
}
