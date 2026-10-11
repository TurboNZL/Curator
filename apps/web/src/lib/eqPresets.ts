/** The equaliser's bands, presets and the level maths. Pure, so it is tested; the Web Audio graph is in eq.ts, the Android one in the app. */

/** Centre frequencies (Hz) of the ten bands, one octave apart. */
export const EQ_FREQS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;
export const EQ_BANDS = EQ_FREQS.length;
export const EQ_RANGE_DB = 12;
export const EQ_FLAT: readonly number[] = Array(EQ_BANDS).fill(0);

export interface EqPreset { id: string; label: string; bands: readonly number[] }

export const EQ_PRESETS: readonly EqPreset[] = [
  { id: 'flat', label: 'Flat', bands: EQ_FLAT },
  { id: 'bass', label: 'Bass boost', bands: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0] },
  { id: 'bass-cut', label: 'Bass reducer', bands: [-6, -5, -4, -2, 0, 0, 0, 0, 0, 0] },
  { id: 'treble', label: 'Treble boost', bands: [0, 0, 0, 0, 0, 1, 2, 4, 5, 6] },
  { id: 'hiphop', label: 'Hip-hop', bands: [5, 4, 2, 3, -1, -1, 1, -1, 2, 3] },
  { id: 'rock', label: 'Rock', bands: [4, 3, 2, -1, -2, -1, 1, 3, 4, 4] },
  { id: 'pop', label: 'Pop', bands: [-1, 1, 3, 4, 3, 0, -1, -1, 1, 2] },
  { id: 'electronic', label: 'Electronic', bands: [4, 3, 1, 0, -2, 2, 1, 2, 4, 5] },
  { id: 'acoustic', label: 'Acoustic', bands: [3, 3, 2, 1, 1, 1, 2, 3, 3, 2] },
  { id: 'classical', label: 'Classical', bands: [3, 2, 1, 1, 0, 0, 0, 1, 2, 3] },
  { id: 'vocal', label: 'Vocal', bands: [-2, -2, -1, 1, 3, 4, 3, 1, 0, -1] },
  { id: 'loudness', label: 'Loudness', bands: [5, 3, 0, 0, -1, 0, 0, -1, 3, 4] },
  { id: 'speech', label: 'Podcast / speech', bands: [-4, -3, -1, 0, 2, 3, 3, 2, 0, -2] },
];

export interface EqConfig {
  on: boolean;
  /** dB per band, EQ_FREQS order */
  bands: readonly number[];
  /** overall level in dB, on top of the automatic headroom */
  preamp: number;
  /** extra low shelf under ~110 Hz, in dB (0..12) */
  bass: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : 0));

/** Settings come from storage and may be old or hand-edited: always ten finite bands inside the range. */
export function cleanBands(b: unknown): number[] {
  const src = Array.isArray(b) ? b : [];
  return EQ_FREQS.map((_, i) => clamp(Number(src[i] ?? 0), -EQ_RANGE_DB, EQ_RANGE_DB));
}

/** The preset whose bands equal `bands`, or null for a hand-made curve. */
export function presetFor(bands: readonly number[]): EqPreset | null {
  return EQ_PRESETS.find((p) => p.bands.every((g, i) => g === bands[i])) ?? null;
}

/** True when the curve changes nothing (the graph can stay out of the sound's way). */
export const isFlat = (c: EqConfig) => !c.on || (c.bass === 0 && c.preamp === 0 && c.bands.every((g) => g === 0));

/** The loudest boost the curve applies, in dB (bass shelf included): what the pre-gain has to make room for. */
export const peakBoost = (c: EqConfig) => Math.max(0, ...c.bands) + Math.max(0, c.bass);

/** Pre-gain in dB: the user's preamp minus most of the boost (peaks rise by roughly 55% of it in typical music). */
export const preGainDb = (c: EqConfig) => c.preamp - peakBoost(c) * 0.55;

/**
 * The curve's gain at `hz`, interpolated on a log-frequency axis between the band centres. Used to hand the curve to hardware
 * equalisers with other (often only five) bands: Android's `Equalizer` tells the centre of each of its bands.
 */
export function gainAt(bands: readonly number[], hz: number): number {
  if (hz <= EQ_FREQS[0]) return bands[0];
  if (hz >= EQ_FREQS[EQ_BANDS - 1]) return bands[EQ_BANDS - 1];
  let i = 0;
  while (EQ_FREQS[i + 1] < hz) i++;
  const t = (Math.log(hz) - Math.log(EQ_FREQS[i])) / (Math.log(EQ_FREQS[i + 1]) - Math.log(EQ_FREQS[i]));
  return bands[i] + (bands[i + 1] - bands[i]) * t;
}

/** The bass shelf (a low shelf at ~110 Hz) as a gain at `hz`: full under 80 Hz, fading out by about 220 Hz. */
export function bassAt(bass: number, hz: number): number {
  if (hz <= 80) return bass;
  if (hz >= 220) return 0;
  return bass * (1 - (Math.log(hz) - Math.log(80)) / (Math.log(220) - Math.log(80)));
}
