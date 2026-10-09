import { Link } from 'react-router-dom';
import { Heart, ListEnd, ListStart, Pencil, Play } from 'lucide-react';
import type { Track } from '../lib/derive.ts';
import { usePlayer } from '../lib/player.ts';
import { useStore } from '../lib/store.ts';
import { useEditor } from '../lib/editor.ts';
import { cn } from '../lib/cn.ts';
import { Rating } from './Rating.tsx';
import type { SourceType } from '@curator/core';

/** Compact rows for ranking/editing lists. `list` is the playback order handed to the queue. */
export function TrackTable({ tracks, source, sourceId = null, numbered = false, showAlbum = true }: {
  tracks: Track[]; source: SourceType; sourceId?: string | null; numbered?: boolean; showAlbum?: boolean;
}) {
  const play = usePlayer((s) => s.play);
  const enqueue = usePlayer((s) => s.enqueue);
  const current = usePlayer((s) => s.queue.currentId);
  const patch = useStore((s) => s.patch);
  const edit = useEditor((s) => s.open);
  const ids = tracks.map((t) => t.id);

  return (
    <div className="divide-y divide-line/60">
      {tracks.map((t, i) => (
        <div key={t.id} className={cn('group flex items-center gap-3 px-3 hover:bg-raised/60', current === t.id && 'bg-accent/10')} style={{ paddingBlock: 'var(--row-y)' }}>
          <button className="relative w-6 shrink-0 text-center text-sm text-muted disabled:cursor-not-allowed" disabled={!t.file}
            onClick={() => play(t.id, ids, { type: source, id: sourceId })} title={t.file ? 'Play' : 'No audio file yet'}>
            <span className={cn(t.file && 'group-hover:hidden', current === t.id && t.file && 'text-accent')}>{numbered ? i + 1 : ''}</span>
            {t.file && <Play size={14} fill="currentColor" className="mx-auto hidden group-hover:block" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className={cn('truncate text-sm font-medium', !t.file && 'text-fg/70')}>{t.title}</div>
            <div className="truncate text-xs text-muted">
              <Link to={`/artists/${t.artistId}`} className="hover:text-fg hover:underline">{t.artistName}</Link>
              {showAlbum && t.albumTitle && <> · <Link to={`/albums/${t.albumId}`} className="hover:text-fg hover:underline">{t.albumTitle}</Link></>}
            </div>
          </div>
          <div className="hidden w-40 justify-end gap-1 overflow-hidden sm:flex">{t.allGenres.slice(0, 2).map((g) => <span key={g} className="chip">{g}</span>)}</div>
          <div className="hidden w-14 text-right text-xs tabular-nums text-muted md:block">{t.bitrate ?? ''}</div>
          <button className={cn('p-1 text-muted hover:text-fg', t.isFavorite && 'text-bad')} title="Favourite"
            onClick={() => patch('tracks', t.id, { isFavorite: !t.isFavorite })}>
            <Heart size={15} fill={t.isFavorite ? 'currentColor' : 'none'} />
          </button>
          <div className="hidden gap-0.5 group-hover:flex">
            <button className="p-1 text-muted hover:text-fg" title="Edit" onClick={() => edit({ kind: 'track', id: t.id })}><Pencil size={15} /></button>
            <button className="p-1 text-muted hover:text-fg" title="Play next" disabled={!t.file} onClick={() => enqueue(t.id, 'next')}><ListStart size={15} /></button>
            <button className="p-1 text-muted hover:text-fg" title="Add to queue" disabled={!t.file} onClick={() => enqueue(t.id, 'last')}><ListEnd size={15} /></button>
          </div>
          <div className="flex w-20 justify-end"><Rating track={t} size="sm" /></div>
        </div>
      ))}
      {!tracks.length && <div className="p-6 text-center text-sm text-muted">No tracks.</div>}
    </div>
  );
}
