import { afterEach, describe, expect, it } from 'vitest';
import net from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DiscordPresence, findSockets } from '../src/discord.ts';

const enc = (op: number, o: unknown) => { const j = Buffer.from(JSON.stringify(o)); const b = Buffer.alloc(8 + j.length); b.writeInt32LE(op, 0); b.writeInt32LE(j.length, 4); j.copy(b, 8); return b; };

/** A stand-in for Discord's desktop program: the handshake, then it records every SET_ACTIVITY. */
function fakeDiscord(dir: string) {
  const frames: { cmd?: string; args?: { activity?: Record<string, unknown> } }[] = [];
  const server = net.createServer((s) => {
    let buf = Buffer.alloc(0);
    s.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      while (buf.length >= 8) {
        const op = buf.readInt32LE(0), n = buf.readInt32LE(4);
        if (buf.length < 8 + n) break;
        const msg = JSON.parse(buf.subarray(8, 8 + n).toString()); buf = buf.subarray(8 + n);
        if (op === 0) s.write(enc(1, { cmd: 'DISPATCH', evt: 'READY', data: { v: 1, config: {}, user: { id: '1', username: 't', discriminator: '0', avatar: null } }, nonce: null }));
        else if (op === 1) { frames.push(msg); s.write(enc(1, { cmd: msg.cmd, data: null, evt: null, nonce: msg.nonce })); }
      }
    });
  });
  return { frames, listen: () => new Promise<void>((r) => server.listen(join(dir, 'discord-ipc-0'), r)), close: () => new Promise<void>((r) => server.close(() => r())) };
}

const until = async (f: () => boolean, ms = 4000) => { const t = Date.now(); while (!f() && Date.now() - t < ms) await new Promise((r) => setTimeout(r, 25)); };

describe('Discord Rich Presence over the local socket', () => {
  const old = process.env.XDG_RUNTIME_DIR;
  let dir = '';
  afterEach(() => { process.env.XDG_RUNTIME_DIR = old; if (dir) rmSync(dir, { recursive: true, force: true }); });

  it.skipIf(process.platform === 'win32')('connects, sends "Listening", and sends no more than the newest state inside the rate limit', async () => {
    dir = mkdtempSync(join(tmpdir(), 'dc-')); process.env.XDG_RUNTIME_DIR = dir;
    const fake = fakeDiscord(dir); await fake.listen();
    expect(findSockets()).toEqual([join(dir, 'discord-ipc-0')]);
    const d = new DiscordPresence();
    d.configure('123456789012345678', true);
    d.update({ title: 'Song', artist: 'Artist', album: 'Album', duration: 200, position: 5, playing: true });
    await until(() => fake.frames.length >= 1);
    expect(d.status).toBe('connected');
    expect(fake.frames[0].args?.activity).toMatchObject({ type: 2, details: 'Song', state: 'Artist' });
    // three quick changes: the first goes out at once, the rest collapse into one trailing update with the newest state
    d.update({ title: 'Two', artist: 'Artist', album: 'Album', duration: 200, position: 0, playing: true });
    d.update({ title: 'Three', artist: 'Artist', album: 'Album', duration: 200, position: 0, playing: true });
    await new Promise((r) => setTimeout(r, 300));
    expect(fake.frames.length).toBe(1);
    await until(() => fake.frames.length >= 2, 6000);
    expect(fake.frames.length).toBe(2);
    expect(fake.frames[1].args?.activity?.details).toBe('Three');
    await d.stop(); await fake.close();
  }, 15000);

  it('says what it looked for when Discord is not there', async () => {
    dir = mkdtempSync(join(tmpdir(), 'dc-')); process.env.XDG_RUNTIME_DIR = dir;
    const d = new DiscordPresence();
    d.configure('123456789012345678', true);
    await until(() => d.detail !== '');
    expect(d.status).toBe('connecting');
    expect(d.detail).toContain('No Discord found');
    expect(d.detail).toContain(dir);
    await d.stop();
  });
});
