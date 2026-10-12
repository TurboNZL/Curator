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
  /** extra arguments for every yt-dlp call (cookies, a JS runtime, ...) */
  ytdlpArgs?: string[];
  /** directory containing ffmpeg/ffprobe if not on PATH */
  ffmpegDir?: string;
  concurrency?: number;
  /** test seam */
  now?: () => number;
}

export type JobState = 'queued' | 'running' | 'done' | 'failed';
export interface Job {
  id: string; trackId: string; url: string; state: JobState; error?: string; fileHash?: string;
  /** while running: 'downloading' then 'converting'; `percent` is how much of the download is in (0..100) */
  stage?: 'downloading' | 'converting'; percent?: number;
  /** YouTube says the video is gone for good (removed, private, blocked): there is no point retrying */
  dead?: boolean;
}

/** YouTube's answers that mean the video itself cannot be fetched by anyone, now or later. A bot check or a 403 is NOT one of these. */
export const isDeadLink = (message: string) => /video unavailable|this video is not available|video is (private|no longer available|unavailable)|private video|has been removed|account associated with this video has been terminated|removed by the uploader|blocked it on copyright|who has blocked it|members-only|this content isn.t available|no longer available|does not exist|video has been (removed|deleted)/i.test(message);

/** Only plain web URLs; never anything that could be parsed as a yt-dlp option or a local path. */
export function safeUrl(u: unknown): string | null {
  if (typeof u !== 'string') return null;
  try {
    const url = new URL(u);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch { return null; }
}

/** YouTube's "prove you are not a bot" answer to a download. */
export const isBotCheck = (message: string) => /confirm you.?re not a bot|sign in to confirm/i.test(message);

/** YouTube serving the page but refusing the media itself ("unable to download video data: HTTP Error 403"). */
export const isForbidden = (message: string) => /HTTP Error 403|403: Forbidden/i.test(message);

/**
 * Other player clients to try, in order, when the default one is stopped by the bot check or a 403. Which clients still work
 * changes every few months (`android_vr` was removed from yt-dlp's defaults in August 2026 because it started returning 403s,
 * so it is deliberately not listed). None of these need a PO token. The real cure for a 403 is usually a current yt-dlp.
 */
export const FALLBACK_CLIENTS: string[][] = [
  ['--extractor-args', 'youtube:player_client=visionos,web_embedded,mweb'],
  ['--extractor-args', 'youtube:player_client=android'],
  ['--extractor-args', 'youtube:player_client=tv_downgraded'],
];

export const FORBIDDEN_HELP = 'YouTube refused the media download (HTTP 403). Update yt-dlp first (yt-dlp -U, or pip/nightly; 2026.08.19 or newer is needed) and make sure a JavaScript runtime (Node 22 or Deno) is installed, then press “Download missing audio” again.';

export const BOT_HELP = 'YouTube wants proof that this server is not a bot. Give yt-dlp a cookies file: set CURATOR_YTDLP_COOKIES (see docs/guides/YTDLP_COOKIES.md), then press “Download missing audio” again.';

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
      if (t.youtubeDead && t.youtubeDead.url === t.youtubeMusicUrl && !wanted) continue; // known dead: only a deliberate retry of that track (or a new link) tries again
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
    job.state = 'running'; job.stage = 'downloading'; job.percent = 0;
    const work = mkdtempSync(join(this.o.dataDir, 'tmp', 'dl-'));
    try {
      await this.download(job.url, work, job);
      const out = readdirSync(work).find((f) => /\.(mp3|m4a|opus|ogg|flac|wav)$/i.test(f));
      if (!out) throw new Error('yt-dlp finished but produced no audio file');
      const path = join(work, out);
      const { hash, size } = await ingestFile(this.o.dataDir, path);
      this.o.store.addFile(hash, size, mimeFor(path));
      this.attach(job.trackId, hash);
      job.fileHash = hash;
      job.state = 'done';
      this.markDead(job.trackId, null);
    } catch (e) {
      job.state = 'failed';
      job.error = e instanceof Error ? e.message.slice(0, 500) : String(e);
      if (isDeadLink(job.error)) { job.dead = true; this.markDead(job.trackId, { url: job.url, reason: job.error.split('ERROR:').pop()!.trim().slice(0, 200) }); }
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }

  /** The default clients first, then each fallback while the failure is one that another client can get around. */
  private async download(url: string, work: string, job: Job) {
    let last: Error;
    try { return await this.exec(url, work, [], job); } catch (e) { last = e as Error; }
    if (!isBotCheck(last.message) && !isForbidden(last.message)) throw last;
    for (const extra of FALLBACK_CLIENTS) {
      try { return await this.exec(url, work, extra, job); } catch (e) { last = e as Error; }
      if (!isBotCheck(last.message) && !isForbidden(last.message)) throw last;
    }
    const tail = last.message.slice(-200);
    throw new Error(isBotCheck(last.message) ? `${BOT_HELP} (${tail})` : `${FORBIDDEN_HELP} (${tail})`);
  }

  /** Merge into the *current* track record (it may have been edited while downloading). */
  private attach(trackId: string, hash: string) {
    const cur = this.o.store.get('tracks', trackId);
    if (!cur || cur.deleted) return;
    const updatedAt = Math.max((this.o.now ?? Date.now)(), cur.updatedAt + 1);
    this.o.store.push([{ table: 'tracks', id: trackId, updatedAt, deviceId: 'server', deleted: false, data: { ...cur.data, file: hash } }]);
  }

  /** Remember on the track that its YouTube link is dead (Health lists those), or clear the mark after a successful download. */
  private markDead(trackId: string, dead: { url: string; reason: string } | null) {
    const cur = this.o.store.get('tracks', trackId);
    if (!cur || cur.deleted) return;
    const had = (cur.data as { youtubeDead?: unknown }).youtubeDead;
    if (!dead && !had) return;
    const updatedAt = Math.max((this.o.now ?? Date.now)(), cur.updatedAt + 1);
    this.o.store.push([{ table: 'tracks', id: trackId, updatedAt, deviceId: 'server', deleted: false, data: { ...cur.data, youtubeDead: dead ? { ...dead, at: updatedAt } : null } }]);
  }

  private exec(url: string, cwd: string, extra: string[] = [], job?: Job): Promise<void> {
    const args = [
      ...(this.o.ytdlpArgs ?? []), ...extra, '--retries', '3',
      '--no-playlist', '--newline', '--progress-template', 'download:CURATOR_PROGRESS %(progress.downloaded_bytes)s %(progress.total_bytes)s %(progress.total_bytes_estimate)s', '-x', '--audio-format', 'mp3', '--audio-quality', '0',
      '-o', join(cwd, '%(id)s.%(ext)s'),
      ...(this.o.ffmpegDir ? ['--ffmpeg-location', this.o.ffmpegDir] : []),
      '--', url, // `--` so a URL can never be read as an option
    ];
    return new Promise((resolve, reject) => {
      const child = spawn(this.o.ytdlp ?? 'yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let err = '', buf = '';
      child.stdout.on('data', (d) => {
        buf += d;
        const lines = buf.split('\n'); buf = lines.pop() ?? '';
        for (const line of lines) {
          const m = /^CURATOR_PROGRESS\s+(\S+)\s+(\S+)\s+(\S+)/.exec(line);
          if (m && job) { const done = Number(m[1]), total = Number(m[2]) || Number(m[3]); if (done >= 0 && total > 0) { job.stage = 'downloading'; job.percent = Math.min(100, Math.round((done / total) * 100)); } }
          else if (job && /^\[(ExtractAudio|Merger|FFmpeg\w*)\]/.test(line)) { job.stage = 'converting'; job.percent = 100; }
        }
      });
      child.stderr.on('data', (d) => { err = (err + d).slice(-2000); });
      child.on('error', (e: NodeJS.ErrnoException) =>
        reject(new Error(e.code === 'ENOENT' ? `yt-dlp not found (${this.o.ytdlp ?? 'yt-dlp'}). Install it or set CURATOR_YTDLP.` : e.message)));
      child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`yt-dlp exited ${code}: ${err.trim().split('\n').pop()}`))));
    });
  }
}
