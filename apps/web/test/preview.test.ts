import { describe, expect, it } from 'vitest';
import { previewStart } from '../src/lib/preview.ts';

describe('previewStart', () => {
  it('centres the 15 s on the middle of the track', () => expect(previewStart(200)).toBe(92.5));
  it('never runs past the end of a short track', () => expect(previewStart(20)).toBe(5));
  it('starts at 0 for a track shorter than the preview', () => expect(previewStart(10)).toBe(0));
  it('uses the seekable end when the length is unknown', () => expect(previewStart(Infinity, 120)).toBe(52.5));
  it('is null while nothing is known', () => { expect(previewStart(NaN)).toBeNull(); expect(previewStart(Infinity)).toBeNull(); });
});
