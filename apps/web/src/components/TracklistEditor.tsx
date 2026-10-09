import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import type { TrackData } from '@curator/core';
import { appendTrack, moveTrack, removeTrack } from '../lib/defaults.ts';
import type { Library } from '../lib/derive.ts';
import { useEditor } from '../lib/editor.ts';
import { useStore } from '../lib/store.ts';
import { TrackPicker } from './forms.tsx';

type Album = Library['albums'][number];

/** Reorder, remove, and add tracks of one album. Order is saved on the album (`trackOrder`). */
export function TracklistEditor({ album, lib }: { album: Album; lib: Library }) {
  const patch = useStore((s) => s.patch);
  const edit = useEditor((s) => s.open);
  const rawAlbums = (trackId: string) => (useStore.getState().rows.tracks.get(trackId)?.data as TrackData | undefined)?.albums ?? [];
  const setOrder = (order: string[]) => patch('albums', album.id, { trackOrder: order });

  const remove = (id: string) => {
    patch('tracks', id, { albums: rawAlbums(id).filter((l) => l.albumId !== album.id) });
    setOrder(removeTrack(album.trackIds, id));
  };
  const addExisting = (id: string | null) => {
    if (!id) return;
    patch('tracks', id, { albums: [...rawAlbums(id).filter((l) => l.albumId !== album.id), { albumId: album.id, order: album.trackIds.length }] });
    setOrder(appendTrack(album.trackIds, id));
  };

  return (
    <div className="card overflow-hidden">
      <div className="divide-y divide-line/60">
        {album.trackIds.map((id, i) => {
          const t = lib.trackById.get(id)!;
          return (
            <div key={id} className="flex items-center gap-2 px-3 py-2">
              <span className="w-6 text-center text-sm text-muted">{i + 1}</span>
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{t.title}</div><div className="truncate text-xs text-muted">{t.artistName}</div></div>
              <button className="btn btn-ghost !p-1.5" aria-label={`Move ${t.title} up`} disabled={i === 0} onClick={() => setOrder(moveTrack(album.trackIds, i, i - 1))}><ArrowUp size={15} /></button>
              <button className="btn btn-ghost !p-1.5" aria-label={`Move ${t.title} down`} disabled={i === album.trackIds.length - 1} onClick={() => setOrder(moveTrack(album.trackIds, i, i + 1))}><ArrowDown size={15} /></button>
              <button className="btn btn-ghost !p-1.5 text-bad" aria-label={`Remove ${t.title} from this album`} onClick={() => remove(id)}><X size={15} /></button>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-line p-3">
        <div className="w-64 max-w-full"><TrackPicker value={null} onChange={addExisting} /></div>
        <span className="text-xs text-muted">adds an existing track</span>
        <button className="btn ml-auto" onClick={() => edit({ kind: 'new-track', id: album.id })}><Plus size={15} />New track</button>
      </div>
    </div>
  );
}
