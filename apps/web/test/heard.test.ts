import { describe, expect, it } from 'vitest';
import { heardTrackIds, onlyHeard, tryNewPlaylist } from '../src/lib/heard.ts';
import type { Listen } from '../src/lib/listens.ts';

const L = (trackId: string | null) => ({ trackId }) as Listen;
const T = (id: string, albumId: string | null = null) => ({ id, albumId, artistId: 'a' });

describe('heard tracks', () => {
  it('collects tracks with at least one play, ignoring plays that match no track', () => {
    expect([...heardTrackIds([L('1'), L(null), L('1'), L('2')])].sort()).toEqual(['1', '2']);
  });
  it('ranks only heard tracks, but falls back while the history is (almost) empty', () => {
    const tracks = [T('1'), T('2'), T('3')];
    expect(onlyHeard(tracks, new Set(['1', '2']))).toMatchObject({ pool: [tracks[0], tracks[1]], fellBack: false });
    expect(onlyHeard(tracks, new Set(['1']))).toMatchObject({ fellBack: true });
    expect(onlyHeard(tracks, new Set()).pool).toHaveLength(3);
  });
  it('builds the "try something new" list from never-played, playable tracks with a cap per album', () => {
    const tracks = [...Array.from({ length: 6 }, (_, i) => T(`a${i}`, 'A')), T('b0', 'B'), T('heard', 'C'), T('mute', 'D')];
    const out = tryNewPlaylist(tracks, new Set(['heard']), (t) => t.id !== 'mute', 25, 2, () => 0.3);
    expect(out.map((t) => t.id)).not.toContain('heard');
    expect(out.map((t) => t.id)).not.toContain('mute');
    expect(out.filter((t) => t.albumId === 'A')).toHaveLength(2);
    expect(out.map((t) => t.id)).toContain('b0');
    expect(tryNewPlaylist(tracks, new Set(), () => true, 3, 9).length).toBe(3);
  });
});

import { mergeAllTracksOrder } from '../src/lib/albumMerge.ts';
describe('album order after an import', () => {
  const row = (trackId: string | null, newId?: string) => ({ trackId, newId, include: true });
  it('takes the edition order when the edition holds every existing track', () => {
    expect(mergeAllTracksOrder(['a', 'b', 'c'], [row('c'), row('b'), row('a'), row(null, 'n')])).toEqual(['c', 'b', 'a', 'n']);
    expect(mergeAllTracksOrder([], [row(null, 'x'), row(null, 'y')])).toEqual(['x', 'y']);
  });
  it('keeps the album order and slots new tracks in when the edition lacks some', () => {
    expect(mergeAllTracksOrder(['a', 'b', 'c'], [row('a'), row(null, 'n'), row('c')])).toEqual(['a', 'n', 'b', 'c']);
  });
});
