import { useState } from 'react';
import { Minus, Plus, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { VoteData } from '@curator/core';
import type { Track } from '../lib/derive.ts';
import { useStore } from '../lib/store.ts';
import { cn } from '../lib/cn.ts';

/**
 * Thumbs up / down (a half-weight Elo vote on this track alone) over a memories counter. The two rows are the same
 * width, so together they form one rectangle.
 */
export function RateBlock({ track, className }: { track: Track; className?: string }) {
  const put = useStore((s) => s.put);
  const patch = useStore((s) => s.patch);
  const [pulse, setPulse] = useState<{ n: number; dir: 1 | -1 } | null>(null);
  const memories = track.memories ?? 0;
  const thumb = (boost: 1 | -1) => {
    const data: VoteData = { trackAId: track.id, trackBId: '', winnerId: null, isEqual: false, boost, timestamp: Date.now() };
    put('votes', data);
    setPulse((p) => ({ n: (p?.n ?? 0) + 1, dir: boost }));
  };
  return (
    <div className={cn('grid w-[5.5rem] shrink-0 grid-cols-2 gap-1', className)}>
      <button type="button" className={cn('btn !px-0 !py-1.5', pulse?.dir === 1 && 'text-good')} title="Thumbs up: nudges this track's Elo up" aria-label="Thumbs up" onClick={() => thumb(1)}>
        <ThumbsUp key={pulse?.dir === 1 ? pulse.n : 'u'} size={15} className={pulse?.dir === 1 ? 'bt-thumb-pulse' : undefined} />
      </button>
      <button type="button" className={cn('btn !px-0 !py-1.5', pulse?.dir === -1 && 'text-bad')} title="Thumbs down: nudges this track's Elo down" aria-label="Thumbs down" onClick={() => thumb(-1)}>
        <ThumbsDown key={pulse?.dir === -1 ? pulse.n : 'd'} size={15} className={pulse?.dir === -1 ? 'bt-thumb-pulse' : undefined} />
      </button>
      <div className="col-span-2 grid grid-cols-[1.6rem_1fr_1.6rem] items-center rounded-theme border border-line/70 bg-raised/40 text-xs">
        <button type="button" className="btn btn-ghost !p-1" title="Remove a memory" aria-label="Remove a memory" disabled={memories < 1} onClick={() => patch('tracks', track.id, { memories: Math.max(0, memories - 1) })}><Minus size={12} /></button>
        <span className="text-center font-semibold tabular-nums" title="Memories">{memories}</span>
        <button type="button" className="btn btn-ghost !p-1" title="Add a memory" aria-label="Add a memory" onClick={() => patch('tracks', track.id, { memories: memories + 1 })}><Plus size={12} /></button>
      </div>
    </div>
  );
}
