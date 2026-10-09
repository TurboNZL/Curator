import { ArrowDown, ArrowUp, Shuffle, X } from 'lucide-react';
import { useLibrary } from '../lib/derive.ts';
import { usePlayer } from '../lib/player.ts';
import { TrackTable } from '../components/TrackTable.tsx';

export function QueuePage() {
  const lib = useLibrary();
  const { queue, dequeue, moveQueued, clearQueued, shuffleQueued, shuffleRest, keepRest, clearRest } = usePlayer();
  const get = (ids: string[]) => ids.map((id) => lib.trackById.get(id)).filter((t) => !!t);
  const current = queue.currentId ? lib.trackById.get(queue.currentId) : null;
  const user = get(queue.user), active = get(queue.active);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Queue</h1>
      {current && <section><h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">Now playing</h2><div className="card overflow-hidden"><TrackTable tracks={[current]} source="track" /></div></section>}
      <section>
        <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Up next · queued by you</h2>{user.length > 0 && <div className="flex gap-1"><button className="btn btn-ghost" onClick={shuffleQueued}><Shuffle size={14} />Shuffle</button><button className="btn btn-ghost" onClick={clearQueued}>Clear</button></div>}</div>
        {user.length ? <div className="card divide-y divide-line/60">{user.map((t, i) => (
          <div key={`${t.id}-${i}`} className="flex items-center gap-3 px-3 py-2"><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{t.title}</div><div className="truncate text-xs text-muted">{t.artistName}</div></div>
            <button className="p-1 text-muted hover:text-fg disabled:opacity-30" aria-label="Move up" disabled={i === 0} onClick={() => moveQueued(i, i - 1)}><ArrowUp size={15} /></button>
            <button className="p-1 text-muted hover:text-fg disabled:opacity-30" aria-label="Move down" disabled={i === user.length - 1} onClick={() => moveQueued(i, i + 1)}><ArrowDown size={15} /></button>
            <button className="p-1 text-muted hover:text-fg" aria-label="Remove" onClick={() => dequeue(i)}><X size={15} /></button></div>))}</div>
          : <div className="text-sm text-muted">Nothing queued. Use the ⋯ menu on any track (or right-click it). Playback rules ("play B after A") also land here.</div>}
      </section>
      {active.length > 0 && <section><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Then, from the album / list</h2>
        <div className="flex gap-1"><button className="btn btn-ghost" onClick={shuffleRest}><Shuffle size={14} />Shuffle</button><button className="btn btn-ghost" onClick={keepRest} title="Move these into your own queue">Add all to my queue</button><button className="btn btn-ghost" onClick={clearRest}>Clear</button></div></div><div className="card overflow-hidden"><TrackTable tracks={active.slice(0, 100)} source="track" /></div></section>}
    </div>
  );
}
