import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DESKTOP_PORT, findWebDir, loadDesktopConfig, loadDiscordConfig, saveDesktopConfig, saveDiscordConfig } from '../src/desktopConfig.ts';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'curator-desktop-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('desktop config', () => {
  it('defaults to a library inside the app folder and a port next to the Pi server\'s', () => {
    expect(loadDesktopConfig(dir, {})).toEqual({ dataDir: join(dir, 'library'), port: DESKTOP_PORT, customFrame: false });
    expect(DESKTOP_PORT).toBe(47814);
  });
  it('remembers the chosen folder, and the environment overrides it', () => {
    saveDesktopConfig(dir, { dataDir: '/mnt/music' });
    expect(loadDesktopConfig(dir, {}).dataDir).toBe('/mnt/music');
    expect(loadDesktopConfig(dir, { CURATOR_DATA_DIR: '/elsewhere' }).dataDir).toBe('/elsewhere');
    saveDesktopConfig(dir, { port: 50000 });
    expect(loadDesktopConfig(dir, {})).toEqual({ dataDir: '/mnt/music', port: 50000, customFrame: false }); // saving one setting keeps the other
  });
  it('ignores a broken file and an impossible port', () => {
    writeFileSync(join(dir, 'desktop.json'), '{nope');
    expect(loadDesktopConfig(dir, {}).port).toBe(DESKTOP_PORT);
    expect(loadDesktopConfig(dir, { CURATOR_DESKTOP_PORT: '99999' }).port).toBe(DESKTOP_PORT);
  });
  it('finds the web client next to the packaged app, else in the monorepo', () => {
    const res = join(dir, 'res'), dev = join(dir, 'dev');
    mkdirSync(dev, { recursive: true }); writeFileSync(join(dev, 'index.html'), '');
    expect(findWebDir(res, dev)).toBe(dev);
    mkdirSync(join(res, 'web'), { recursive: true }); writeFileSync(join(res, 'web', 'index.html'), '');
    expect(findWebDir(res, dev)).toBe(join(res, 'web'));
    expect(findWebDir(join(dir, 'none'), join(dir, 'none'))).toBeNull();
  });
});

describe('discord config', () => {
  it('is on but has no application id by default, and only accepts a numeric id', () => {
    expect(loadDiscordConfig(dir, {})).toEqual({ discordEnabled: true, discordClientId: '' });
    saveDiscordConfig(dir, { discordClientId: 'not an id' });
    expect(loadDiscordConfig(dir, {}).discordClientId).toBe('');
    saveDiscordConfig(dir, { discordClientId: '123456789012345678', discordEnabled: false });
    expect(loadDiscordConfig(dir, {})).toEqual({ discordEnabled: false, discordClientId: '123456789012345678' });
    expect(loadDesktopConfig(dir, {}).port).toBe(DESKTOP_PORT); // sharing the file does not disturb the other settings
  });
});

