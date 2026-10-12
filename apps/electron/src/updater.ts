import { autoUpdater } from 'electron-updater';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import { debInstallScript, describePkexec, manualInstallCommand } from './debInstall.ts';
import { describeError } from './updateErrors.ts';

export type { UpdateState } from './updateErrors.ts';
import type { UpdateState } from './updateErrors.ts';

/**
 * Self-update from the project's GitHub releases (electron-updater): checks shortly after start and every 6 hours, downloads in the
 * background and installs when the app is closed or when the user presses "Restart to update". Does nothing in development runs.
 */
export const REPO = { owner: 'TurboNZL', repo: 'Curator' };

export class Updates {
  state: UpdateState = { status: 'idle' };
  private started = false;
  private debFile: string | null = null;
  private installing = false;
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
    // the project's releases are often marked pre-release, which the default "latest stable" lookup ignores
    autoUpdater.allowPrerelease = true;
    autoUpdater.autoDownload = true;
    // a .deb install needs root, which electron-updater asks for with a blocking pkexec call (it freezes the app and fails
    // without a polkit agent), also when quitting. Those installs are done by install() below instead; AppImage, Windows and macOS are unchanged.
    autoUpdater.autoInstallOnAppQuit = !this.isDeb();
    autoUpdater.on('checking-for-update', () => this.set({ status: 'checking' }));
    autoUpdater.on('update-not-available', () => this.set({ status: 'none' }));
    autoUpdater.on('update-available', (i) => this.set({ status: 'downloading', version: i.version, percent: 0 }));
    autoUpdater.on('download-progress', (p) => this.set({ status: 'downloading', version: this.state.version, percent: Math.round(p.percent) }));
    autoUpdater.on('update-downloaded', (i) => { this.debFile = i.downloadedFile ?? null; this.set({ status: 'ready', version: i.version }); });
    autoUpdater.on('error', (e) => this.set(describeError(e?.message ?? String(e))));
    setTimeout(() => void this.check(), 15_000);
    setInterval(() => void this.check(), 6 * 3600_000).unref();
  }

  async check(): Promise<UpdateState> {
    if (!this.packaged) return this.state;
    if (this.state.status === 'downloading' || this.state.status === 'ready') return this.state;
    try { await autoUpdater.checkForUpdates(); } catch (e) { this.set(describeError((e as Error).message)); }
    return this.state;
  }

  /** electron-builder writes the package type (deb, rpm, ...) next to the app; an AppImage has none and needs no root. */
  private isDeb(): boolean {
    if (process.platform !== 'linux' || process.env.APPIMAGE) return false;
    try { return readFileSync(join(process.resourcesPath, 'package-type'), 'utf8').trim() === 'deb'; } catch { return false; }
  }

  install() {
    if (this.state.status !== 'ready' || this.installing) return;
    if (this.isDeb() && this.debFile && existsSync(this.debFile)) void this.installDeb(this.debFile);
    else autoUpdater.quitAndInstall(false, true);
  }

  /** pkexec runs in the background, so the window stays alive while the password prompt is open; the app restarts only once dpkg succeeded. */
  private async installDeb(file: string) {
    this.installing = true;
    const version = this.state.version;
    this.set({ status: 'ready', version, installing: true, message: 'Waiting for your password…' });
    const result = await new Promise<ReturnType<typeof describePkexec>>((resolve) => {
      let err = '';
      const child = spawn('pkexec', ['/bin/sh', '-c', debInstallScript(file)], { stdio: ['ignore', 'ignore', 'pipe'] });
      child.stderr.on('data', (d) => { err += String(d); });
      child.on('error', (e) => resolve({ ok: false, cancelled: false, message: `pkexec could not be started (${e.message}). Install it from a terminal instead:` }));
      child.on('close', (code) => resolve(describePkexec(code, err)));
    });
    this.installing = false;
    if (result.ok) { app.relaunch(); app.exit(0); return; }
    this.set({ status: 'ready', version, message: `${result.message}${result.cancelled ? '' : ' (The AppImage build updates itself without ever asking for a password.)'}`, command: result.cancelled ? undefined : manualInstallCommand(file) });
  }
}
