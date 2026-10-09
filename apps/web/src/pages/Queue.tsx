import { X } from 'lucide-react';
import { useLibrary } from '../lib/derive.ts';
import { usePlayer } from '../lib/player.ts';
import { TrackTable } from '../components/TrackTable.tsx';

export function QueuePage() {
  const lib = useLibrary();
  const { queue, dequeue } = usePlayer();
  const get = (ids: string[]) => ids.map((id) => lib.trackById.get(id)).filter((t) => !!t);
  const current = queue.currentId ? lib.trackById.get(queue.currentId) : null;
  const user = get(queue.user), active = get(queue.active);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Queue</h1>
      {current && <section><h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">Now playing</h2><div className="card overflow-hidden"><TrackTable tracks={[current]} source="track" /></div></section>}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">Up next · queued by you</h2>
        {user.length ? <div className="card divide-y divide-line/60">{user.map((t, i) => (
          <div key={`${t.id}-${i}`} className="flex items-center gap-3 px-3 py-2"><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{t.title}</div><div className="truncate text-xs text-muted">{t.artistName}</div></div>
            <button className="p-1 text-muted hover:text-fg" aria-label="Remove" onClick={() => dequeue(i)}><X size={15} /></button></div>))}</div>
          : <div className="text-sm text-muted">Nothing queued. Use the buttons that appear when hovering a track. Playback rules ("play B after A") also land here.</div>}
      </section>
      {active.length > 0 && <section><h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">Then, from the album / list</h2><div className="card overflow-hidden"><TrackTable tracks={active.slice(0, 100)} source="track" /></div></section>}
    </div>
  );
}
