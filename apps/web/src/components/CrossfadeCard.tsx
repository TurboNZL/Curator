import type { CSSProperties } from 'react';
import { MAX_CROSSFADE_SEC } from '@turbomusic/core';
import { useStore } from '../lib/store.ts';
import { isAndroidApp } from '../lib/native.ts';
import { fadeLabel, fadeStops, nearestStop } from '../lib/crossfadeMath.ts';

const STOPS = fadeStops(MAX_CROSSFADE_SEC);
export const fadeText = fadeLabel;

/** A slider over the crossfade lengths: a tenth of a second apart up to 2 s, a quarter up to 5 s, then half seconds. */
export function FadeSlider({ value, onChange, label, disabled, className }: { value: number; onChange: (sec: number) => void; label: string; disabled?: boolean; className?: string }) {
  const i = nearestStop(STOPS, value);
  return (
    <input type="range" min={0} max={STOPS.length - 1} step={1} value={i} disabled={disabled} aria-label={label} aria-valuetext={fadeLabel(STOPS[i])}
      className={`bt-range bt-hit ${className ?? 'w-full'}`} style={{ '--p': `${(i / (STOPS.length - 1)) * 100}%` } as CSSProperties}
      onChange={(e) => onChange(STOPS[Number(e.target.value)] ?? 0)} />
  );
}

/**
 * A playback rule's own crossfade for its pair of tracks, on the same slider as the device setting. Untouched it follows the device
 * setting; "Use device setting" goes back to that. The far left is a cut (no fade), which also beats a device crossfade.
 */
export function CrossfadePick({ value, onChange, className }: { value: number | null | undefined; onChange: (v: number | null) => void; className?: string }) {
  const device = useStore((s) => s.settings.crossfade);
  const own = typeof value === 'number';
  const shown = own ? value : device;
  return (
    <span className={`flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 ${className ?? ''}`}>
      <FadeSlider className="min-w-[8rem] flex-1" label="Crossfade for this pair" value={shown} onChange={onChange} />
      <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted">{own ? (value > 0 ? fadeLabel(value) : 'cut') : `device: ${fadeLabel(device)}`}</span>
      <button type="button" className="btn btn-ghost !px-2 !py-0.5 text-xs" disabled={!own} onClick={() => onChange(null)} title="Follow the crossfade set for this device">Use device setting</button>
    </span>
  );
}

/** Settings > Playback: how long one track fades into the next on this device. */
export function CrossfadeCard() {
  const sec = useStore((s) => s.settings.crossfade);
  const update = useStore((s) => s.updateSettings);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">The end of a song fades out while the next one fades in. It happens when a song runs out by itself; pressing Next or choosing a song still changes at once. A playback rule can give one pair of songs its own length (or none), and that wins over this slider. It works where the page plays the sound (browsers and the desktop app); the Android app's own player and Spotify devices do not crossfade.{isAndroidApp() ? ' This is the Android app, so it has no effect here.' : ''}</p>
      <label className="block text-sm"><span className="mb-1 flex justify-between"><span className="font-medium">Crossfade</span><span className="tabular-nums text-muted">{fadeLabel(sec)}</span></span>
        <FadeSlider label="Crossfade in seconds" value={sec} onChange={(v) => update({ crossfade: v })} /></label>
    </div>
  );
}
