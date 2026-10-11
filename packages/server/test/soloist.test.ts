import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Soloist, archiveName } from '../src/soloist.ts';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'curator-soloist-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** a child process that the test controls */
class FakeChild extends EventEmitter {
  stdout = new EventEmitter(); stderr = new EventEmitter(); killed: string[] = [];
  kill(sig: string) { this.killed.push(sig); queueMicrotask(() => this.emit('close', null)); return true; }
}
function rig(over: { code?: number; sockets?: string[] } = {}) {
  const children: { child: FakeChild; args: string[]; env?: NodeJS.ProcessEnv }[] = [];
  let downloads = 0;
  const s = new Soloist(dir, {
    platform: 'linux', arch: 'arm64', model: 'Raspberry Pi 5 Model B Rev 1.0', hostname: 'curator-pi', restartDelayMs: 5, uid: 998, env: { PATH: '/usr/bin' }, exists: (p) => (over.sockets ?? []).includes(p),
    fetchImpl: (async (url: string) => { downloads++; expect(url).toBe('https://soloist-builds.spotifycdn.com/soloist_release_arm64.tar.gz'); return new Response(new Uint8Array([1, 2, 3])); }) as unknown as typeof fetch,
    untar: async (_a, into) => { writeFileSync(join(into, 'soloist'), '#!/bin/sh\n'); },
    version: async () => 'soloist 1.2.3 (built 2026-10-01)',
    spawnImpl: ((_bin: string, args: string[], opts?: { env?: NodeJS.ProcessEnv }) => { const child = new FakeChild(); children.push({ child, args, env: opts?.env }); return child; }) as never,
  });
  return { s, children, downloads: () => downloads, over };
}

