import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { saveImage } from '../lib/files.ts';
import { Cover } from './Cover.tsx';
import { cn } from '../lib/cn.ts';

/**
 * The album's covers as one pool: pick one, or "inherit", or add another. An image is never tied to one place: adding
 * one only puts it in the pool, and anything in the pool can be used by the album or by any of its releases.
 */
export function CoverPool({ pool, value, onChange, onAdd, onRemove, inheritLabel, inheritHash, seed }: {
  pool: string[];
  /** the picked image, or null for "inherit" */
  value: string | null;
  onChange: (hash: string | null) => void;
  /** a new image was uploaded; it is already in the pool when this is called */
  onAdd: (hash: string) => void;
  /** only offered for images that this returns true for (nothing else uses them) */
  onRemove?: (hash: string) => boolean | void;
  inheritLabel: string;
  /** what "inherit" currently resolves to, for its preview */
  inheritHash: string | null;
  seed: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const tile = (selected: boolean) => cn('relative block w-[4.5rem] shrink-0 rounded-theme p-0.5 text-left', selected ? 'bt-sel' : 'opacity-90 hover:opacity-100');
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cover">
        <button type="button" role="radio" aria-checked={value === null} data-selected={value === null || undefined} title={inheritLabel} className={tile(value === null)} onClick={() => onChange(null)}>
          <Cover hash={inheritHash} seed={seed} className="w-full" />
          <span className="mt-0.5 block text-center text-[10px] leading-tight text-muted">Inherit</span>
        </button>
        {pool.map((h) => {
          const on = value === h;
          return (
            <div key={h} className="group relative">
              <button type="button" role="radio" aria-checked={on} data-selected={on || undefined} className={tile(on)} onClick={() => onChange(h)}>
                <Cover hash={h} seed={h} className="w-full" />
                <span className="mt-0.5 block text-center text-[10px] leading-tight text-muted">{on ? 'Chosen' : 'Use'}</span>
              </button>
              {onRemove && !on && <button type="button" aria-label="Remove this image from the pool" title="Remove from the pool" className="absolute -right-1 -top-1 hidden rounded-full bg-surface p-0.5 text-muted shadow hover:text-bad group-hover:block group-focus-within:block" onClick={() => onRemove(h)}><X size={12} /></button>}
            </div>);
        })}
        <button type="button" disabled={busy} title="Upload another cover into the pool" className="flex h-[4.5rem] w-[4.5rem] shrink-0 flex-col items-center justify-center gap-1 rounded-theme border border-dashed border-line text-xs text-muted hover:border-accent hover:text-fg" onClick={() => input.current?.click()}>
          <ImagePlus size={18} />{busy ? 'Saving…' : 'Upload'}
        </button>
        <input ref={input} type="file" accept="image/*" hidden onChange={async (e) => {
          const f = e.target.files?.[0]; e.target.value = '';
          if (!f) return;
          setBusy(true); setErr(null);
          try { onAdd(await saveImage(f)); } catch { setErr('Could not read that image.'); } finally { setBusy(false); }
        }} />
      </div>
      {err && <div className="text-xs text-bad">{err}</div>}
    </div>
  );
}
