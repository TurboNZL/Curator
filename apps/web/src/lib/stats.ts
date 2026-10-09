import type { Library } from './library.ts';

export interface Stats {
  plays: number;
  skips: number;
  skipRate: number;
  secondsListened: number;
  distinctTracks: number;
  topTracks: { id: string; title: string; artist: string; seconds: number; plays: number }[];
  recent: { id: string; trackId: string; timestamp: number; isSkip: boolean }[];
  /** counts per whole-number rating band 0..9 (9 = 9.0-10), rated tracks only */
  ratingBands: number[];
  rated: number;
  unrated: number;
  topGenres: { name: string; tracks: number }[];
  withAudio: number;
}

/** Everything the stats page shows, derived from the library (pure, so it is testable). */
export function computeStats(lib: Library): Stats {
  const byTrack = new Map<string, { seconds: number; plays: number }>();
  let seconds = 0, skips = 0;
  for (const l of lib.logs) {
    const e = byTrack.get(l.trackId) ?? { seconds: 0, plays: 0 };
    e.seconds += l.duration ?? 0; e.plays++;
    byTrack.set(l.trackId, e);
    seconds += l.duration ?? 0;
    if (l.isSkip) skips++;
  }
  const topTracks = [...byTrack.entries()].flatMap(([id, e]) => {
    const t = lib.trackById.get(id);
    return t ? [{ id, title: t.title, artist: t.artistName, ...e }] : [];
  }).sort((a, b) => b.seconds - a.seconds).slice(0, 10);

  const bands = Array<number>(10).fill(0);
  let rated = 0;
  const genres = new Map<string, number>();
  for (const t of lib.tracks) {
    if (t.effectiveRating > 0.001) { rated++; bands[Math.min(9, Math.floor(t.effectiveRating))]++; }
    for (const g of t.allGenres) genres.set(g, (genres.get(g) ?? 0) + 1);
  }
  return {
    plays: lib.logs.length, skips, skipRate: lib.logs.length ? skips / lib.logs.length : 0,
    secondsListened: seconds, distinctTracks: byTrack.size, topTracks,
    recent: [...lib.logs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 12).map((l) => ({ id: l.id, trackId: l.trackId, timestamp: l.timestamp, isSkip: l.isSkip })),
    ratingBands: bands, rated, unrated: lib.tracks.length - rated,
    topGenres: [...genres.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, tracks]) => ({ name, tracks })),
    withAudio: lib.tracks.filter((t) => t.file).length,
  };
}
