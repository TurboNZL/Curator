import { describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { folderPlan, lanUrls, loadServerConfig, saveServerConfig } from '../src/serverEdition/serverConfig.ts';
import { isInstalled, pathWith, TOOLS } from '../src/serverEdition/tools.ts';
import { parseTunnelLine } from '../src/serverEdition/tunnel.ts';

describe('Windows server edition settings', () => {
  it('has safe defaults and remembers what the wizard saved', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cse-'));
    expect(loadServerConfig(dir)).toMatchObject({ setupDone: false, port: 47813, lan: true, filesDir: '', tunnelOn: false });
    saveServerConfig(dir, { setupDone: true, filesDir: 'D:\\Music', port: 50000, tunnelToken: ' abc ', tunnelOn: true });
    expect(loadServerConfig(dir)).toMatchObject({ setupDone: true, filesDir: 'D:\\Music', port: 50000, tunnelToken: 'abc', tunnelOn: true });
    saveServerConfig(dir, { port: 99999, tunnelToken: '' });
    expect(loadServerConfig(dir)).toMatchObject({ port: 47813, tunnelOn: false }); // a bad port falls back, a tunnel without a token is off
  });
  it('lists the home-network addresses, private ones first', () => {
    const urls = lanUrls(47813, { Ethernet: [{ family: 'IPv4', internal: false, address: '192.168.1.20' }, { family: 'IPv6', internal: false, address: 'fe80::1' }], Loop: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }],
      VPN: [{ family: 'IPv4', internal: false, address: '100.64.0.2' }], Auto: [{ family: 'IPv4', internal: false, address: '169.254.3.3' }] });
    expect(urls).toEqual(['http://192.168.1.20:47813', 'http://100.64.0.2:47813']);
  });
  it('plans a link only for folders that were chosen', () => {
    expect(folderPlan({ filesDir: 'E:\\Audio', tmpDir: '', cacheDir: 'E:\\Cache' })).toEqual([{ kind: 'files', target: 'E:\\Audio' }, { kind: 'cache', target: 'E:\\Cache' }]);
    expect(folderPlan({ filesDir: '', tmpDir: '', cacheDir: '' })).toEqual([]);
  });
});

describe('helper programs', () => {
  it('knows every download and puts the tools folder first on PATH', () => {
    expect(TOOLS.map((t) => t.id)).toEqual(['ytdlp', 'ffmpeg', 'deno', 'cloudflared']);
    for (const t of TOOLS) expect(t.url).toMatch(/^https:\/\/github\.com\//);
    expect(pathWith('C:\\tools', 'C:\\Windows')).toBe(['C:\\tools', 'C:\\Windows'].join(process.platform === 'win32' ? ';' : ':'));
    expect(isInstalled(mkdtempSync(join(tmpdir(), 'tl-')), TOOLS[0])).toBe(false);
  });
});

describe('cloudflared output', () => {
  it('turns its lines into something a person can act on', () => {
    expect(parseTunnelLine('2026-10-12T10:00:00Z INF Registered tunnel connection connIndex=0')).toMatchObject({ status: 'connected' });
    expect(parseTunnelLine('ERR Provided Tunnel token is not valid.')).toMatchObject({ status: 'error' });
    expect(parseTunnelLine('INF Starting metrics server')).toBeNull();
  });
});
