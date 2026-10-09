import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, chmodSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/db.ts';
import { Acquirer, safeUrl } from '../src/acquire.ts';

let dir: string, store: Store;
const track = (id: string, youtubeMusicUrl: string | null, file: string | null = null) => ({
  table: 'tracks' as const, id, updatedAt: 1, deviceId: 'd', deleted: false,
  data: { title: id, youtubeMusicUrl, file, credits: [] },
});

/** stand-in for yt-dlp: records its argv, writes <id>.mp3 into the -o directory; fails for URLs containing "bad" */
function fakeYtdlp() {
  const path = join(dir, 'fake-yt-dlp');
  writeFileSync(path, `#!/bin/sh
echo "$@" >> "${dir}/argv.log"
for a; do case "$a" in *bad*) echo "ERROR: Video unavailable" >&2; exit 1;; esac; done
while [ "$1" != "-o" ]; do shift; done
out="$2"; mkdir -p "$(dirname "$out")"
printf "audio-for-%s" "$(echo "$@" | tr -c 'a-z0-9' _)" > "$(dirname "$out")/vid.mp3"
`);
  chmodSync(path, 0o755);
  return path;
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'curator-acq-'));
  mkdirSync(join(dir, 'data', 'tmp'), { recursive: true });
  store = new Store(join(dir, 'data'));
});
afterEach(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });

describe('safeUrl', () => {
  it('only allows web URLs', () => {
    expect(safeUrl('https://www.youtube.com/watch?v=abc')).toContain('youtube.com');
    for (const bad of ['--exec rm', '-o /etc/x', 'file:///etc/passwd', '/etc/passwd', '', null, 42]) expect(safeUrl(bad)).toBeNull();
  });
});

describe('Acquirer', () => {
  it('downloads missing audio, attaches it, skips tracks that have audio or no URL, isolates failures', async () => {
    store.push([
      track('ok1', 'https://youtu.be/one'), track('ok2', 'https://youtu.be/two'),
      track('has', 'https://youtu.be/three', 'a'.repeat(64)), track('nourl', null),
      track('evil', '--exec=touch /tmp/pwned'), track('bad', 'https://youtu.be/bad'),
    ]);
    const a = new Acquirer({ dataDir: join(dir, 'data'), store, ytdlp: fakeYtdlp(), concurrency: 2 });
    expect(a.enqueueMissing().map((j) => j.trackId).sort()).toEqual(['bad', 'ok1', 'ok2']);
    await a.drained();

    const ok1 = store.get('tracks', 'ok1')!;
    expect((ok1.data as any).file).toMatch(/^[0-9a-f]{64}$/);
    expect(store.hasFile((ok1.data as any).file)).toBe(true);
    expect(store.fileInfo((ok1.data as any).file)!.mime).toBe('audio/mpeg');
    expect((ok1.data as any).title).toBe('ok1');           // other fields preserved
    expect(ok1.updatedAt).toBeGreaterThan(1);               // wins the sync conflict rule over the stale copy
    expect((store.get('tracks', 'ok2')!.data as any).file).toMatch(/^[0-9a-f]{64}$/);
    expect((store.get('tracks', 'has')!.data as any).file).toBe('a'.repeat(64));
    const failed = [...a.jobs.values()].filter((j) => j.state === 'failed');
    expect(failed.map((j) => j.trackId)).toEqual(['bad']);
    expect(failed[0].error).toContain('Video unavailable');
    expect((store.get('tracks', 'bad')!.data as any).file).toBeNull();
    expect(readdirSync(join(dir, 'data', 'tmp'))).toEqual([]); // work dirs cleaned
  });

  it('passes the URL after `--` so it can never be an option', async () => {
    store.push([track('t', 'https://youtu.be/x')]);
    const a = new Acquirer({ dataDir: join(dir, 'data'), store, ytdlp: fakeYtdlp() });
    a.enqueueMissing(); await a.drained();
    const argv = (await import('node:fs')).readFileSync(join(dir, 'argv.log'), 'utf8');
    expect(argv).toMatch(/ -- https:\/\/youtu\.be\/x\s*$/);
  });

  it('does not double-queue and reports a clear error when yt-dlp is missing', async () => {
    store.push([track('t', 'https://youtu.be/x')]);
    const a = new Acquirer({ dataDir: join(dir, 'data'), store, ytdlp: join(dir, 'nope') });
    expect(a.enqueueMissing()).toHaveLength(1);
    expect(a.enqueueMissing()).toHaveLength(0);
    await a.drained();
    expect([...a.jobs.values()][0].error).toContain('yt-dlp not found');
    expect(a.enqueueMissing()).toHaveLength(1); // failed jobs can be retried
    await a.drained();
  });

  it('a track edited during download keeps the edit', async () => {
    store.push([track('t', 'https://youtu.be/x')]);
    const a = new Acquirer({ dataDir: join(dir, 'data'), store, ytdlp: fakeYtdlp() });
    a.enqueueMissing();
    store.push([{ ...track('t', 'https://youtu.be/x'), updatedAt: 50, data: { ...track('t', 'https://youtu.be/x').data, title: 'Renamed' } }]);
    await a.drained();
    const r = store.get('tracks', 't')!;
    expect((r.data as any).title).toBe('Renamed');
    expect((r.data as any).file).toMatch(/^[0-9a-f]{64}$/);
  });
});