describe('Soloist module', () => {
  it('knows which processors Spotify builds for', () => {
    expect(archiveName('arm64')).toBe('soloist_release_arm64.tar.gz'); expect(archiveName('arm')).toBe('soloist_release_arm32.tar.gz');
    expect(archiveName('x64')).toBe('soloist_release_x86_64.tar.gz'); expect(archiveName('riscv64')).toBeNull();
  });
  it('is not offered on other systems', async () => {
    const s = new Soloist(dir, { platform: 'win32', arch: 'x64' });
    const st = await s.status();
    expect(st.supported).toBe(false); expect(st.reason).toMatch(/Linux/);
    await expect(s.install()).rejects.toThrow(/Linux/);
  });
  it('is offered on a Raspberry Pi only, and says which machine it runs on', async () => {
    const pi = new Soloist(dir, { platform: 'linux', arch: 'arm64', model: 'Raspberry Pi 5 Model B Rev 1.0', hostname: 'curator-pi' });
    expect(await pi.status()).toMatchObject({ supported: true, host: { name: 'curator-pi', model: 'Raspberry Pi 5 Model B Rev 1.0', isPi: true } });
    const pc = new Soloist(dir, { platform: 'linux', arch: 'x64', model: null, hostname: 'desktop-pc', env: {} });
    const st = await pc.status();
    expect(st.supported).toBe(false); expect(st.reason).toMatch(/Raspberry Pi only/); expect(st.reason).toMatch(/desktop-pc/);
    expect(st.host).toMatchObject({ name: 'desktop-pc', isPi: false });
    await expect(pc.install()).rejects.toThrow(/Raspberry Pi/);
    // the desktop app's own server says so in its words, and an owner can allow another Linux machine
    expect((await new Soloist(dir, { platform: 'linux', arch: 'x64', model: null, env: {}, desktop: true }).status()).reason).toMatch(/not in this app/);
    expect((await new Soloist(dir, { platform: 'linux', arch: 'x64', model: null, env: { CURATOR_SOLOIST: '1' } }).status()).supported).toBe(true);
  });
  it('keeps the API key in a private file and never reports it', async () => {
    const { s } = rig();
    s.configure({ deviceName: ' Curator Pi ', apiKey: 'sekret-key' });
    const st = await s.status();
    expect(JSON.stringify(st)).not.toContain('sekret-key');
    expect(st).toMatchObject({ deviceName: 'Curator Pi', hasKey: true, configured: true });
    expect(statSync(join(dir, 'soloist', 'config.json')).mode & 0o077).toBe(0);
    s.configure({ deviceName: 'Renamed' }); // no new key: the stored one stays
    expect(JSON.parse(readFileSync(join(dir, 'soloist', 'config.json'), 'utf8')).apiKey).toBe('sekret-key');
    expect(() => s.configure({ deviceName: '  ' })).toThrow(/name/);
  });
  it('downloads from Spotify, unpacks and reports the version', async () => {
    const { s, downloads } = rig();
    expect((await s.status()).installed).toBe(false);
    await s.install();
    expect(downloads()).toBe(1);
    expect(await s.status()).toMatchObject({ installed: true, version: 'soloist 1.2.3 (built 2026-10-01)', state: 'stopped' });
    expect(existsSync(join(dir, 'soloist', 'dl-'))).toBe(false);
  });
  it('starts with the documented flags, hides the key in its log, and stops', async () => {
    const { s, children } = rig();
    expect(() => s.start()).toThrow(/not installed/);
    await s.install();
    expect(() => s.start()).toThrow(/API key/);
    s.configure({ deviceName: 'Curator', apiKey: 'sekret-key' });
    s.start();
    expect(children[0].args).toEqual(['--device-name', 'Curator', '--api-key', 'sekret-key', '--cache-dir', join(dir, 'soloist', 'cache')]);
    children[0].child.stderr.emit('data', Buffer.from('logged in with sekret-key as Curator\n'));
    const st = await s.status();
    expect(st.running).toBe(true); expect(st.state).toBe('running'); expect(st.log.join(' ')).not.toContain('sekret-key');
    await s.stop();
    expect((await s.status()).running).toBe(false);
  });
  it('hands Soloist the sound session of the account that runs the server', async () => {
    const { s, children } = rig({ sockets: ['/run/user/998/pipewire-0', '/run/user/998/pulse/native'] });
    await s.install(); s.configure({ apiKey: 'k', outputDevice: 'alsa_output.usb-dac' }); s.start();
    expect(children[0].env).toMatchObject({ XDG_RUNTIME_DIR: '/run/user/998', PULSE_SERVER: 'unix:/run/user/998/pulse/native', PATH: '/usr/bin' });
    expect(children[0].args.slice(-2)).toEqual(['--pipewire-device', 'alsa_output.usb-dac']);
    expect((await s.status()).audio).toMatchObject({ ok: true, server: 'pipewire', runtimeDir: '/run/user/998' });
  });
  it('says what is missing when there is no sound server, instead of playing silently', async () => {
    const { s, children } = rig();
    await s.install(); s.configure({ apiKey: 'k' }); s.start();
    const st = await s.status();
    expect(st.audio.ok).toBe(false); expect(st.audio.hint).toMatch(/setup-pi-audio\.sh/);
    expect(st.log.join(' ')).toMatch(/no sound output/i);
    expect(children[0].args).not.toContain('--pipewire-device');
    children[0].child.emit('close', 1);
    expect((await s.status()).message).toMatch(/setup-pi-audio\.sh/);
    await s.stop();
  });
  it('with beaming on, creates the virtual output first and points Soloist at it instead of the speakers', async () => {
    const pactl: string[][] = [];
    const children: { args: string[]; env?: NodeJS.ProcessEnv }[] = [];
    const s = new Soloist(dir, {
      platform: 'linux', arch: 'arm64', model: 'Raspberry Pi 4 Model B', uid: 998, env: {}, exists: (p) => p === '/run/user/998/pipewire-0',
      untar: async (_a, into) => { writeFileSync(join(into, 'soloist'), '#!/bin/sh\n'); }, version: async () => 'v',
      fetchImpl: (async () => new Response(new Uint8Array([1]))) as unknown as typeof fetch,
      pactl: async (a) => { pactl.push(a); return a[0] === 'list' ? '0\talsa_output.x\tmodule-alsa-card.c\ts16le 2ch 44100Hz\tRUNNING\n' : '19'; },
      spawnImpl: ((_b: string, args: string[], o: { env?: NodeJS.ProcessEnv }) => { children.push({ args, env: o.env }); return new FakeChild(); }) as never,
    });
    await s.install(); s.configure({ apiKey: 'k', beam: true, outputDevice: 'ignored-while-beaming' });
    s.start();
    expect(children).toHaveLength(0); // not before the sink exists
    await new Promise((r) => setTimeout(r, 20));
    expect(pactl.map((a) => a.join(' '))).toEqual(['list short sinks', 'load-module module-null-sink sink_name=curator_spotify sink_properties=device.description=Curator-Spotify']);
    expect(children).toHaveLength(1);
    expect(children[0].args.slice(-2)).toEqual(['--pipewire-device', 'curator_spotify']);
    expect(children[0].env).toMatchObject({ PULSE_SINK: 'curator_spotify', XDG_RUNTIME_DIR: '/run/user/998' });
    const st = await s.status();
    expect(st.beam).toMatchObject({ enabled: true, sink: 'ready', streamPath: '/api/soloist/stream' });
    await s.stop();
  });
  it('does not create the virtual output twice, and reports a missing pactl', async () => {
    const calls: string[] = [];
    const s = new Soloist(dir, { platform: 'linux', arch: 'arm64', pactl: async (a) => { calls.push(a[0]); return a[0] === 'list' ? '3\tcurator_spotify\tmodule-null-sink.c\ts16le\tIDLE' : ''; } });
    await s.ensureSink(); expect(calls).toEqual(['list']);
    const none = new Soloist(dir, { platform: 'linux', arch: 'arm64', pactl: async () => { throw new Error('pactl is not installed on this machine'); } });
    await expect(none.ensureSink()).rejects.toThrow();
    expect((await none.status()).beam).toMatchObject({ sink: 'error' });
    expect((await none.status()).beam.sinkMessage).toMatch(/pulseaudio-utils/);
  });
  it('inside the desktop app the missing-sound hint talks about the computer, not the Pi', async () => {
    const s = new Soloist(dir, { platform: 'linux', arch: 'x64', uid: 1000, env: {}, exists: () => false, desktop: true });
    const a = (await s.status()).audio;
    expect(a.ok).toBe(false); expect(a.hint).toMatch(/this computer/); expect(a.hint).not.toMatch(/setup-pi-audio/);
  });
  it('an expired build (exit 10) is replaced and started again', async () => {
    const { s, children, downloads } = rig();
    await s.install(); s.configure({ deviceName: 'Curator', apiKey: 'k' }); s.start();
    children[0].child.emit('close', 10);
    await new Promise((r) => setTimeout(r, 30));
    expect(downloads()).toBe(2);
    expect(children.length).toBe(2);
    expect((await s.status()).running).toBe(true);
  });
  it('a crash restarts it, and it gives up after a few', async () => {
    const { s, children } = rig();
    await s.install(); s.configure({ deviceName: 'Curator', apiKey: 'k' }); s.start();
    for (let i = 0; i < 7; i++) { children.at(-1)!.child.emit('close', 1); await new Promise((r) => setTimeout(r, 15)); }
    expect(children.length).toBeLessThanOrEqual(7);
    const st = await s.status();
    expect(st.state).toBe('error'); expect(st.message).toMatch(/Gave up/);
  });
  it('comes back by itself when the server starts, if it was set up and left on', async () => {
    const a = rig(); await a.s.install(); a.s.configure({ deviceName: 'Curator', apiKey: 'k' });
    const b = new Soloist(dir, { platform: 'linux', arch: 'arm64', model: 'Raspberry Pi 5', spawnImpl: ((_b: string, args: string[]) => { const c = new FakeChild(); a.children.push({ child: c, args }); return c; }) as never });
    b.autoStart();
    expect(a.children.length).toBe(1);
    await b.stop();
  });
});
void mkdirSync;
