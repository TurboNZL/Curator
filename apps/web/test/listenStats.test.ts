import { describe, expect, it } from 'vitest';
import { computeListenStats, dayKey, rangeFor } from '../src/lib/listenStats.ts';
import type { Listen } from '../src/lib/listens.ts';

let n = 0;
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const L = (ts: number, o: Partial<Listen> = {}): Listen => ({ id: `l${n++}`, ts, ms: 200000, trackId: null, artistId: null, albumId: null, title: 'Song', artist: 'Artist', album: 'Album', uri: 'spotify:track:aaaaaaaaaaaaaaaaaaaaaa', skipped: false, shuffle: null, platform: 'linux', reasonEnd: null, source: 'spotify', ...o });

describe('listen stats', () => {
  const day = (d: number, h = 12, o: Partial<Listen> = {}) => L(at(2026, 8, d, h), o);
  const all = [day(1), day(2), day(3), day(3, 14, { title: 'B', uri: 'spotify:track:bbbbbbbbbbbbbbbbbbbbbb', artist: 'Other', trackId: 't1' }), day(7, 22, { skipped: true, ms: 10000 })];
  const s = computeListenStats(all, {}, { now: at(2026, 8, 8) });

  it('totals', () => {
    expect(s.plays).toBe(5);
    expect(s.skips).toBe(1);
    expect(s.distinctTracks).toBe(2);
    expect(s.distinctArtists).toBe(2);
    expect(s.daysActive).toBe(4);
    expect(s.ms).toBe(200000 * 4 + 10000);
  });
  it('ranks by plays', () => {
    expect(s.topArtists[0]).toMatchObject({ label: 'Artist', plays: 4 });
    expect(s.topTracks[0].plays).toBe(4);
    expect(s.topAlbums[0].label).toBe('Album');
  });
  it('finds streaks', () => {
    expect(s.longestStreak).toEqual({ days: 3, from: '2026-08-01', to: '2026-08-03' });
    expect(s.currentStreak).toBe(1); // the 7th was yesterday, the 8th has no play yet
  });
  it('counts the clock', () => {
    expect(s.byHour[12]).toBe(200000 * 3);
    expect(s.byHour[22]).toBe(10000);
    expect(s.clock.flat().reduce((a, b) => a + b, 0)).toBe(5);
    expect(s.byWeekday.reduce((a, b) => a + b, 0)).toBe(5);
  });
  it('lists plays that are not in the library', () => {
    expect(s.notInLibrary[0]).toMatchObject({ label: 'Song', plays: 4 });
  });
  it('applies the minimum length and ranges', () => {
    expect(computeListenStats(all, {}, { minMs: 30000 }).plays).toBe(4);
    expect(computeListenStats(all, { from: at(2026, 8, 3, 0) }).plays).toBe(3);
  });
  it('splits sessions at 30 minute gaps', () => {
    expect(s.sessions.count).toBe(5);
  });
  it('counts new artists per month', () => {
    expect(s.byMonth).toEqual([{ month: '2026-08', ms: 810000, plays: 5, newArtists: 2 }]);
  });
  it('shows earlier years on this day', () => {
    const t = computeListenStats([L(at(2024, 8, 8)), L(at(2025, 8, 8), { title: 'Z' })], {}, { now: at(2026, 8, 8) });
    expect(t.onThisDay.map((x) => x.year)).toEqual([2025, 2024]);
  });
  it('has quick ranges', () => { expect(rangeFor('4w', at(2026, 8, 29)).from).toBe(at(2026, 8, 29) - 28 * 86400000); expect(dayKey(at(2026, 1, 2))).toBe('2026-01-02'); });
});
