import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ArrowDownToLine, Info, ListEnd, ListStart, MoreHorizontal, Pencil, Play } from 'lucide-react';
import type { Track } from '../lib/derive.ts';
import { usePlayer } from '../lib/player.ts';
import { useStore } from '../lib/store.ts';
import { useEditor } from '../lib/editor.ts';
import { cn } from '../lib/cn.ts';
import { Rating } from './Rating.tsx';
import { TrackMenu, type MenuAt } from './TrackMenu.tsx';
import type { SourceType } from '@curator/core';

/** Compact rows for ranking/editing lists. `list` is the playback order handed to the queue. */
export function TrackTable({ tracks, source, sourceId = null, numbered = false, showAlbum = true, extra }: {
  tracks: Track[]; source: SourceType; sourceId?: string | null; numbered?: boolean; showAlbum?: boolean;
  /** extra controls at the end of each row (e.g. move/remove in a playlist) */
  extra?: (t: Track, index: number) => React.ReactNode;
}) {
  const play = usePlayer((s) => s.play);
  const enqueue = usePlayer((s) => s.enqueue);
  const current = usePlayer((s) => s.queue.currentId);
  const edit = useEditor((s) => s.open);
  const cache = useStore((s) => s.audioCache);
  const ids = tracks.map((t) => t.id);
  const [menu, setMenu] = useState<MenuAt | null>(null);

  return (
    <div className="divide-y divide-line/60">
      {tracks.map((t, i) => (
        <div key={t.id} className={cn('bt-row group flex items-center gap-3 px-3', current === t.id && 'bt-row-current')} style={{ paddingBlock: 'var(--row-y)' }}
          onContextMenu={(e) => { e.preventDefault(); setMenu({ track: t, x: e.clientX, y: e.clientY }); }}>
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
          <span className="w-4 text-muted" title={t.file && cache[t.file] ? 'Saved on this device' : ''}>{t.file && cache[t.file] && <ArrowDownToLine size={13} />}</span>
          <div className="hidden w-14 text-right text-xs tabular-nums text-muted md:block">{t.bitrate ?? ''}</div>
          <div className="hidden w-28 justify-end gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 md:flex">
            <button className="p-1 text-muted hover:text-fg" title="Details" onClick={() => edit({ kind: 'track-details', id: t.id })}><Info size={15} /></button>
            <button className="p-1 text-muted hover:text-fg" title="Edit" onClick={() => edit({ kind: 'track', id: t.id })}><Pencil size={15} /></button>
            <button className="p-1 text-muted hover:text-fg" title="Play next" disabled={!t.file} onClick={() => enqueue(t.id, 'next')}><ListStart size={15} /></button>
            <button className="p-1 text-muted hover:text-fg" title="Add to queue" disabled={!t.file} onClick={() => enqueue(t.id, 'last')}><ListEnd size={15} /></button>
          </div>
          <button className="p-1 text-muted hover:text-fg" aria-label={`More actions for ${t.title}`} aria-haspopup="menu" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMenu({ track: t, x: r.right - 224, y: r.bottom + 4 }); }}><MoreHorizontal size={16} /></button>
          <div className="flex w-20 justify-end"><Rating track={t} size="sm" /></div>
          {extra?.(t, i)}
        </div>
      ))}
      {menu && <TrackMenu at={menu} onClose={() => setMenu(null)} onPlay={() => play(menu.track.id, ids, { type: source, id: sourceId })} />}
      {!tracks.length && <div className="p-6 text-center text-sm text-muted">No tracks.</div>}
    </div>
  );
}
