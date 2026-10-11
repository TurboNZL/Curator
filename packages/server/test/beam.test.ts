import { describe, expect, it } from 'vitest';
import { EventEmitter } from 'node:events';
import { Beam, SINK, ffmpegArgs } from '../src/beam.ts';

class FakeChild extends EventEmitter {
  stdout = new EventEmitter(); stderr = new EventEmitter(); killed: string[] = [];
  kill(sig: string) { this.killed.push(sig); return true; }
}
function rig() {
  const kids: { child: FakeChild; bin: string; args: string[]; env?: NodeJS.ProcessEnv }[] = [];
  const beam = new Beam({ ffmpegDir: '/opt/ff', env: () => ({ XDG_RUNTIME_DIR: '/run/user/998' }),
    spawnImpl: ((bin: string, args: string[], o: { env?: NodeJS.ProcessEnv }) => { const child = new FakeChild(); kids.push({ child, bin, args, env: o.env }); return child; }) as never });
  return { beam, kids };
}

describe('Beam (Soloist\'s sound as a live stream)', () => {
  it('captures the virtual output as MP3 with ffmpeg, in the sound session of this account', () => {
    const { beam, kids } = rig();
    beam.listen(() => undefined, () => undefined);
    expect(kids).toHaveLength(1);
    expect(kids[0].bin).toBe('/opt/ff/ffmpeg'); expect(kids[0].env).toMatchObject({ XDG_RUNTIME_DIR: '/run/user/998' });
    expect(kids[0].args).toEqual(ffmpegArgs());
    expect(kids[0].args).toContain(`${SINK}.monitor`); expect(kids[0].args.slice(-3)).toEqual(['-f', 'mp3', 'pipe:1']);
  });
  it('runs ffmpeg once for any number of listeners, gives each the same bytes, and stops with the last one', () => {
    const { beam, kids } = rig();
    const a: Buffer[] = [], b: Buffer[] = [];
    const la = beam.listen((c) => a.push(c), () => undefined);
    const lb = beam.listen((c) => b.push(c), () => undefined);
    expect(kids).toHaveLength(1); expect(beam.status()).toMatchObject({ listeners: 2, running: true });
    kids[0].child.stdout.emit('data', Buffer.from([1, 2, 3]));
    expect(a[0]).toEqual(Buffer.from([1, 2, 3])); expect(b[0]).toEqual(Buffer.from([1, 2, 3])); expect(beam.status().bytes).toBe(3);
    la.stop(); expect(kids[0].child.killed).toEqual([]);
    lb.stop(); expect(kids[0].child.killed).toEqual(['SIGTERM']); expect(beam.status().running).toBe(false);
  });
  it('starts a fresh ffmpeg for a later listener', () => {
    const { beam, kids } = rig();
    beam.listen(() => undefined, () => undefined).stop();
    beam.listen(() => undefined, () => undefined);
    expect(kids).toHaveLength(2);
  });
  it('says what is wrong when ffmpeg cannot listen, and ends the streams', () => {
    const { beam, kids } = rig(); let ended = 0;
    beam.listen(() => undefined, () => ended++);
    kids[0].child.stderr.emit('data', Buffer.from('pulse: Connection refused\n'));
    kids[0].child.emit('close', 1);
    expect(ended).toBe(1);
    expect(beam.status()).toMatchObject({ running: false, listeners: 0 });
    expect(beam.status().error).toMatch(/could not listen to the virtual output/);
  });
  it('says when ffmpeg is not installed', () => {
    const { beam, kids } = rig();
    beam.listen(() => undefined, () => undefined);
    kids[0].child.emit('error', Object.assign(new Error('x'), { code: 'ENOENT' }));
    expect(beam.status().error).toMatch(/ffmpeg is not installed/);
  });
});
