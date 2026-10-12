import { describe, expect, it } from 'vitest';
import { makeQuestion, nextQuestion, votesFor, type Q } from '../src/lib/questions.ts';

const tracks: Q[] = Array.from({ length: 40 }, (_, i) => ({ id: `t${i}`, elo: 1000 + i * 8, comparisons: i % 6, rating: Math.min(10, i / 4) }));
let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

describe('Elo questions', () => {
  it('makes every format from a normal library', () => {
    for (const k of ['duel', 'triple', 'benchmark', 'love'] as const) expect(makeQuestion(tracks, k, rnd)?.kind).toBe(k);
  });
  it('a triple has three different tracks and records two wins for the pick', () => {
    const q = makeQuestion(tracks, 'triple', rnd)!;
    if (q.kind !== 'triple') throw new Error();
    expect(new Set(q.ids).size).toBe(3);
    const v = votesFor(q, q.ids[1]);
    expect(v).toHaveLength(2);
    expect(v.every((x) => x.winnerId === q.ids[1])).toBe(true);
  });
  it('benchmark yes/no and love map to the right votes; skip records nothing', () => {
    const b = makeQuestion(tracks, 'benchmark', rnd)!;
    if (b.kind !== 'benchmark') throw new Error();
    expect(votesFor(b, 'yes')[0].winnerId).toBe(b.id);
    expect(votesFor(b, 'no')[0].winnerId).toBe(b.ref);
    const l = makeQuestion(tracks, 'love', rnd)!;
    expect(votesFor(l, 'yes')[0].boost).toBe(1);
    expect(votesFor(l, 'no')[0].boost).toBe(-1);
    expect(votesFor(l, 'skip')).toEqual([]);
  });
  it('small libraries fall back to a duel and tiny ones to nothing', () => {
    expect(nextQuestion(tracks.slice(0, 2), undefined, rnd)?.kind).toBe('duel');
    expect(nextQuestion(tracks.slice(0, 1), undefined, rnd)).toBeNull();
  });
});
