import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { newId, type TrackData } from '@curator/core';
import type { Store } from './db.ts';
import { ingestFile } from './files.ts';
import { mimeFor } from './migrate-legacy.ts';

export interface AcquireOptions {
  dataDir: string;
  store: Store;
  /** yt-dlp executable; resolved from PATH when bare. Linux/macOS/Windows/Pi all work - no hard-coded .exe. */
  ytdlp?: string;
  /** directory containing ffmpeg/ffprobe if not on PATH */
  ffmpegDir?: string;
  concurrency?: number;
  /** test seam */
  now?: () => number;
}

export type JobState = 'queued' | 'running' | 'done' | 'failed';
export interface Job { id: string; trackId: string; url: string; state: JobState; error?: string; fileHash?: string }

/** Only plain web URLs; never anything that could be parsed as a yt-dlp option or a local path. */
export function safeUrl(u: unknown): string | null {
  if (typeof u !== 'string') return null;
  try {
    const url = new URL(u);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch { return null; }
}

export class Acquirer {
  readonly jobs = new Map<string, Job>();
  private queue: string[] = [];
  private running = 0;
  private idle: Array<() => void> = [];

  private readonly o: AcquireOptions;
  constructor(o: AcquireOptions) { this.o = o; }

  /** Queue downloads for tracks that have a source URL but no audio yet. Returns the jobs created. */
  enqueueMissing(onlyTrackIds?: string[]): Job[] {
    const wanted = onlyTrackIds ? new Set(onlyTrackIds) : null;
    const active = new Set([...this.jobs.values()].filter((j) => j.state === 'queued' || j.state === 'running').map((j) => j.trackId));
    const created: Job[] = [];
    for (const rec of this.o.store.list('tracks')) {
      const t = rec.data as unknown as TrackData;
      if (t.file || (wanted && !wanted.has(rec.id)) || active.has(rec.id)) continue;
      const url = safeUrl(t.youtubeMusicUrl);
      if (!url) continue;
      const job: Job = { id: newId(), trackId: rec.id, url, state: 'queued' };
      this.jobs.set(job.id, job);
      this.queue.push(job.id);
      created.push(job);
    }
    this.pump();
    return created;
  }

  /** resolves when nothing is queued or running */
  drained(): Promise<void> {
    return this.running === 0 && this.queue.length === 0 ? Promise.resolve() : new Promise((r) => this.idle.push(r));
  }

  private pump() {
    const max = this.o.concurrency ?? 2;
    while (this.running < max && this.queue.length) {
      const job = this.jobs.get(this.queue.shift()!)!;
      this.running++;
      this.run(job).finally(() => {
        this.running--;
        this.pump();
        if (this.running === 0 && this.queue.length === 0) this.idle.splice(0).forEach((r) => r());
      });
    }
  }

  private async run(job: Job) {
    job.state = 'running';
    const work = mkdtempSync(join(this.o.dataDir, 'tmp', 'dl-'));
    try {
      await this.exec(job.url, work);
      const out = readdirSync(work).find((f) => /\.(mp3|m4a|opus|ogg|flac|wav)$/i.test(f));
      if (!out) throw new Error('yt-dlp finished but produced no audio file');
      const path = join(work, out);
      const { hash, size } = await ingestFile(this.o.dataDir, path);
      this.o.store.addFile(hash, size, mimeFor(path));
      this.attach(job.trackId, hash);
      job.fileHash = hash;
      job.state = 'done';
    } catch (e) {
      job.state = 'failed';
      job.error = e instanceof Error ? e.message.slice(0, 500) : String(e);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }

  /** Merge into the *current* track record (it may have been edited while downloading). */
  private attach(trackId: string, hash: string) {
    const cur = this.o.store.get('tracks', trackId);
    if (!cur || cur.deleted) return;
    const updatedAt = Math.max((this.o.now ?? Date.now)(), cur.updatedAt + 1);
    this.o.store.push([{ table: 'tracks', id: trackId, updatedAt, deviceId: 'server', deleted: false, data: { ...cur.data, file: hash } }]);
  }

  private exec(url: string, cwd: string): Promise<void> {
    const args = [
      '--no-playlist', '--no-progress', '-x', '--audio-format', 'mp3', '--audio-quality', '0',
      '-o', join(cwd, '%(id)s.%(ext)s'),
      ...(this.o.ffmpegDir ? ['--ffmpeg-location', this.o.ffmpegDir] : []),
      '--', url, // `--` so a URL can never be read as an option
    ];
    return new Promise((resolve, reject) => {
      const child = spawn(this.o.ytdlp ?? 'yt-dlp', args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let err = '';
      child.stderr.on('data', (d) => { err = (err + d).slice(-2000); });
      child.on('error', (e: NodeJS.ErrnoException) =>
        reject(new Error(e.code === 'ENOENT' ? `yt-dlp not found (${this.o.ytdlp ?? 'yt-dlp'}). Install it or set CURATOR_YTDLP.` : e.message)));
      child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`yt-dlp exited ${code}: ${err.trim().split('\n').pop()}`))));
    });
  }
}
