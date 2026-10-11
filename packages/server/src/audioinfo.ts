import { spawn } from 'node:child_process';
import { join } from 'node:path';

/**
 * Measures what an audio file really is, because a track's stored "320" often is not: a 128 kbit stream re-encoded as a 320 kbit
 * MP3 still says 320 but has nothing above the old encoder's low-pass. Two measurements:
 *  - ffprobe: codec, sample rate and the actual bit rate of the file;
 *  - the highest frequency that still holds sound (the "cutoff"), from an FFT of 90 s taken from the middle of the track. Lossy
 *    encoders low-pass at roughly 16 kHz (128k), 18-19 kHz (192-256k) and 20 kHz (320k, V0). This is a heuristic, not a proof.
 */
export interface AudioReport {
  codec: string;
  /** what the file measures, in kbit/s (container average) */
  kbps: number;
  sampleRate: number;
  durationSec: number;
  /** highest band (Hz) that has sound in it; 0 = nothing above 16 kHz */
  cutoffHz: number;
  /** the bit rate class the cutoff points to, in kbit/s (128, 192, 256 or 320) */
  looksLike: number;
  /** 'ok' = consistent; 'transcode' = the file claims more than its content has; 'unknown' = could not measure */
  verdict: 'ok' | 'transcode' | 'unknown';
}

function run(cmd: string, args: string[], timeoutMs: number): Promise<{ out: string; err: string; code: number | null }> {
  return new Promise((resolve) => {
    let out = '', err = '';
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', (d: Buffer) => { if (out.length < 200_000) out += d.toString(); });
    child.stderr.on('data', (d: Buffer) => { if (err.length < 400_000) err += d.toString(); });
    child.on('error', () => { clearTimeout(timer); resolve({ out, err, code: -1 }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ out, err, code }); });
  });
}

const FFT = 4096;

/** In-place radix-2 FFT (power of two length). */
function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

/** Average power spectrum in dB (FFT/2 bins from 0 to Nyquist) of mono 16-bit samples. Pure. */
export function spectrumDb(samples: Int16Array): number[] {
  const half = FFT / 2, power = new Float64Array(half);
  const win = Float64Array.from({ length: FFT }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT - 1)));
  const re = new Float64Array(FFT), im = new Float64Array(FFT);
  let frames = 0;
  for (let at = 0; at + FFT <= samples.length; at += FFT) {
    for (let i = 0; i < FFT; i++) { re[i] = (samples[at + i] / 32768) * win[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < half; k++) power[k] += re[k] * re[k] + im[k] * im[k];
    frames++;
  }
  return Array.from(power, (p) => 10 * Math.log10(p / Math.max(1, frames) + 1e-20));
}

/**
 * The highest frequency that still has sound, from a spectrum: smooth it into 500 Hz steps and look for the cliff an encoder's low-pass
 * leaves (the level falling at least 30 dB within 1 kHz, above 9 kHz). The cutoff is where the cliff is. No cliff means sound all the way
 * up (it reports Nyquist). 0 = silence. Pure.
 */
export function cutoffFromSpectrum(db: number[], sampleRate: number): number {
  const binHz = sampleRate / 2 / db.length, step = Math.max(1, Math.round(500 / binHz));
  const steps: { hz: number; level: number }[] = [];
  for (let i = 0; i + step <= db.length; i += step) {
    const slice = db.slice(i, i + step);
    steps.push({ hz: (i + step / 2) * binHz, level: 10 * Math.log10(slice.reduce((n, d) => n + 10 ** (d / 10), 0) / step) });
  }
  const loud = steps.filter((x) => x.hz > 500 && x.hz < 8000).reduce((m, x) => Math.max(m, x.level), -200);
  if (loud < -70) return 0; // silence
  let best = 0, at = -1;
  for (let i = 0; i + 2 < steps.length; i++) {
    if (steps[i].hz < 9000) continue;
    const drop = steps[i].level - steps[i + 2].level;
    if (drop > best) { best = drop; at = i; }
  }
  if (best < 30) return Math.round(sampleRate / 2 / 250) * 250;
  return Math.round(steps[at].hz / 250) * 250; // where the level starts to fall
}

export const looksLikeKbps = (cutoffHz: number): number => (cutoffHz >= 19500 ? 320 : cutoffHz >= 18000 ? 256 : cutoffHz >= 16500 ? 192 : 128);

/** The verdict for a measured file (the lossless and very low rates are never "fake"). Pure. */
export function verdictFor(kbps: number, codec: string, cutoffHz: number, measured: boolean): AudioReport['verdict'] {
  if (!measured) return 'unknown';
  if (/^(flac|alac|pcm|wav)/i.test(codec)) return 'ok';
  // a file that claims at least 224 kbit/s but has no sound above 17 kHz was made from a lower-quality source
  if (kbps >= 224 && cutoffHz <= 18000) return 'transcode';
  return 'ok';
}

export async function analyzeAudio(path: string, o: { ffmpegDir?: string } = {}): Promise<AudioReport> {
  const bin = (n: string) => (o.ffmpegDir ? join(o.ffmpegDir, n) : n);
  const probe = await run(bin('ffprobe'), ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_name,sample_rate,bit_rate:format=bit_rate,duration', '-of', 'json', path], 20_000);
  let codec = '', sampleRate = 0, kbps = 0, durationSec = 0;
  try {
    const j = JSON.parse(probe.out) as { streams?: { codec_name?: string; sample_rate?: string; bit_rate?: string }[]; format?: { bit_rate?: string; duration?: string } };
    codec = j.streams?.[0]?.codec_name ?? '';
    sampleRate = Number(j.streams?.[0]?.sample_rate) || 0;
    kbps = Math.round((Number(j.format?.bit_rate) || Number(j.streams?.[0]?.bit_rate) || 0) / 1000);
    durationSec = Number(j.format?.duration) || 0;
  } catch { /* unreadable: reported as unknown below */ }
  if (!codec) return { codec: '', kbps: 0, sampleRate: 0, durationSec: 0, cutoffHz: 0, looksLike: 0, verdict: 'unknown' };

  // 90 s from the middle, decoded to mono 16-bit at the file's own rate so nothing is resampled away
  let measured = false, cutoffHz = 0;
  if (sampleRate >= 40000) {
    const start = Math.max(0, durationSec / 2 - 45);
    const pcm = await new Promise<Buffer>((resolve) => {
      const chunks: Buffer[] = [];
      const child = spawn(bin('ffmpeg'), ['-v', 'error', '-ss', String(start), '-t', '90', '-i', path, '-vn', '-ac', '1', '-ar', String(sampleRate), '-f', 's16le', '-'], { stdio: ['ignore', 'pipe', 'ignore'] });
      const timer = setTimeout(() => child.kill('SIGKILL'), 120_000);
      child.stdout.on('data', (d: Buffer) => chunks.push(d));
      child.on('error', () => { clearTimeout(timer); resolve(Buffer.alloc(0)); });
      child.on('close', () => { clearTimeout(timer); resolve(Buffer.concat(chunks)); });
    });
    if (pcm.length >= FFT * 2 * 8) {
      const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));
      const hz = cutoffFromSpectrum(spectrumDb(samples), sampleRate);
      if (hz > 0) { cutoffHz = hz; measured = true; }
    }
  }
  return { codec, kbps, sampleRate, durationSec, cutoffHz, looksLike: measured ? looksLikeKbps(cutoffHz) : 0, verdict: verdictFor(kbps, codec, cutoffHz, measured) };
}
