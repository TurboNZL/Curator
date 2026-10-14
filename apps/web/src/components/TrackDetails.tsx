import { BarChart3, Play, Pencil, StickyNote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLibraryLive } from '../lib/derive.ts';
import { useEditor } from '../lib/editor.ts';
import { trackInfo } from '../lib/trackinfo.ts';
import { statsPath } from '../lib/entityStats.ts';
import { Rating } from './Rating.tsx';
import { Modal } from './forms.tsx';
import { canPlay } from '../lib/spotifyPlayer.ts';
import { usePlayer } from '../lib/player.ts';
import { fmtListened } from './TrackHistory.tsx';

/** The small track-info popup: the headline numbers. Everything else (history, votes, charts, editing) is on the track's stats page. */
export function TrackDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const lib = useLibraryLive();
  const edit = useEditor((s) => s.open);
  const nav = useNavigate();
  const t = lib.trackById.get(id);
  if (!t) return null;
  const info = trackInfo(lib, id);
  const stat = (label: string, value: string) => <div className="rounded-theme bg-raised px-3 py-1.5"><div className="text-[10px] uppercase tracking-wider text-muted">{label}</div><div className="text-sm font-semibold tabular-nums">{value}</div></div>;
  return (
    <Modal title="Track info" onClose={onClose} footer={<div className="flex w-full flex-wrap gap-2">
      {canPlay(t) && <button className="btn btn-accent" onClick={() => { usePlayer.getState().play(id, [id]); onClose(); }}><Play size={15} />Play</button>}
      <button className="btn" onClick={() => { onClose(); nav(statsPath('track', id)); }}><BarChart3 size={15} />Full stats</button>
      <button className="btn ml-auto" onClick={() => edit({ kind: 'new-note', id: `track:${id}` })}><StickyNote size={15} />Note</button>
      <button className="btn" onClick={() => edit({ kind: 'track', id })}><Pencil size={15} />Edit</button></div>}>
      <div className="flex items-center gap-3"><div className="min-w-0 flex-1"><div className="truncate text-lg font-semibold">{t.title}</div><div className="truncate text-sm text-muted">{t.artistName}{t.albumTitle && ` · ${t.albumTitle}`}</div></div><Rating track={t} size="lg" /></div>
      <div className="grid grid-cols-3 gap-2">
        {stat('Elo', Math.round(t.elo).toString())}{stat('Plays', String(info.plays))}{stat('Skips', String(info.skips))}
        {stat('Won / lost', `${info.wins} / ${info.losses}`)}{stat('Listened', fmtListened(info.secondsListened))}{stat(t.albumId ? 'First released' : 'Released', t.releaseDate ?? '—')}
      </div>
      <div className="text-xs text-muted">{info.lastPlayed ? `Last played ${new Date(info.lastPlayed).toLocaleString()}` : 'Never played here'}</div>
    </Modal>
  );
}
