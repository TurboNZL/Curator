import { spawn, type ChildProcess } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { arch as osArch, platform as osPlatform } from 'node:os';
import { join } from 'node:path';

/**
 * Spotify Soloist as a module of this server: Spotify's own headless Spotify Connect client for Linux. Installed from Spotify's own download
 * server onto the machine running Curator (it is not redistributed with Curator: Spotify asks that nobody does), it shows up in
 * Spotify's device list under a name you choose, and Curator plays Spotify tracks on it like on any other Spotify device.
 *
 * Facts this follows (Spotify's Soloist documentation, Oct 2026): builds come from
 * https://soloist-builds.spotifycdn.com/soloist_release_<arm64|arm32|x86_64>.tar.gz and contain the `soloist` executable; it needs
 * PipeWire or PulseAudio on the machine, a Premium account's API key (`--api-key`) and a device name (`--device-name`); a build stops working
 * 90 days after it was built and then exits with code 10, so a newer one is downloaded and it is started again. The API key is a secret:
 * it is kept in a 0600 file in the data folder and is never sent back to a client.
 */
export const ARCHIVE_HOST = 'https://soloist-builds.spotifycdn.com';
export const EXPIRED = 10;

/** Node's `process.arch` as the name Spotify gives the archive, or null when Soloist has no build for it. */
export function archiveName(arch: string = osArch()): string | null {
  const a = arch === 'arm64' ? 'arm64' : arch === 'arm' ? 'arm32' : arch === 'x64' ? 'x86_64' : null;
  return a ? `soloist_release_${a}.tar.gz` : null;
}

export interface SoloistConfig { deviceName: string; apiKey: string; autoStart: boolean }
export interface SoloistStatus {
  supported: boolean; reason?: string;
  installed: boolean; version: string | null;
  configured: boolean; deviceName: string; hasKey: boolean; autoStart: boolean;
  running: boolean; state: 'stopped' | 'starting' | 'running' | 'expired' | 'installing' | 'error';
  message: string | null; log: string[];
  downloadsUrl: string;
}

type Spawn = typeof spawn;
export interface SoloistDeps {
  fetchImpl?: typeof fetch; spawnImpl?: Spawn; platform?: string; arch?: string;
  /** unpack a .tar.gz into a folder (test seam; the default runs the system `tar`) */
  untar?: (archive: string, into: string) => Promise<void>;
  /** wait before restarting after a crash */
  restartDelayMs?: number;
  /** run `soloist --version` */
  version?: (bin: string) => Promise<string | null>;
}

