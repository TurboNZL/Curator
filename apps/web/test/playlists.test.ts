import { describe, expect, it } from 'vitest';
import { coverPlan, playlistAlbums } from '../src/lib/playlists.ts';

describe('playlist cover', () => {
  it('own picture wins', () => expect(coverPlan('own', ['a', 'b', 'c', 'd'])).toEqual({ mode: 'own', hash: 'own' }));
  it('four different covers make a 2x2 mosaic of the first four', () => expect(coverPlan(null, ['a', 'b', 'c', 'd', 'e'])).toEqual({ mode: 'mosaic', hashes: ['a', 'b', 'c', 'd'] }));
  it('fewer than four show the first alone', () => { expect(coverPlan(null, ['a', 'b', 'c'])).toEqual({ mode: 'single', hash: 'a' }); expect(coverPlan(null, ['a'])).toEqual({ mode: 'single', hash: 'a' }); });
  it('none falls back to the gradient', () => expect(coverPlan(null, [])).toEqual({ mode: 'none' }));
});

describe('album playlist entries', () => {
  const lib = {
    albumById: new Map([['a1', { id: 'a1', title: 'Album', cover: 'ac', trackIds: ['t1', 't2'], leads: [] }]]),
    releases: [{ id: 'r1', albumId: 'a1', title: 'Deluxe', cover: null, trackIds: ['t1', 'gone'] }],
    trackById: new Map([['t1', {}], ['t2', {}]]),
  } as unknown as Parameters<typeof playlistAlbums>[0];
  const p = { kind: 'albums', albumIds: ['r1', 'a1', 'missing'] } as unknown as Parameters<typeof playlistAlbums>[1];
  it('a release is an entry of its own with its tracks only, an album stays whole, unknown ids drop', () => {
    const e = playlistAlbums(lib, p);
    expect(e.map((x) => [x.id, x.release, x.trackIds])).toEqual([['r1', true, ['t1']], ['a1', false, ['t1', 't2']]]);
    expect(e[0].title).toBe('Album (Deluxe)');
    expect(e[0].cover).toBe('ac');
    expect(e[0].to).toBe('/albums/a1?release=r1');
  });
});
