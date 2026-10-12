import { describe, expect, it } from 'vitest';
import { coverPool, droppedCover, planRemoveCover, withCoverKept } from '../src/lib/covers.ts';

describe('cover pool keeping', () => {
  it('reports only a cover that was replaced or cleared', () => {
    expect(droppedCover('a', 'b')).toBe('a');
    expect(droppedCover('a', null)).toBe('a');
    expect(droppedCover('a', 'a')).toBeNull();
    expect(droppedCover(null, 'a')).toBeNull();
  });
  it('adds a replaced image to the album list once and only when nothing else keeps it', () => {
    expect(withCoverKept({ covers: ['x'] }, [{ cover: 'y' }], 'a')).toEqual(['x', 'a']);
    const same = ['a'];
    expect(withCoverKept({ covers: same }, [], 'a')).toBe(same);
    expect(withCoverKept({ covers: [] }, [{ cover: 'a' }], 'a')).toEqual([]);
  });
  it('deleting clears every reference', () => {
    const album = { cover: 'a', coverPicked: true, covers: ['a', 'b'] };
    const rel = [{ id: 'r1', cover: 'a' }, { id: 'r2', cover: 'b' }];
    const p = planRemoveCover(album, rel, 'a');
    expect(p.album).toEqual({ covers: ['b'], cover: null, coverPicked: false });
    expect(p.releaseIds).toEqual(['r1']);
    expect(coverPool({ ...p.album }, [{ cover: null }, { cover: 'b' }])).toEqual(['b']);
  });
  it('keeps an unrelated picked cover', () => {
    expect(planRemoveCover({ cover: 'a', coverPicked: true, covers: ['a', 'b'] }, [], 'b').album).toEqual({ covers: ['a'], cover: 'a', coverPicked: true });
  });
});
