import type { Library } from './library.ts';

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export interface Seed { name: string; weight: number }

/**
 * The artists your votes say you like most, as seeds for "more like this". An artist's weight is the average rating of its rated tracks
 * (what you voted for), scaled up with how many tracks that is, so one lucky 10 does not beat a catalogue you keep rating highly. Pure.
 */
export function tasteSeeds(lib: Library, n = 8): Seed[] {
  const by = new Map<string, { name: string; sum: number; count: number }>();
  for (const t of lib.tracks) {
    if (t.effectiveRating <= 0.001 || t.comparisons < 3) continue;
    const lead = t.leads[0]; if (!lead) continue;
    const e = by.get(lead.id) ?? { name: lead.name, sum: 0, count: 0 };
    e.sum += t.effectiveRating; e.count++; by.set(lead.id, e);
  }
  return [...by.values()].filter((e) => e.sum / e.count >= 6).map((e) => ({ name: e.name, weight: (e.sum / e.count / 10) * Math.log2(1 + e.count) })).sort((a, b) => b.weight - a.weight).slice(0, n);
}

export interface Suggestion { name: string; mbid: string; score: number; because: string[] }

/** Merge each seed's similar artists into one ranked list without the artists you already have. `similar[i]` belongs to `seeds[i]`. Pure. */
export function mergeSuggestions(seeds: Seed[], similar: { name: string; mbid: string; score: number }[][], have: Iterable<string>, limit = 30): Suggestion[] {
  const known = new Set([...have].map(norm));
  const out = new Map<string, Suggestion>();
  seeds.forEach((seed, i) => {
    const list = similar[i] ?? [];
    const top = Math.max(1, ...list.map((s) => s.score));
    for (const s of list) {
      const key = norm(s.name);
      if (!key || known.has(key) || known.has(norm(seed.name)) && key === norm(seed.name)) continue;
      const e = out.get(key) ?? { name: s.name, mbid: s.mbid, score: 0, because: [] };
      e.score += (s.score / top) * seed.weight; if (!e.because.includes(seed.name)) e.because.push(seed.name);
      out.set(key, e);
    }
  });
  // liked by several of your artists beats liked by one: the sum already says so, so just sort
  return [...out.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}
