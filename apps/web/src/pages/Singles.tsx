import { useMemo, useState } from 'react';
import { canPlay } from '../lib/spotifyPlayer.ts';
import { FileAudio, LayoutGrid, List, Play, Plus, Shuffle } from 'lucide-react';
import { shuffleWithRules } from '@curator/core';
import { useLibrary } from '../lib/derive.ts';
import { useEditor } from '../lib/editor.ts';
import { usePlayer } from '../lib/player.ts';
import { cn } from '../lib/cn.ts';
import { SingleGrid } from '../components/SingleCard.tsx';
import { TrackTable } from '../components/TrackTable.tsx';

/** Tracks that are not on any album. They have their own cover, and can be put on an album later (from the ⋯ menu or the track editor). */
export function SinglesPage() {
  const lib = useLibrary();
  const edit = useEditor((s) => s.open);
  const play = usePlayer((s) => s.play);
  const [q, setQ] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const singles = useMemo(() => lib.singles.filter((t) => `${t.title} ${t.artistName}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.title.localeCompare(b.title)), [lib, q]);
  const playable = singles.filter(canPlay).map((t) => t.id);
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">Singles <span className="text-base font-normal text-muted">{singles.length}</span></h1>
        <button className="btn btn-accent" disabled={!playable.length} onClick={() => play(playable[0], playable, { type: 'search', id: null })}><Play size={15} fill="currentColor" />Play</button>
        <button className="btn" disabled={!playable.length} onClick={() => { const s = shuffleWithRules(playable, lib.rules); play(s[0], s, { type: 'search', id: null }); }}><Shuffle size={15} />Shuffle</button>
        <button className="btn" onClick={() => edit({ kind: 'new-track', id: '' })}><Plus size={15} />New single</button>
        <button className="btn" onClick={() => edit({ kind: 'upload', id: '' })}><FileAudio size={15} />Add files</button>
        <input className="input !w-48 max-w-full" placeholder="Filter" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex" role="group" aria-label="View">
          <button className={cn('btn !rounded-r-none', view === 'grid' && 'btn-accent')} aria-pressed={view === 'grid'} onClick={() => setView('grid')} title="Covers"><LayoutGrid size={15} /></button>
          <button className={cn('btn !rounded-l-none', view === 'list' && 'btn-accent')} aria-pressed={view === 'list'} onClick={() => setView('list')} title="List"><List size={15} /></button></div>
      </div>
      {!singles.length && <p className="text-sm text-muted">{lib.singles.length ? 'No singles match.' : 'No singles. A single is a track that is not on an album: make one with New single, or take a track off its album in the track editor.'}</p>}
      {view === 'grid' ? <SingleGrid tracks={singles} /> : <div className="card overflow-hidden"><TrackTable tracks={singles} source="search" /></div>}
    </div>
  );
}
