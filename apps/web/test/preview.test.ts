import { describe, expect, it } from 'vitest';
import { previewStart } from '../src/lib/preview.ts';

describe('previewStart', () => {
  it('centres the 15 s on the middle of the track', () => expect(previewStart(200)).toBe(92.5));
  it('never runs past the end of a short track', () => expect(previewStart(20)).toBe(2.5));
  it('starts at 0 for a track shorter than the preview', () => expect(previewStart(10)).toBe(0));
  it('uses the seekable end when the length is unknown', () => expect(previewStart(Infinity, 120)).toBe(52.5));
  it('is null while nothing is known', () => { expect(previewStart(NaN)).toBeNull(); expect(previewStart(Infinity)).toBeNull(); });
});

import { sliceWindow, totalFromRange } from '../src/lib/rangePreview.ts';
describe('range slice', () => {
  it('reads the total from Content-Range', () => { expect(totalFromRange('bytes 0-0/9000000')).toBe(9000000); expect(totalFromRange('bytes 0-0/*')).toBeNull(); expect(totalFromRange(null)).toBeNull(); });
  it('centres the slice on the middle of the file', () => { const w = sliceWindow(10_000_000)!; expect(w.start).toBe(5_000_000 - 393216); expect(w.end - w.start + 1).toBe(786432); });
  it('uses small files whole', () => expect(sliceWindow(1_000_000)).toBeNull());
});
