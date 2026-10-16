import type { CSSProperties } from 'react';
import { MAX_CROSSFADE_SEC } from '@turbomusic/core';
import { useStore } from '../lib/store.ts';
import { isAndroidApp } from '../lib/native.ts';
import { Select } from './Select.tsx';

const CHOICES = [0, 1, 2, 3, 4, 5, 6, 8, 10, MAX_CROSSFADE_SEC];
export const fadeText = (sec: number) => (sec > 0 ? `${sec} s` : 'off');

/** A playback rule's own crossfade for its pair of tracks: the device setting, none, or a length. */
export function CrossfadePick({ value, onChange, className }: { value: number | null | undefined; onChange: (v: number | null) => void; className?: string }) {
  const device = useStore((s) => s.settings.crossfade);
  const custom = typeof value === 'number' && !CHOICES.includes(value);
  return (
    <Select className={className ?? 'w-56'} aria-label="Crossfade for this pair" value={typeof value === 'number' ? String(value) : 'default'}
      onChange={(v) => onChange(v === 'default' ? null : Number(v))}
      options={[
        { value: 'default', label: `Device setting (${fadeText(device)})` },
        { value: '0', label: 'No crossfade (cut)' },
        ...(custom ? [{ value: String(value), label: `${value} s` }] : []),
        ...CHOICES.filter((n) => n > 0).map((n) => ({ value: String(n), label: `${n} s` })),
      ]} />
  );
}

/** Settings > Playback: how long one track fades into the next on this device. */
export function CrossfadeCard() {
  const sec = useStore((s) => s.settings.crossfade);
  const update = useStore((s) => s.updateSettings);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">The end of a song fades out while the next one fades in. It happens when a song runs out by itself; pressing Next or choosing a song still changes at once. A playback rule can give one pair of songs its own length (or none), and that wins over this slider. It works where the page plays the sound (browsers and the desktop app); the Android app's own player and Spotify devices do not crossfade.{isAndroidApp() ? ' This is the Android app, so it has no effect here.' : ''}</p>
      <label className="block text-sm"><span className="mb-1 flex justify-between"><span className="font-medium">Crossfade</span><span className="tabular-nums text-muted">{fadeText(sec)}</span></span>
        <input type="range" min={0} max={MAX_CROSSFADE_SEC} step={0.5} className="bt-range bt-hit w-full" style={{ '--p': `${(sec / MAX_CROSSFADE_SEC) * 100}%` } as CSSProperties}
          value={sec} onChange={(e) => update({ crossfade: Number(e.target.value) })} aria-label="Crossfade in seconds" /></label>
    </div>
  );
}
