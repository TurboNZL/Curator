export interface Pairable { id: string; elo: number; comparisons: number }

/**
 * Choose two tracks to compare. A comes from the least-compared slice so every track gets
 * ranked eventually; B is whichever of a few random candidates has the closest Elo to A, because
 * close matches tell us the most. `exclude` avoids immediately repeating the previous pair.
 */
export function pickPair<T extends Pairable>(tracks: T[], rnd: () => number = Math.random, exclude?: [string, string]): [T, T] | null {
  if (tracks.length < 2) return null;
  const byUse = [...tracks].sort((a, b) => a.comparisons - b.comparisons);
  const slice = byUse.slice(0, Math.max(5, Math.ceil(tracks.length * 0.15)));
  const a = slice[Math.floor(rnd() * slice.length)];
  const others = tracks.filter((t) => t.id !== a.id);
  const sample: T[] = [];
  const n = Math.min(8, others.length); // fixed up front: `others` shrinks as we draw
  for (let i = 0; i < n; i++) sample.push(others.splice(Math.floor(rnd() * others.length), 1)[0]);
  sample.sort((x, y) => Math.abs(x.elo - a.elo) - Math.abs(y.elo - a.elo));
  const b = sample.find((t) => !exclude || !(exclude.includes(a.id) && exclude.includes(t.id))) ?? sample[0];
  return rnd() < 0.5 ? [a, b] : [b, a];
}

/**
 * The tracks to rank from. With "only tracks with audio" on, that is the tracks that have a file, but only while at least two do:
 * with fewer there is nothing to pair, so everything is used and `fellBack` says so (a fresh library has no audio yet).
 */
export function rankPool<T extends { file: unknown }>(tracks: T[], onlyAudio: boolean): { pool: T[]; fellBack: boolean } {
  if (!onlyAudio) return { pool: tracks, fellBack: false };
  const playable = tracks.filter((t) => t.file);
  return playable.length >= 2 ? { pool: playable, fellBack: false } : { pool: tracks, fellBack: true };
}

/** Turning "only tracks with audio" on only needs a new pair when the pair on screen has a track without audio. */
export function pairLacksAudio(pair: [string, string] | null, byId: ReadonlyMap<string, { file: unknown }>): boolean {
  return !!pair && pair.some((id) => !byId.get(id)?.file);
}

/** Which part of the ranking the Rank page draws both tracks of a pair from. */
export type Tier = 'any' | 'top10' | 'top25' | 'upper' | 'lower' | 'few' | 'range';
export interface TierChoice { tier: Tier; /** only for `range`: rating from .. to (0-10) */ min: number; max: number }
export const TIERS: { id: Tier; label: string; hint: string }[] = [
  { id: 'any', label: 'Anything', hint: 'Every track, the least compared first' },
  { id: 'top10', label: 'Top 10%', hint: 'Only your best tracks against each other: settles the order at the very top' },
  { id: 'top25', label: 'Top 25%', hint: 'The upper quarter of your ranking' },
  { id: 'upper', label: 'Upper half', hint: 'Tracks above the middle of your ranking' },
  { id: 'lower', label: 'Lower half', hint: 'Tracks below the middle of your ranking' },
  { id: 'few', label: 'Few votes', hint: 'Tracks compared two times or fewer' },
  { id: 'range', label: 'Rating range', hint: 'Pick the rating band yourself' },
];

/**
 * The tracks a tier allows, so the pair is drawn from that class only ("two top-tier tracks against each other"). The percentile tiers
 * rank by Elo among tracks that were compared at least once; unranked tracks are only in `any`, `few` and `range`.
 * Nothing about the pair rule changes: the least compared of the tier still comes first, and its closest match is chosen.
 */
export function tierPool<T extends Pairable & { effectiveRating: number }>(tracks: T[], c: TierChoice): T[] {
  if (c.tier === 'any') return tracks;
  if (c.tier === 'few') return tracks.filter((t) => t.comparisons <= 2);
  if (c.tier === 'range') return tracks.filter((t) => t.effectiveRating >= c.min && t.effectiveRating <= c.max);
  const ranked = tracks.filter((t) => t.comparisons > 0).sort((a, b) => b.elo - a.elo);
  const n = ranked.length;
  const cut = c.tier === 'top10' ? Math.max(2, Math.ceil(n * 0.1)) : c.tier === 'top25' ? Math.max(2, Math.ceil(n * 0.25)) : Math.ceil(n / 2);
  return c.tier === 'lower' ? ranked.slice(cut) : ranked.slice(0, cut);
}
