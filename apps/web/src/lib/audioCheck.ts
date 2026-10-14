import type { AudioCheck } from '@turbomusic/core';
import type { Track } from './derive.ts';
import { api, useStore } from './store.ts';

/** "320 kbps" / "320" / "320000" -> 320; null when there is no number. */
export function claimedKbps(bitrate: string | null | undefined): number | null {
  const n = parseInt(String(bitrate ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n > 5000 ? Math.round(n / 1000) : n;
}

export type Quality = 'unchecked' | 'transcode' | 'mismatch' | 'ok' | 'unknown';

/**
 * Where a track stands after the check: `transcode` = the file claims a high rate but its content stops where a low one would;
 * `mismatch` = the stored bit rate says something else than the file measures (a "320" that is really 128 and so on).
 */
export function qualityOf(t: Pick<Track, 'audioCheck' | 'bitrate' | 'file'>): Quality {
  const c = t.audioCheck;
  if (!c || c.file !== t.file) return 'unchecked';
  if (c.verdict === 'unknown') return 'unknown';
  if (c.verdict === 'transcode') return 'transcode';
  const claimed = claimedKbps(t.bitrate);
  if (claimed && c.kbps && Math.abs(claimed - c.kbps) / claimed > 0.15) return 'mismatch';
  return 'ok';
}

export interface CheckProgress { running: boolean; done: number; total: number; failed: number }

let running = false;
/** Measure every track that has audio on the server and has not been measured for its current file yet (or all, with `again`). */
export async function runAudioCheck(tracks: Track[], onProgress: (p: CheckProgress) => void, again = false): Promise<CheckProgress> {
  if (running) return { running: true, done: 0, total: 0, failed: 0 };
  running = true;
  const todo = tracks.filter((t) => t.file && (again || !t.audioCheck || t.audioCheck.file !== t.file));
  const p: CheckProgress = { running: true, done: 0, total: todo.length, failed: 0 };
  onProgress({ ...p });
  const queue = [...todo];
  const worker = async () => {
    for (let t = queue.shift(); t; t = queue.shift()) {
      try {
        const r = await api().analyzeAudio(t.file!);
        const check: AudioCheck = { kbps: r.kbps, codec: r.codec, cutoffHz: r.cutoffHz, looksLike: r.looksLike, verdict: r.verdict, file: t.file!, at: Date.now() };
        useStore.getState().patch('tracks', t.id, { audioCheck: check });
      } catch { p.failed++; }
      p.done++; onProgress({ ...p });
    }
  };
  try { await Promise.all([worker(), worker()]); } finally { running = false; }
  p.running = false; onProgress({ ...p });
  return p;
}
