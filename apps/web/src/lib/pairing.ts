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
