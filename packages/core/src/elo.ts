export const ELO_START = 1000;
export const ELO_K = 32;

export interface Vote {
  id: string;
  trackAId: string;
  trackBId: string;
  /** null/undefined when isEqual */
  winnerId?: string | null;
  isEqual?: boolean;
  timestamp: number;
}

export interface RankedTrack {
  elo: number;
  comparisons: number;
}

export function expectedScore(ra: number, rb: number): number {
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

/** Pure single-vote update. Returns new ratings for A and B. */
export function applyVote(ra: number, rb: number, outcome: 'a' | 'b' | 'equal', k = ELO_K) {
  const sa = outcome === 'equal' ? 0.5 : outcome === 'a' ? 1 : 0;
  return {
    a: ra + k * (sa - expectedScore(ra, rb)),
    b: rb + k * (1 - sa - expectedScore(rb, ra)),
  };
}

/**
 * Elo is DERIVED from the append-only vote log, never stored as mutable truth.
 * That makes votes from several devices mergeable: union the logs, replay in time order.
 */
export function replayVotes(votes: Vote[], trackIds: Iterable<string>): Map<string, RankedTrack> {
  const out = new Map<string, RankedTrack>();
  for (const id of trackIds) out.set(id, { elo: ELO_START, comparisons: 0 });
  const ordered = [...votes].sort((x, y) => x.timestamp - y.timestamp || (x.id < y.id ? -1 : 1));
  for (const v of ordered) {
    const a = out.get(v.trackAId);
    const b = out.get(v.trackBId);
    if (!a || !b) continue; // vote references a deleted track
    const outcome = v.isEqual ? 'equal' : v.winnerId === v.trackAId ? 'a' : 'b';
    const next = applyVote(a.elo, b.elo, outcome);
    a.elo = next.a; b.elo = next.b;
    a.comparisons++; b.comparisons++;
  }
  return out;
}

/**
 * Map Elo to a 0-10 rating. Only compared tracks participate in the range, a track's
 * manual `initialRating` is a floor, and uncompared tracks keep their initial rating.
 */
export function balancedRatings(
  ranked: Map<string, RankedTrack>,
  initialRatings: Map<string, number | null | undefined> = new Map(),
): Map<string, number | null> {
  const compared = [...ranked.values()].filter((r) => r.comparisons > 0).map((r) => r.elo);
  const min = Math.min(...compared);
  const max = Math.max(...compared);
  const out = new Map<string, number | null>();
  for (const [id, r] of ranked) {
    const floor = initialRatings.get(id) ?? null;
    if (r.comparisons === 0) { out.set(id, floor); continue; }
    const scaled = max > min ? ((r.elo - min) / (max - min)) * 10 : 5;
    out.set(id, floor !== null ? Math.max(scaled, floor) : scaled);
  }
  return out;
}