const run = (cmd: string, args: string[], spawnImpl: Spawn = spawn): Promise<string> => new Promise((resolve, reject) => {
  let out = '';
  const child = spawnImpl(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  const timer = setTimeout(() => { child.kill(); reject(new Error(`${cmd} took too long`)); }, 60_000);
  child.stdout?.on('data', (d: Buffer) => { out += d.toString(); });
  child.stderr?.on('data', (d: Buffer) => { out += d.toString(); });
  child.on('error', (e: NodeJS.ErrnoException) => { clearTimeout(timer); reject(new Error(e.code === 'ENOENT' ? `${cmd} is not installed on this machine` : e.message)); });
  child.on('close', (code) => { clearTimeout(timer); code === 0 ? resolve(out) : reject(new Error(out.trim().split('\n').pop() || `${cmd} exited ${code}`)); });
});

export class Soloist {
  private readonly dir: string;
  private readonly d: SoloistDeps;
  private child: ChildProcess | null = null;
  private wanted = false;
  private state: SoloistStatus['state'] = 'stopped';
  private message: string | null = null;
  private log: string[] = [];
  private crashes = 0;
  private busy = false;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(dataDir: string, deps: SoloistDeps = {}) { this.dir = join(dataDir, 'soloist'); this.d = deps; }

  private get platform() { return this.d.platform ?? osPlatform(); }
  private get bin() { return join(this.dir, 'soloist'); }
  private get cfgPath() { return join(this.dir, 'config.json'); }

  config(): SoloistConfig {
    try { const c = JSON.parse(readFileSync(this.cfgPath, 'utf8')) as Partial<SoloistConfig>; return { deviceName: c.deviceName ?? 'Curator', apiKey: c.apiKey ?? '', autoStart: c.autoStart ?? true }; }
    catch { return { deviceName: 'Curator', apiKey: '', autoStart: true }; }
  }
  /** Saves the device name and, when one is given, the key. An empty key leaves the stored one alone. */
  configure(o: { deviceName?: string; apiKey?: string; autoStart?: boolean }) {
    const cur = this.config();
    const name = (o.deviceName ?? cur.deviceName).trim().slice(0, 60);
    if (!name) throw new Error('Give the device a name.');
    mkdirSync(this.dir, { recursive: true });
    const next: SoloistConfig = { deviceName: name, apiKey: o.apiKey?.trim() ? o.apiKey.trim() : cur.apiKey, autoStart: o.autoStart ?? cur.autoStart };
    writeFileSync(this.cfgPath, JSON.stringify(next), { mode: 0o600 });
    try { chmodSync(this.cfgPath, 0o600); } catch { /* a filesystem without modes */ }
  }

  support(): { ok: boolean; reason?: string } {
    if (this.platform !== 'linux') return { ok: false, reason: 'Soloist only runs on Linux (a Raspberry Pi or another Linux machine).' };
    if (!archiveName(this.d.arch ?? osArch())) return { ok: false, reason: `Spotify has no Soloist build for this processor (${this.d.arch ?? osArch()}).` };
    return { ok: true };
  }

  async status(): Promise<SoloistStatus> {
    const sup = this.support(), c = this.config(), installed = existsSync(this.bin);
    return {
      supported: sup.ok, reason: sup.reason, installed, version: installed && sup.ok ? await (this.d.version ?? this.readVersion.bind(this))(this.bin).catch(() => null) : null,
      configured: !!c.apiKey, deviceName: c.deviceName, hasKey: !!c.apiKey, autoStart: c.autoStart,
      running: !!this.child, state: this.state, message: this.message, log: this.log.slice(-12), downloadsUrl: 'https://developer.spotify.com/documentation/soloist/reference/downloads-and-updates',
    };
  }
  private async readVersion(bin: string) { return (await run(bin, ['--version'], this.d.spawnImpl)).trim().split('\n')[0] || null; }

  /** Download the newest build for this processor from Spotify's own server and put it in place. Replaces an older build. */
  async install(): Promise<void> {
    const sup = this.support();
    if (!sup.ok) throw new Error(sup.reason);
    if (this.busy) throw new Error('Already installing.');
    this.busy = true; const was = this.state; this.state = 'installing'; this.message = 'Downloading from Spotify…';
    const tmp = join(this.dir, `dl-${Date.now()}`);
    try {
      mkdirSync(tmp, { recursive: true });
      const res = await (this.d.fetchImpl ?? fetch)(`${ARCHIVE_HOST}/${archiveName(this.d.arch ?? osArch())}`, { signal: AbortSignal.timeout(180_000) });
      if (!res.ok) throw new Error(`Spotify's download server answered ${res.status}`);
      const archive = join(tmp, 'soloist.tar.gz');
      writeFileSync(archive, Buffer.from(await res.arrayBuffer()));
      this.message = 'Unpacking…';
      await (this.d.untar ?? ((a, into) => run('tar', ['-xzf', a, '-C', into]).then(() => undefined)))(archive, tmp);
      const found = existsSync(join(tmp, 'soloist')) ? join(tmp, 'soloist') : null;
      if (!found) throw new Error('The download did not contain a soloist program.');
      chmodSync(found, 0o755);
      const running = !!this.child;
      if (running) await this.stop();
      renameSync(found, this.bin);
      this.message = 'Installed.'; this.state = 'stopped';
      if (running || (was === 'expired' && this.wanted)) this.start();
    } catch (e) { this.state = 'error'; this.message = (e as Error).message; throw e; }
    finally { rmSync(tmp, { recursive: true, force: true }); this.busy = false; }
  }

  uninstall() { void this.stop(); rmSync(this.dir, { recursive: true, force: true }); this.state = 'stopped'; this.message = null; this.log = []; }

  /** Start the daemon (and keep it running: crashes restart it, an expired build is replaced). */
  start(): void {
    const sup = this.support();
    if (!sup.ok) throw new Error(sup.reason);
    if (!existsSync(this.bin)) throw new Error('Soloist is not installed yet.');
    const c = this.config();
    if (!c.apiKey) throw new Error('Paste your Soloist API key first.');
    if (this.child) return;
    this.wanted = true; this.state = 'starting'; this.message = null;
    mkdirSync(join(this.dir, 'cache'), { recursive: true });
    const child = (this.d.spawnImpl ?? spawn)(this.bin, ['--device-name', c.deviceName, '--api-key', c.apiKey, '--cache-dir', join(this.dir, 'cache')], { stdio: ['ignore', 'pipe', 'pipe'] });
    this.child = child;
    const keep = (d: Buffer) => {
      for (const line of d.toString().split('\n').map((l) => l.trim()).filter(Boolean)) this.log.push(line.replaceAll(c.apiKey, '•••').slice(0, 300));
      this.log = this.log.slice(-40);
      if (this.state === 'starting') this.state = 'running';
    };
    child.stdout?.on('data', keep); child.stderr?.on('data', keep);
    setTimeout(() => { if (this.child === child && this.state === 'starting') this.state = 'running'; this.crashes = this.child === child ? 0 : this.crashes; }, 8000).unref?.();
    child.on('error', (e: NodeJS.ErrnoException) => { this.child = null; this.state = 'error'; this.message = e.code === 'ENOENT' ? 'The soloist program could not be started.' : e.message; });
    child.on('close', (code) => {
      if (this.child !== child) return;
      this.child = null;
      if (!this.wanted) { this.state = 'stopped'; return; }
      if (code === EXPIRED) {
        // the build ran out (they last 90 days): fetch the current one and start again
        this.state = 'expired'; this.message = 'This build of Soloist expired; downloading a newer one…';
        void this.install().catch((e: Error) => { this.state = 'error'; this.message = `Could not update Soloist: ${e.message}`; });
        return;
      }
      this.crashes++;
      this.message = `Soloist stopped (exit ${code}). ${/audio|pulse|pipewire/i.test(this.log.join(' ')) ? 'It needs PipeWire or PulseAudio on this machine.' : this.log.at(-1) ?? ''}`.trim();
      if (this.crashes > 5) { this.state = 'error'; this.wanted = false; this.message += ' Gave up after 5 tries.'; return; }
      this.state = 'starting';
      this.timer = setTimeout(() => { if (this.wanted && !this.child) { try { this.start(); } catch (e) { this.state = 'error'; this.message = (e as Error).message; } } }, this.d.restartDelayMs ?? 5000);
    });
  }

  stop(): Promise<void> {
    this.wanted = false; clearTimeout(this.timer);
    const c = this.child;
    if (!c) { this.state = 'stopped'; return Promise.resolve(); }
    return new Promise((resolve) => { c.once('close', () => resolve()); c.kill('SIGTERM'); setTimeout(() => { if (this.child === c) c.kill('SIGKILL'); resolve(); }, 4000).unref?.(); });
  }

  /** On server start: bring it up again when it was set up and left on. */
  autoStart(): void { try { if (this.support().ok && existsSync(this.bin) && this.config().apiKey && this.config().autoStart) this.start(); } catch { /* shown in status */ } }
}
