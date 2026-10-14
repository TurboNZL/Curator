import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyzeAudio, cutoffFromSpectrum, looksLikeKbps, verdictFor } from '../src/audioinfo.ts';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

describe('audio check (pure parts)', () => {
  it('finds the cutoff of a spectrum', () => {
    const rate = 44100, bins = 2048, binHz = rate / 2 / bins;
    const flat = (cut: number) => Array.from({ length: bins }, (_, i) => (i * binHz < cut ? -50 : -110));
    const sloped = Array.from({ length: bins }, (_, i) => -40 - (i * binHz) / 700); // a natural roll-off, no cliff
    expect(cutoffFromSpectrum(flat(16000), rate)).toBeGreaterThanOrEqual(15500);
    expect(cutoffFromSpectrum(flat(16000), rate)).toBeLessThanOrEqual(16500);
    expect(cutoffFromSpectrum(flat(20000), rate)).toBeGreaterThanOrEqual(19000);
    expect(cutoffFromSpectrum(Array.from({ length: bins }, () => -50), rate)).toBe(22000);
    expect(cutoffFromSpectrum(sloped, rate)).toBe(22000);
    expect(cutoffFromSpectrum(Array.from({ length: bins }, () => -150), rate)).toBe(0);
    expect(looksLikeKbps(20000)).toBe(320);
    expect(looksLikeKbps(16000)).toBe(128);
  });
  it('flags a high claim with no top end, never lossless', () => {
    expect(verdictFor(320, 'mp3', 17000, true)).toBe('transcode');
    expect(verdictFor(320, 'mp3', 20000, true)).toBe('ok');
    expect(verdictFor(128, 'mp3', 16000, true)).toBe('ok');
    expect(verdictFor(900, 'flac', 0, true)).toBe('ok');
    expect(verdictFor(320, 'mp3', 0, false)).toBe('unknown');
  });
});

describe.skipIf(!hasFfmpeg)('audio check (real ffmpeg)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'turbomusic-audio-'));
  const make = (name: string, lowRate: number | null, rate: string) => {
    const path = join(dir, name);
    // white noise has energy at every frequency, which is what "a real 320" looks like to this check; going through a lower sample
    // rate first leaves it with nothing above that rate's Nyquist, like a low-quality source re-encoded at 320
    let src = 'anoisesrc=d=20:c=white:a=0.3:r=44100';
    if (lowRate) {
      const wav = join(dir, `${name}.wav`);
      expect(spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', src, '-ar', String(lowRate), wav]).status).toBe(0);
      expect(spawnSync('ffmpeg', ['-y', '-i', wav, '-ar', '44100', '-b:a', rate, path]).status).toBe(0);
    } else expect(spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', src, '-b:a', rate, path]).status).toBe(0);
    return path;
  };
  it('tells a genuine 320 from one made out of a low-passed source', async () => {
    const real = await analyzeAudio(make('real.mp3', null, '320k'));
    const fake = await analyzeAudio(make('fake.mp3', 32000, '320k'));
    expect(real.kbps).toBeGreaterThan(300);
    expect(real.cutoffHz).toBeGreaterThanOrEqual(19000);
    expect(real.verdict).toBe('ok');
    expect(fake.kbps).toBeGreaterThan(300);
    expect(fake.cutoffHz).toBeLessThanOrEqual(18000);
    expect(fake.verdict).toBe('transcode'); expect(fake.looksLike).toBeLessThan(320);
  }, 60_000);
  it('says unknown for a file that is not audio', async () => {
    const r = await analyzeAudio(join(dir, 'nothing.mp3'));
    expect(r.verdict).toBe('unknown');
  });
});
