import { describe, expect, it } from 'vitest';
import { PlayLog } from '../src/lib/playLog.ts';

describe('one history row per play', () => {
  it('logs a play once, however many things fire when it ends', () => {
    const l = new PlayLog(); l.begin('a'); l.started('a');
    expect(l.claim('a', 96)).toBe(true); // a skip...
    expect(l.claim('a', 96)).toBe(false); // ...and the "ended" for the same moment
  });
  it('logs nothing for a track that never started (a second press before the sound began)', () => {
    const l = new PlayLog(); l.begin('a'); l.started('a'); expect(l.claim('a', 49)).toBe(true);
    l.begin('b'); // loading b: the element still reports a's old position
    expect(l.claim('b', 49)).toBe(false);
    l.started('b'); expect(l.claim('b', 5)).toBe(true);
  });
  it('plays of the same track again are separate plays', () => {
    const l = new PlayLog(); l.begin('a'); l.started(); expect(l.claim('a', 30)).toBe(true);
    l.begin('a'); l.started(); expect(l.claim('a', 20)).toBe(true);
  });
  it('ignores the wrong track, under a second, and after clear', () => {
    const l = new PlayLog(); l.begin('a'); l.started('a');
    expect(l.claim('b', 30)).toBe(false); expect(l.claim('a', 0.4)).toBe(false); expect(l.claim('a', 30)).toBe(true);
    l.clear(); expect(l.claim('a', 30)).toBe(false);
  });
  it('a start for another track does not count', () => { const l = new PlayLog(); l.begin('a'); l.started('x'); expect(l.claim('a', 30)).toBe(false); });
});
