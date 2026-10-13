import type { Listen } from './listens.ts';

/** The library tracks that were played at least once (TurboMusic's own player or an imported Spotify history). */
export function heardTrackIds(listens: readonly Listen[]): Set<string> {
  const out = new Set<string>();
  for (const l of listens) if (l.trackId) out.add(l.trackId);
  return out;
}

/**
 * Tracks that may be ranked: only ones that were heard at least once. A brand new library has no history at all, so with fewer than
 * two heard tracks there is nothing to pair and everything is used instead (`fellBack` says so, the page tells the user).
 */
export function onlyHeard<T extends { id: string }>(tracks: readonly T[], heard: ReadonlySet<string>): { pool: T[]; fellBack: boolean } {
  const h = tracks.filter((t) => heard.has(t.id));
  return h.length >= 2 ? { pool: h, fellBack: false } : { pool: [...tracks], fellBack: true };
}

/**
 * The "Try something new" playlist: tracks that were never played, a few from each album or artist so it is not one record front to
 * back, in random order. `playable` decides which unheard tracks can be played at all.
 */
export function tryNewPlaylist<T extends { id: string; albumId?: string | null; artistId?: string | null }>(
  tracks: readonly T[], heard: ReadonlySet<string>, playable: (t: T) => boolean, size = 25, perGroup = 2, rnd: () => number = Math.random,
): T[] {
  const fresh = tracks.filter((t) => !heard.has(t.id) && playable(t));
  for (let i = fresh.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [fresh[i], fresh[j]] = [fresh[j], fresh[i]]; }
  const used = new Map<string, number>();
  const out: T[] = [];
  for (const t of fresh) {
    const key = t.albumId ?? `artist:${t.artistId ?? t.id}`;
    const n = used.get(key) ?? 0;
    if (n >= perGroup) continue;
    used.set(key, n + 1);
    out.push(t);
    if (out.length >= size) break;
  }
  return out;
}
