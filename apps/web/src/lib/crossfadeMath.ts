/**
 * The arithmetic of a crossfade, kept apart from the player so it can be tested. The player (lib/player.ts) owns two <audio> elements:
 * the one playing and a spare. A few seconds before the end it loads the next track into the spare, and when the time comes both
 * run together while their volumes follow an equal-power curve (the sum of the two loudnesses stays level, so there is no dip).
 */

/** Volumes (0..1, before the user's volume) of the outgoing and incoming track `progress` (0..1) of the way through a fade. */
export function fadeGains(progress: number): { out: number; in: number } {
  const p = Math.min(1, Math.max(0, progress));
  return { out: Math.cos((p * Math.PI) / 2), in: Math.sin((p * Math.PI) / 2) };
}

/** The shortest fade there is; anything below counts as a cut. */
export const MIN_FADE_SEC = 0.1;

/**
 * The stops of the crossfade sliders: fine where it matters (a tenth of a second up to 2 s), then a quarter, then half seconds up to
 * the longest fade. One slider position is one stop, so the short lengths can be told apart without a huge slider.
 */
export function fadeStops(max: number): number[] {
  const out: number[] = [];
  const add = (from: number, to: number, step: number) => { for (let n = Math.round(from / step); n * step <= to + 1e-9; n++) { const v = Math.round(n * step * 100) / 100; if (v <= max && (!out.length || v > out[out.length - 1])) out.push(v); } };
  add(0, 2, 0.1); add(2.25, 5, 0.25); add(5.5, max, 0.5);
  return out;
}
/** The stop nearest to a length. */
export function nearestStop(stops: number[], sec: number): number {
  let best = 0;
  for (let i = 1; i < stops.length; i++) if (Math.abs(stops[i] - sec) < Math.abs(stops[best] - sec)) best = i;
  return best;
}
/** "off", "0.3 s", "2.25 s", "8 s" */
export const fadeLabel = (sec: number) => (sec > 0 ? `${Math.round(sec * 100) / 100} s` : 'off');

/** Seconds before the end at which the spare is loaded (a download may be needed first). */
export const PREPARE_AHEAD_SEC = 6;
/** Fades never start earlier than this much before the end plus the timer's slack (the player reports about four times a second). */
export const TRIGGER_SLACK_SEC = 0.3;

/**
 * How long the fade really lasts: what was asked, but never more than a third of the playing track (a 20 s sketch cannot give away
 * 12 s) and never more than is left of it. 0 means: do not crossfade this change.
 */
export function fadeLength(wantedSec: number, durationSec: number, remainingSec: number): number {
  if (!(wantedSec > 0) || !Number.isFinite(durationSec) || durationSec <= 0 || !Number.isFinite(remainingSec)) return 0;
  const len = Math.min(wantedSec, durationSec / 3, Math.max(0, remainingSec));
  return len >= MIN_FADE_SEC ? len : 0;
}

/** Is it time to load the next track into the spare? */
export const shouldPrepare = (wantedSec: number, remainingSec: number) => wantedSec > 0 && remainingSec <= wantedSec + PREPARE_AHEAD_SEC;
/** Is it time to start the fade? */
export const shouldFade = (wantedSec: number, remainingSec: number) => wantedSec > 0 && remainingSec <= wantedSec + TRIGGER_SLACK_SEC;
