import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, lstatSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assessHealth, collectHealth, diskProbe, parseMeminfo, parseThrottled, type HealthSnapshot } from '../src/health.ts';
import { StorageMover, checkTarget, describeStorage, moveStorage, StorageError } from '../src/storage.ts';
import { findTunnelToken, tokenFromText } from '../src/tunnel.ts';
import { withCacheDir } from '../src/config.ts';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'curator-health-')); mkdirSync(join(dir, 'data', 'files', 'ab'), { recursive: true }); mkdirSync(join(dir, 'data', 'tmp')); mkdirSync(join(dir, 'data', 'cache')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const snap = (over: Partial<HealthSnapshot> = {}): HealthSnapshot => ({
  at: 0, host: 'pi', platform: 'linux', arch: 'arm64', node: 'v22', uptimeS: 1, processUptimeS: 1,
  cpu: { cores: 4, load1: 0.1, load5: 0.1, load15: 0.1 }, memory: { totalBytes: 4e9, availableBytes: 2e9, rssBytes: 1e8 }, swap: null, tempC: 45, throttle: null,
  disks: [{ label: 'Library files', path: '/mnt/hdd/files', freeBytes: 500e9, totalBytes: 1e12, device: 2, system: false }, { label: 'System', path: '/', freeBytes: 20e9, totalBytes: 30e9, device: 1, system: true }],
  probe: { writeMs: 12, readMs: 1 }, db: { bytes: 5e6, walBytes: 1e6 }, ...over });

describe('reading the machine', () => {
  it('decodes vcgencmd get_throttled', () => {
    expect(parseThrottled('throttled=0x0\n')).toMatchObject({ raw: 0, underVoltage: false, underVoltageEver: false });
    expect(parseThrottled('throttled=0x50005')).toMatchObject({ underVoltage: true, throttled: true, underVoltageEver: true, throttledEver: true, frequencyCapped: false });
    expect(parseThrottled('command not found')).toBeNull();
  });
  it('reads memory and swap from /proc/meminfo', () => {
    const r = parseMeminfo('MemTotal: 4000000 kB\nMemAvailable:  1000000 kB\nSwapTotal: 2000 kB\nSwapFree: 500 kB\n');
    expect(r.availableBytes).toBe(1000000 * 1024);
    expect(r.swap).toEqual({ totalBytes: 2000 * 1024, usedBytes: 1500 * 1024 });
    expect(parseMeminfo('')).toEqual({ availableBytes: null, swap: null });
  });
  it('collects a real snapshot on this machine, with a probe that leaves nothing behind', async () => {
    const h = await collectHealth(join(dir, 'data'));
    expect(h.cpu.cores).toBeGreaterThan(0); expect(h.memory.totalBytes).toBeGreaterThan(0);
    expect(h.disks.some((d) => d.label === 'Library files' && d.totalBytes > 0)).toBe(true);
    expect(h.probe).not.toBeNull();
    expect(readdirSync(join(dir, 'data', 'tmp'))).toEqual([]);
  });
  it('does not write again within 30 seconds', () => {
    const d = join(dir, 'data', 'tmp');
    const a = diskProbe(d, 1_000_000); const b = diskProbe(d, 1_000_000 + 10_000);
    expect(b).toBe(a);
  });
});

describe('what deserves a warning', () => {
  it('a healthy Pi has none', () => expect(assessHealth(snap())).toEqual([]));
  it('low disk, heat, a weak supply and memory are named', () => {
    const w = assessHealth(snap({
      disks: [{ label: 'Library files', path: '/mnt/hdd/files', freeBytes: 0.4e9, totalBytes: 1e12, device: 2, system: false }],
      tempC: 83, throttle: { raw: 0x1, underVoltage: true, frequencyCapped: false, throttled: false, softTempLimit: false, underVoltageEver: false, throttledEver: false },
      memory: { totalBytes: 4e9, availableBytes: 2e8, rssBytes: 1e8 } }));
    expect(w.map((x) => x.id).sort()).toEqual(['disk-Library files', 'memory', 'temp', 'undervoltage']);
    expect(w.every((x) => x.level === 'bad')).toBe(true);
  });
  it('says so when the library is on the SD card, and when the disk is slow', () => {
    const w = assessHealth(snap({ disks: [{ label: 'Library files', path: '/home/curator/data/files', freeBytes: 20e9, totalBytes: 30e9, device: 1, system: true }], probe: { writeMs: 900, readMs: 2 } }));
    expect(w.map((x) => x.id).sort()).toEqual(['sd-card', 'slow-disk']);
  });
});

describe('tunnel token', () => {
  const token = 'eyJhIjoiMTIzNDU2Nzg5MDEyMzQ1Njc4OTAiLCJ0IjoiYWJjZGVmMDEtMjM0NS02Nzg5LWFiY2QtZWYwMTIzNDU2NzgiLCJzIjoic2VjcmV0c2VjcmV0c2VjcmV0c2VjcmV0In0=';
  it('is read from a cloudflared service file', () => {
    expect(tokenFromText(`ExecStart=/usr/bin/cloudflared --no-autoupdate tunnel run --token ${token}`)).toBe(token);
    expect(tokenFromText(`Environment="TUNNEL_TOKEN=${token}"`)).toBe(token);
    expect(tokenFromText('ExecStart=/usr/bin/node')).toBeNull();
  });
  it('is found in the environment, the data folder or an installed service, in that order', () => {
    mkdirSync(join(dir, 'units'));
    expect(findTunnelToken(join(dir, 'data'), {}, [join(dir, 'units')])).toEqual({ found: false });
    writeFileSync(join(dir, 'units', 'cloudflared.service'), `ExecStart=cloudflared tunnel run --token ${token}`);
    expect(findTunnelToken(join(dir, 'data'), {}, [join(dir, 'units')])).toMatchObject({ found: true, token });
    writeFileSync(join(dir, 'data', 'tunnel-token'), 'B'.repeat(80));
    expect(findTunnelToken(join(dir, 'data'), {}, [join(dir, 'units')]).token).toBe('B'.repeat(80));
    expect(findTunnelToken(join(dir, 'data'), { CURATOR_TUNNEL_TOKEN: 'C'.repeat(80) }, []).token).toBe('C'.repeat(80));
  });
});

describe('moving where things are stored', () => {
  const data = () => join(dir, 'data');
  const put = (rel: string, body: string) => { mkdirSync(join(data(), 'files', rel, '..'), { recursive: true }); writeFileSync(join(data(), 'files', rel), body); };

  it('describes the three folders', () => {
    const e = describeStorage(data());
    expect(e.map((x) => x.kind)).toEqual(['files', 'tmp', 'cache']);
    expect(e.every((x) => !x.moved && x.totalBytes > 0)).toBe(true);
  });
  it('refuses a bad target with a reason', () => {
    expect(() => checkTarget(data(), 'files', 'relative/dir')).toThrow(/full path/);
    expect(() => checkTarget(data(), 'files', join(data(), 'files', 'inner'))).toThrow(/outside/);
    mkdirSync(join(dir, 'full')); writeFileSync(join(dir, 'full', 'x'), '1');
    expect(() => checkTarget(data(), 'files', join(dir, 'full'))).toThrow(/not empty/);
  });
  it('copies across disks, verifies, swaps the link and removes the old folder', () => {
    put('ab/abc123', 'hello audio'); put('cd/cd9999', 'more');
    const seen: number[] = [];
    moveStorage(data(), 'files', join(dir, 'hdd', 'files'), { forceCopy: true, onProgress: (p) => seen.push(p.copiedBytes) });
    expect(lstatSync(join(data(), 'files')).isSymbolicLink()).toBe(true);
    expect(readFileSync(join(data(), 'files', 'ab', 'abc123'), 'utf8')).toBe('hello audio');
    expect(readFileSync(join(dir, 'hdd', 'files', 'cd', 'cd9999'), 'utf8')).toBe('more');
    expect(readdirSync(data()).filter((n) => n.includes('.old'))).toEqual([]);
    expect(seen.at(-1)).toBe('hello audio'.length + 'more'.length);
    // and again, from the link to a third place (the old target goes away)
    moveStorage(data(), 'files', join(dir, 'third'), { forceCopy: true });
    expect(existsSync(join(dir, 'hdd', 'files'))).toBe(false);
    expect(readFileSync(join(data(), 'files', 'ab', 'abc123'), 'utf8')).toBe('hello audio');
  });
  it('on the same disk it just renames', () => {
    put('ab/x1', 'data');
    moveStorage(data(), 'files', join(dir, 'elsewhere'));
    expect(lstatSync(join(data(), 'files')).isSymbolicLink()).toBe(true);
    expect(readFileSync(join(dir, 'elsewhere', 'ab', 'x1'), 'utf8')).toBe('data');
  });
  it('temp and cache are repointed without copying anything', () => {
    writeFileSync(join(data(), 'tmp', 'leftover'), 'x');
    moveStorage(data(), 'tmp', join(dir, 'ram'), { forceCopy: true });
    expect(lstatSync(join(data(), 'tmp')).isSymbolicLink()).toBe(true);
    expect(readdirSync(join(dir, 'ram'))).toEqual([]);
  });
  it('the mover runs one job at a time and reports the result', async () => {
    put('ab/y', 'zz');
    const m = new StorageMover(data(), { forceCopy: true });
    m.start('files', join(dir, 'job'));
    expect(m.state().status).toBe('running');
    expect(() => m.start('files', join(dir, 'job2'))).toThrow(StorageError);
    await new Promise((r) => setTimeout(r, 100));
    expect(m.state()).toMatchObject({ status: 'done', kind: 'files' });
    expect(() => m.start('files', 'not/absolute')).toThrow(/full path/);
  });
  it('a stale link elsewhere is not touched by describing', () => {
    symlinkSync(join(dir, 'data', 'files'), join(dir, 'alias'));
    expect(describeStorage(data()).find((x) => x.kind === 'files')!.moved).toBe(false);
  });
});

describe('yt-dlp cache', () => {
  it('goes next to the library unless the person chose one', () => {
    expect(withCacheDir(undefined, '/mnt/hdd/curator')).toEqual(['--cache-dir', '/mnt/hdd/curator/cache']);
    expect(withCacheDir(['--cookies', 'c.txt'], '/d')).toEqual(['--cache-dir', '/d/cache', '--cookies', 'c.txt']);
    expect(withCacheDir(['--cache-dir', '/x'], '/d')).toEqual(['--cache-dir', '/x']);
    expect(withCacheDir(['--no-cache-dir'], '/d')).toEqual(['--no-cache-dir']);
  });
});
