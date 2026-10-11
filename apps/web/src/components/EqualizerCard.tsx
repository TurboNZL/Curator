import type { CSSProperties } from 'react';
import { RotateCcw } from 'lucide-react';
import { useStore } from '../lib/store.ts';
import { cn } from '../lib/cn.ts';
import { EQ_BANDS, EQ_FLAT, EQ_FREQS, EQ_PRESETS, EQ_RANGE_DB, presetFor } from '../lib/eqPresets.ts';
import { Select } from './Select.tsx';

const hzLabel = (hz: number) => (hz >= 1000 ? `${hz / 1000}k` : String(hz));
const sign = (n: number) => (n > 0 ? `+${n}` : String(n));

/** Settings > Sound: a ten-band equaliser with presets, an overall level and the bass boost. */
export function EqualizerCard() {
  const s = useStore((x) => x.settings);
  const update = useStore((x) => x.updateSettings);
  const preset = presetFor(s.eqBands);
  const off = !s.eqOn;
  const setBand = (i: number, v: number) => update({ eqBands: s.eqBands.map((g, j) => (j === i ? v : g)) });
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Shapes the sound on this device: ten bands from 31 Hz to 16 kHz. The level is lowered automatically when you boost, so loud songs do not clip, with a soft limiter as a backstop. In the Android app the curve is applied by the phone's own equaliser (most phones have five bands, so the curve is fitted to them).</p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={s.eqOn} onChange={(e) => update({ eqOn: e.target.checked })} />Equalizer</label>
        <Select
          className="w-52" disabled={off}
          value={preset?.id ?? 'custom'}
          onChange={(id) => { const p = EQ_PRESETS.find((x) => x.id === id); if (p) update({ eqBands: [...p.bands] }); }}
          options={[...(preset ? [] : [{ value: 'custom', label: 'Custom' }]), ...EQ_PRESETS.map((p) => ({ value: p.id, label: p.label }))]}
          aria-label="Preset"
        />
        <button className="btn btn-ghost" disabled={!s.eqBands.some((g) => g) && !s.eqPreamp && !s.eqBass} onClick={() => update({ eqBands: [...EQ_FLAT], eqPreamp: 0, eqBass: 0 })}><RotateCcw size={14} />Reset</button>
      </div>
      <div className={cn('grid gap-1', off && 'opacity-50')} style={{ gridTemplateColumns: `repeat(${EQ_BANDS}, minmax(0, 1fr))` }}>
        {EQ_FREQS.map((hz, i) => (
          <label key={hz} className="flex min-w-0 flex-col items-center gap-1.5 text-xs">
            <span className="tabular-nums text-muted">{sign(s.eqBands[i])}</span>
            <input
              type="range" min={-EQ_RANGE_DB} max={EQ_RANGE_DB} step={1} value={s.eqBands[i]} disabled={off}
              className="bt-range h-28 w-6 [writing-mode:vertical-lr] [direction:rtl]"
              style={{ '--p': `${((s.eqBands[i] + EQ_RANGE_DB) / (2 * EQ_RANGE_DB)) * 100}%` } as CSSProperties}
              onChange={(e) => setBand(i, Number(e.target.value))} aria-label={`${hzLabel(hz)} Hz`}
            />
            <span className="text-muted">{hzLabel(hz)}</span>
          </label>
        ))}
      </div>
      <div className={cn('grid gap-3 sm:grid-cols-2', off && 'opacity-50')}>
        <label className="block text-sm"><span className="mb-1 flex justify-between"><span className="font-medium">Bass boost</span><span className="tabular-nums text-muted">+{s.eqBass} dB</span></span>
          <input type="range" min={0} max={12} step={1} className="bt-range bt-hit w-full" style={{ '--p': `${(s.eqBass / 12) * 100}%` } as CSSProperties} disabled={off} value={s.eqBass} onChange={(e) => update({ eqBass: Number(e.target.value) })} aria-label="Bass boost in decibels" /></label>
        <label className="block text-sm"><span className="mb-1 flex justify-between"><span className="font-medium">Overall level</span><span className="tabular-nums text-muted">{sign(s.eqPreamp)} dB</span></span>
          <input type="range" min={-12} max={12} step={1} className="bt-range bt-hit w-full" style={{ '--p': `${((s.eqPreamp + 12) / 24) * 100}%` } as CSSProperties} disabled={off} value={s.eqPreamp} onChange={(e) => update({ eqPreamp: Number(e.target.value) })} aria-label="Overall level in decibels" /></label>
      </div>
    </div>
  );
}
