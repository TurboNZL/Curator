import { Link } from 'react-router-dom';
import { Pause, Play, Shuffle, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { useLibrary } from '../lib/derive.ts';
import { usePlayer } from '../lib/player.ts';
import { cn, fmtTime } from '../lib/cn.ts';
import { Cover } from './Cover.tsx';
import { Rating } from './Rating.tsx';

/** The filled part of a range, for the styles that draw their own track. */
const pct = (v: number, max: number) => ({ '--p': `${max > 0 ? Math.min(100, (v / max) * 100) : 0}%` }) as React.CSSProperties;

export function PlayerBar() {
  const lib = useLibrary();
  const p = usePlayer();
  const track = p.queue.currentId ? lib.trackById.get(p.queue.currentId) : undefined;
  return (
    <div className="bt-player">
      {p.error && <div className="bg-bad/15 px-4 py-1 text-center text-xs text-bad">{p.error}</div>}
      <div className="flex items-center gap-3 px-3 py-2 md:gap-6 md:px-4">
        <div className="flex w-1/3 min-w-0 items-center gap-3">
          {track ? (<>
            <Cover hash={track.cover} seed={track.albumTitle ?? track.title} className="h-12 w-12 shrink-0" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{track.title}</div>
              <Link to={`/artists/${track.artistId}`} className="block truncate text-xs text-muted hover:underline">{track.artistName}</Link>
            </div>
            <div className="hidden lg:block"><Rating track={track} size="sm" /></div>
          </>) : <div className="text-sm text-muted">Nothing playing</div>}
        </div>
        <div className="flex flex-1 flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <button className={cn('btn-ghost btn !p-2', p.shuffle && 'text-accent')} title="Shuffle" onClick={p.toggleShuffle}><Shuffle size={16} /></button>
            <button className="btn-ghost btn !p-2" title="Previous" onClick={p.prev}><SkipBack size={18} /></button>
            <button className="btn btn-accent !rounded-full !p-2.5" title={p.playing ? 'Pause' : 'Play'} onClick={p.toggle}>{p.playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button>
            <button className="btn-ghost btn !p-2" title="Next" onClick={p.next}><SkipForward size={18} /></button>
          </div>
          <div className="hidden w-full max-w-xl items-center gap-2 text-xs tabular-nums text-muted sm:flex">
            <span className="w-9 text-right">{fmtTime(p.time)}</span>
            <input type="range" aria-label="Seek" className="bt-range h-1 flex-1" style={pct(p.time, p.duration)} min={0} max={p.duration || 1} step={0.1} value={p.time} onChange={(e) => p.seek(Number(e.target.value))} />
            <span className="w-9">{fmtTime(p.duration)}</span>
          </div>
        </div>
        <div className="hidden w-1/3 items-center justify-end gap-2 md:flex">
          <Volume2 size={16} className="text-muted" />
          <input type="range" aria-label="Volume" className="bt-range h-1 w-24" style={pct(p.volume, 1)} min={0} max={1} step={0.01} value={p.volume} onChange={(e) => p.setVolume(Number(e.target.value))} />
        </div>
      </div>
    </div>
  );
}
