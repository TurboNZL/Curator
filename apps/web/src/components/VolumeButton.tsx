import { useEffect, useRef, useState } from 'react';
import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { usePlayer } from '../lib/player.ts';

/** A volume control for when the player bar is hidden: it sets the same volume as the bar's slider (previews, Rank, other sounds). */
export function VolumeButton() {
  const volume = usePlayer((s) => s.volume), setVolume = usePlayer((s) => s.setVolume);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('mousedown', down);
    return () => window.removeEventListener('mousedown', down);
  }, [open]);
  const Icon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  return (
    <div ref={box} className="relative">
      <button type="button" className="btn btn-ghost !p-2" aria-label="Volume" aria-expanded={open} title={`Volume ${Math.round(volume * 100)}%`} onClick={() => setOpen((o) => !o)}><Icon size={18} /></button>
      {open && <div className="bt-menu absolute right-0 top-full z-50 mt-2 flex w-44 items-center gap-2 px-3 py-2">
        <input type="range" aria-label="Volume" className="bt-range bt-hit w-full" style={{ '--p': `${volume * 100}%` } as React.CSSProperties} min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
      </div>}
    </div>);
}
