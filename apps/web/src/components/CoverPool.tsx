import { useRef, useState } from 'react';
import { ImagePlus, Lock, LockOpen, X } from 'lucide-react';
import { saveImage } from '../lib/files.ts';
import { Cover } from './Cover.tsx';
import { cn } from '../lib/cn.ts';

/**
 * The album's covers as one pool. Each image has a lock: locking it makes this the cover no matter what else changes,
 * unlocking hands the choice back to automatic. Adding an image only puts it in the pool. The outlined image is the one
 * showing right now. Images are only ever removed by the X (after a confirmation in the parent).
 */
export function CoverPool({ pool, locked, showing, onLock, onAdd, onRemove, seed, autoLabel }: {
  pool: string[];
  /** the locked image, or null while the choice is automatic */
  locked: string | null;
  /** the image being shown now (locked or automatic) */
  showing: string | null;
  onLock: (hash: string | null) => void;
  /** a new image was uploaded; it is already in the pool when this is called */
  onAdd: (hash: string) => void;
  onRemove?: (hash: string) => void;
  seed: string;
  /** what automatic means here, for the line under the images */
  autoLabel: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2.5">
        {pool.map((h) => {
          const isLocked = locked === h, on = showing === h;
          return (
            <div key={h} className="group relative w-[4.5rem] shrink-0">
              <div className={cn('rounded-theme p-0.5', on && 'bt-sel')} data-selected={on || undefined}><Cover hash={h} seed={h} className="w-full" /></div>
              <button type="button" aria-pressed={isLocked} aria-label={isLocked ? 'Unlock: choose the cover automatically again' : 'Lock this as the cover'} title={isLocked ? 'Locked as the cover. Click to go back to automatic' : 'Lock this as the cover'}
                className={cn('absolute bottom-5 left-1 rounded-full p-1 shadow transition', isLocked ? 'bg-accent text-accent-fg' : 'bg-surface/90 text-muted opacity-0 hover:text-fg group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100')}
                onClick={() => onLock(isLocked ? null : h)}>{isLocked ? <Lock size={12} /> : <LockOpen size={12} />}</button>
              {onRemove && <button type="button" aria-label="Delete this image" title="Delete this image" className="absolute -right-1 -top-1 rounded-full bg-surface p-0.5 text-muted opacity-0 shadow hover:text-bad group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100" onClick={() => onRemove(h)}><X size={12} /></button>}
              <span className="mt-0.5 block text-center text-[10px] leading-tight text-muted">{isLocked ? 'Locked' : on ? 'Showing' : ' '}</span>
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
      <div className="text-xs text-muted">{locked ? 'Locked: this stays the cover until you unlock it.' : autoLabel}</div>
      {err && <div className="text-xs text-bad">{err}</div>}
    </div>
  );
}
