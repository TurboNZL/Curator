import { useEffect, useRef, useState } from 'react';
import { Info, ListMusic, Pause, Play, Shuffle, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { useLibrary, type Track } from '../lib/derive.ts';
import { usePlayer } from '../lib/player.ts';
import { usePopups } from '../lib/popups.ts';
import { usePresence } from '../lib/presence.ts';
import { useEditor } from '../lib/editor.ts';
import { cn, fmtTime } from '../lib/cn.ts';
import { Cover } from './Cover.tsx';
import { Rating } from './Rating.tsx';
import { RateBlock } from './RateBlock.tsx';
import { ArtistLinks } from './ArtistLinks.tsx';
import { MiniQueue } from './MiniQueue.tsx';
import { CoverPreview } from './CoverPreview.tsx';

/** The filled part of a range, for the styles that draw their own track. */
const pct = (v: number, max: number) => ({ '--p': `${max > 0 ? Math.min(100, (v / max) * 100) : 0}%` }) as React.CSSProperties;

/**
 * Not shown until something is selected. It enters and leaves with the UI style's own motion (--player-in / --player-out:
 * nothing for the old Windows styles, a slide for Windows 11, floating-glass for Liquid Glass).
 */
export function PlayerBar() {
  const lib = useLibrary();
  const p = usePlayer();
  const edit = useEditor((s) => s.open);
  const current = p.queue.currentId ? lib.trackById.get(p.queue.currentId) : undefined;
  const last = useRef<Track | undefined>(undefined);
  if (current) last.current = current;
  const { mounted, leaving } = usePresence(!!current, '--player-ms');
  const queueOpen = usePopups((s) => s.queueOpen);
  const coverOpen = usePopups((s) => s.coverOpen);
  const { toggleQueue, toggleCover } = usePopups.getState();
  const [coverBtn, setCoverBtn] = useState<HTMLButtonElement | null>(null);
  const [queueBtn, setQueueBtn] = useState<HTMLButtonElement | null>(null);
  // the cover card belongs to the playing track; it closes with it
  useEffect(() => { if (!current) usePopups.getState().closeCover(); }, [current]);

  if (!mounted) return null;
  const track = current ?? last.current;
  return (
    <div className="bt-player bt-shell" data-leaving={leaving || undefined}>
      {p.error && <div className="bg-bad/15 px-4 py-1 text-center text-xs text-bad">{p.error}</div>}
      <div className="flex items-center gap-3 px-3 py-2 md:gap-6 md:px-4">
        <div className="flex w-1/3 min-w-0 items-center gap-3">
          {track && <>
            <button ref={setCoverBtn} type="button" data-popover-trigger aria-expanded={coverOpen} aria-label="Show a larger cover" title="Larger cover" className="bt-cover-btn shrink-0 rounded-theme" onClick={toggleCover}>
              <Cover hash={track.cover} seed={track.albumTitle ?? track.title} className="h-12 w-12" />
            </button>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{track.title}</div>
              <div className="truncate text-xs text-muted"><ArtistLinks leads={track.leads} className="hover:underline" /></div>
            </div>
            <button type="button" className="btn btn-ghost !p-1.5 shrink-0" title="Track info" aria-label="Track info" onClick={() => edit({ kind: 'track-details', id: track.id })}><Info size={16} /></button>
            <div className="hidden xl:block"><Rating track={track} size="sm" /></div>
            <RateBlock track={track} className="hidden md:grid" />
          </>}
        </div>
        <div className="flex flex-1 flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <button className={cn('btn-ghost btn !p-2', p.shuffle && 'text-accent')} title="Shuffle" onClick={p.toggleShuffle}><Shuffle size={16} /></button>
            <button className="btn-ghost btn !p-2" title="Previous" onClick={p.prev}><SkipBack size={18} /></button>
            <button className="btn btn-accent !rounded-full !p-2.5" title={p.playing ? 'Pause' : 'Play'} onClick={p.toggle}>{p.playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button>
            <button className="btn-ghost btn !p-2" title="Next" onClick={p.next}><SkipForward size={18} /></button>
            <button type="button" data-popover-trigger className={cn('btn-ghost btn !p-2 md:hidden', queueOpen && 'text-accent')} title="Queue" aria-label="Queue" aria-expanded={queueOpen} onClick={toggleQueue}><ListMusic size={16} /></button>
          </div>
          <div className="hidden w-full max-w-xl items-center gap-2 text-xs tabular-nums text-muted sm:flex">
            <span className="w-9 text-right">{fmtTime(p.time)}</span>
            <input type="range" aria-label="Seek" className="bt-range h-1 flex-1" style={pct(p.time, p.duration)} min={0} max={p.duration || 1} step={0.1} value={p.time} onChange={(e) => p.seek(Number(e.target.value))} />
            <span className="w-9">{fmtTime(p.duration)}</span>
          </div>
        </div>
        <div className="hidden w-1/3 items-center justify-end gap-2 md:flex">
          <button ref={setQueueBtn} type="button" data-popover-trigger className={cn('btn-ghost btn !p-2', queueOpen && 'text-accent')} title="Queue" aria-label="Queue" aria-expanded={queueOpen} onClick={toggleQueue}><ListMusic size={16} /></button>
          <Volume2 size={16} className="text-muted" />
          <input type="range" aria-label="Volume" className="bt-range h-1 w-24" style={pct(p.volume, 1)} min={0} max={1} step={0.01} value={p.volume} onChange={(e) => p.setVolume(Number(e.target.value))} />
        </div>
      </div>
      <CoverPreview anchor={coverBtn} track={track} />
      <MiniQueue anchor={queueBtn} />
    </div>
  );
}
