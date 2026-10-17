import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { MAX_CROSSFADE_SEC, MAX_CROSSFADE_SHIFT_SEC } from '@turbomusic/core';
import { useStore } from '../lib/store.ts';
import { isAndroidApp } from '../lib/native.ts';
import { ALIGN_WINDOW_SEC, fadeLabel, fadeStops, nearestStop, shiftFromDrag } from '../lib/crossfadeMath.ts';

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
 * The end of one song and the start of the next, with the crossfade as a box you drag left or right. Left makes the next song come in earlier
 * (the last seconds of this one are not played), which is what a song that ends in silence, or one that starts with silence, needs. Arrow keys
 * move it a tenth of a second (a second with Shift). The right edge of the picture is where the first song ends.
 */
export function CrossfadeAligner({ fadeSec, shiftSec, onShift }: { fadeSec: number; shiftSec: number; onShift: (sec: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; shift: number } | null>(null);
  const pct = (sec: number) => `${(sec / ALIGN_WINDOW_SEC) * 100}%`;
  const left = ALIGN_WINDOW_SEC - (shiftSec + fadeSec); // seconds from the left edge to where the next song starts
  const start = (e: PointerEvent<HTMLDivElement>) => { drag.current = { x: e.clientX, shift: shiftSec }; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current, w = box.current?.getBoundingClientRect().width;
    if (d && w) onShift(shiftFromDrag(d.shift, e.clientX - d.x, w, MAX_CROSSFADE_SHIFT_SEC));
  };
  const end = () => { drag.current = null; };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 1 : 0.1, dir = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    onShift(Math.round(Math.min(MAX_CROSSFADE_SHIFT_SEC, Math.max(0, shiftSec + dir * step)) * 10) / 10);
  };
  return (
    <div className="space-y-1.5">
      <div ref={box} className="relative h-[4.5rem] select-none overflow-hidden rounded-theme border border-line bg-raised/40">
        <div className="absolute inset-x-0 top-2 flex h-5 items-center justify-end rounded-sm bg-accent/25 pr-1.5 text-[10px] text-muted">first song ends here ▸</div>
        <div className="absolute bottom-2 flex h-5 items-center rounded-sm bg-good/25 pl-1.5 text-[10px] text-muted" style={{ left: pct(left), right: 0 }}>next song</div>
        <div role="slider" tabIndex={0} aria-label="Move the crossfade earlier or later" aria-valuemin={0} aria-valuemax={MAX_CROSSFADE_SHIFT_SEC} aria-valuenow={shiftSec}
          aria-valuetext={shiftSec > 0 ? `${shiftSec} seconds earlier than the end` : 'at the end of the song'}
          title="Drag left to bring the next song in earlier"
          onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onKeyDown={key}
          className="absolute inset-y-0 flex cursor-ew-resize touch-none items-center justify-center rounded-sm border border-accent bg-accent/40 outline-none focus-visible:ring-2 focus-visible:ring-accent"
          style={{ left: pct(left), width: `max(${pct(fadeSec)}, 1.5rem)` }}>
          <span className="pointer-events-none text-[10px] font-medium text-fg">⇆</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span>{shiftSec > 0 ? `The next song comes in ${Math.round((shiftSec + fadeSec) * 10) / 10} s before the end; the last ${shiftSec} s of this one are skipped.` : 'The fade finishes exactly where the first song ends. Drag the box left to bring the next song in earlier.'}</span>
        <button type="button" className="btn btn-ghost !px-2 !py-0.5 text-xs" disabled={shiftSec === 0} onClick={() => onShift(0)}>Reset position</button>
      </div>
    </div>
  );
}

/**
 * A playback rule's own crossfade for its pair of tracks, on the same slider as the device setting. Untouched it follows the device
 * setting; "Use device setting" goes back to that. The far left is a cut (no fade), which also beats a device crossfade.
 */
export function CrossfadePick({ value, onChange, shift, onShift, className }: { value: number | null | undefined; onChange: (v: number | null) => void; shift?: number | null; onShift?: (v: number) => void; className?: string }) {
  const device = useStore((s) => s.settings.crossfade);
  const own = typeof value === 'number';
  const shown = own ? value : device;
  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <FadeSlider className="min-w-[8rem] flex-1" label="Crossfade for this pair" value={shown} onChange={onChange} />
        <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted">{own ? (value > 0 ? fadeLabel(value) : 'cut') : `device: ${fadeLabel(device)}`}</span>
        <button type="button" className="btn btn-ghost !px-2 !py-0.5 text-xs" disabled={!own} onClick={() => onChange(null)} title="Follow the crossfade set for this device">Use device setting</button>
      </span>
      {onShift && shown > 0 && <CrossfadeAligner fadeSec={shown} shiftSec={shift ?? 0} onShift={onShift} />}
    </div>
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
