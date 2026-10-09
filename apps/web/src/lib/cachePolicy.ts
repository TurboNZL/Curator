export interface CacheEntry { size: number; at: number }

/**
 * Which offline files to drop so `incoming` more bytes fit under `limitBytes`: least recently used first,
 * never anything in `protect` (the current download batch, the playing track). Returns null when even
 * evicting everything allowed would not make room, so the caller can stop without deleting anything.
 */
export function pickEvictions(cache: Record<string, CacheEntry>, incoming: number, limitBytes: number, protect: ReadonlySet<string> = new Set()): string[] | null {
  let used = Object.values(cache).reduce((n, e) => n + e.size, 0);
  if (used + incoming <= limitBytes) return [];
  const out: string[] = [];
  for (const [hash, e] of Object.entries(cache).filter(([h]) => !protect.has(h)).sort((a, b) => a[1].at - b[1].at)) {
    out.push(hash); used -= e.size;
    if (used + incoming <= limitBytes) return out;
  }
  return null;
}
