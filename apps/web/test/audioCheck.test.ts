import { describe, expect, it } from 'vitest';
import { claimedKbps, qualityOf } from '../src/lib/audioCheck.ts';

const c = (kbps: number, verdict: 'ok' | 'transcode' | 'unknown' = 'ok', file = 'f') => ({ kbps, codec: 'mp3', cutoffHz: 20000, looksLike: 320, verdict, file, at: 1 });

describe('audio check results', () => {
  it('reads stored bit rates', () => {
    expect(claimedKbps('320 kbps')).toBe(320);
    expect(claimedKbps('128')).toBe(128);
    expect(claimedKbps('256000')).toBe(256);
    expect(claimedKbps(null)).toBeNull();
    expect(claimedKbps('abc')).toBeNull();
  });
  it('classifies a track', () => {
    expect(qualityOf({ file: 'f', bitrate: '320 kbps', audioCheck: undefined })).toBe('unchecked');
    expect(qualityOf({ file: 'g', bitrate: '320 kbps', audioCheck: c(320) })).toBe('unchecked'); // the file changed since
    expect(qualityOf({ file: 'f', bitrate: '320 kbps', audioCheck: c(320, 'transcode') })).toBe('transcode');
    expect(qualityOf({ file: 'f', bitrate: '320 kbps', audioCheck: c(128) })).toBe('mismatch');
    expect(qualityOf({ file: 'f', bitrate: '128 kbps', audioCheck: c(130) })).toBe('ok');
    expect(qualityOf({ file: 'f', bitrate: null, audioCheck: c(320, 'unknown') })).toBe('unknown');
  });
});
