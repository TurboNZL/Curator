import { autoUpdater } from 'electron-updater';

export type UpdateState = {
  status: 'idle' | 'disabled' | 'checking' | 'none' | 'downloading' | 'ready' | 'error';
  /** the new version, once one is found */
  version?: string; percent?: number; message?: string;
};

/**
 * Self-update from the project's GitHub releases (electron-updater): checks shortly after start and every 6 hours, downloads in the
 * background and installs when the app is closed or when the user presses "Restart to update". Does nothing in development runs.
 */
export const REPO = { owner: 'TurboNZL', repo: 'music-curator' };

export class Updates {
  state: UpdateState = { status: 'idle' };
  private started = false;
  constructor(private readonly packaged: boolean, private readonly onState: (s: UpdateState) => void) {}

  /** A GitHub token with read access to the repository's contents: needed only while the repository is private. Empty clears it. */
  setToken(token: string) {
    const t = token.trim();
    if (t) autoUpdater.setFeedURL({ provider: 'github', ...REPO, private: true, token: t });
    else autoUpdater.setFeedURL({ provider: 'github', ...REPO });
  }

  private set(s: UpdateState) { this.state = s; this.onState(s); }

  start() {
    if (this.started) return; this.started = true;
    if (!this.packaged) { this.set({ status: 'disabled', message: 'Updates work in the installed app, not in a development run.' }); return; }
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('checking-for-update', () => this.set({ status: 'checking' }));
    autoUpdater.on('update-not-available', () => this.set({ status: 'none' }));
    autoUpdater.on('update-available', (i) => this.set({ status: 'downloading', version: i.version, percent: 0 }));
    autoUpdater.on('download-progress', (p) => this.set({ status: 'downloading', version: this.state.version, percent: Math.round(p.percent) }));
    autoUpdater.on('update-downloaded', (i) => this.set({ status: 'ready', version: i.version }));
    autoUpdater.on('error', (e) => this.set({ status: 'error', message: e?.message ?? String(e) }));
    setTimeout(() => void this.check(), 15_000);
    setInterval(() => void this.check(), 6 * 3600_000).unref();
  }

  async check(): Promise<UpdateState> {
    if (!this.packaged) return this.state;
    if (this.state.status === 'downloading' || this.state.status === 'ready') return this.state;
    try { await autoUpdater.checkForUpdates(); } catch (e) { this.set({ status: 'error', message: (e as Error).message }); }
    return this.state;
  }

  install() { if (this.state.status === 'ready') autoUpdater.quitAndInstall(false, true); }
}
