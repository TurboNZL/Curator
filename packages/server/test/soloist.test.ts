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
function rig(over: { code?: number } = {}) {
  const children: { child: FakeChild; args: string[] }[] = [];
  let downloads = 0;
  const s = new Soloist(dir, {
    platform: 'linux', arch: 'arm64', restartDelayMs: 5,
    fetchImpl: (async (url: string) => { downloads++; expect(url).toBe('https://soloist-builds.spotifycdn.com/soloist_release_arm64.tar.gz'); return new Response(new Uint8Array([1, 2, 3])); }) as unknown as typeof fetch,
    untar: async (_a, into) => { writeFileSync(join(into, 'soloist'), '#!/bin/sh\n'); },
    version: async () => 'soloist 1.2.3 (built 2026-10-01)',
    spawnImpl: ((_bin: string, args: string[]) => { const child = new FakeChild(); children.push({ child, args }); return child; }) as never,
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
    const b = new Soloist(dir, { platform: 'linux', arch: 'arm64', spawnImpl: ((_b: string, args: string[]) => { const c = new FakeChild(); a.children.push({ child: c, args }); return c; }) as never });
    b.autoStart();
    expect(a.children.length).toBe(1);
    await b.stop();
  });
});
void mkdirSync;
