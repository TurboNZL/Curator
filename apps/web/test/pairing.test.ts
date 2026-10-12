import { describe, expect, it } from 'vitest';
import { pairLacksAudio, pickPair, rankPool } from '../src/lib/pairing.ts';

const t = (id: string, file: string | null, elo = 1000, comparisons = 0) => ({ id, file, elo, comparisons });

describe('ranking pool', () => {
  const tracks = [t('a', 'f1'), t('b', null), t('c', 'f3'), t('d', null)];

  it('uses every track when audio is not required', () => {
    expect(rankPool(tracks, false)).toEqual({ pool: tracks, fellBack: false });
  });

  it('keeps only tracks with audio when two or more have it', () => {
    const r = rankPool(tracks, true);
    expect(r.pool.map((x) => x.id)).toEqual(['a', 'c']);
    expect(r.fellBack).toBe(false);
  });

  it('falls back to all tracks while fewer than two have audio, so the page is never empty', () => {
    const r = rankPool([t('a', 'f1'), t('b', null), t('c', null)], true);
    expect(r.pool).toHaveLength(3);
    expect(r.fellBack).toBe(true);
    expect(rankPool([t('a', null), t('b', null)], true).fellBack).toBe(true);
  });

  it('never pairs a track without audio from a filtered pool', () => {
    const { pool } = rankPool(tracks, true);
    for (let i = 0; i < 20; i++) {
      const p = pickPair(pool, Math.random);
      expect(p?.every((x) => x.file)).toBe(true);
    }
  });
});

describe('does the toggle need a new pair', () => {
  const byId = new Map([t('a', 'f'), t('b', 'f'), t('c', null)].map((x) => [x.id, x]));

  it('keeps a pair whose tracks both have audio', () => expect(pairLacksAudio(['a', 'b'], byId)).toBe(false));
  it('replaces a pair with a track that has none', () => { expect(pairLacksAudio(['a', 'c'], byId)).toBe(true); expect(pairLacksAudio(['c', 'zzz'], byId)).toBe(true); });
  it('has nothing to replace before a pair exists', () => expect(pairLacksAudio(null, byId)).toBe(false));
});

import { tierPool } from '../src/lib/pairing.ts';
describe('tierPool', () => {
  const ts = Array.from({ length: 20 }, (_, i) => ({ id: `t${i}`, elo: 1000 + i * 10, comparisons: i < 2 ? 0 : 5, effectiveRating: i / 2 }));
  it('top tiers are the highest Elo among compared tracks', () => {
    expect(tierPool(ts, { tier: 'top10', min: 0, max: 10 }).map((t) => t.id)).toEqual(['t19', 't18']);
    expect(tierPool(ts, { tier: 'top25', min: 0, max: 10 }).length).toBe(5); // 18 compared, a quarter rounded up is 5
  });
  it('halves split the compared tracks; few votes and range filter directly', () => {
    expect(tierPool(ts, { tier: 'upper', min: 0, max: 10 }).length + tierPool(ts, { tier: 'lower', min: 0, max: 10 }).length).toBe(18);
    expect(tierPool(ts, { tier: 'few', min: 0, max: 10 }).map((t) => t.id)).toEqual(['t0', 't1']);
    expect(tierPool(ts, { tier: 'range', min: 8, max: 9 }).map((t) => t.id)).toEqual(['t16', 't17', 't18']);
    expect(tierPool(ts, { tier: 'any', min: 0, max: 10 })).toBe(ts);
  });
});
