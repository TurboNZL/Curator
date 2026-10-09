import { Pencil } from 'lucide-react';
import { useLibrary } from '../lib/derive.ts';
import { useEditor } from '../lib/editor.ts';
import { trackInfo } from '../lib/trackinfo.ts';
import { fmtBytes, cn } from '../lib/cn.ts';
import { useStore } from '../lib/store.ts';
import { Rating } from './Rating.tsx';
import { Modal } from './forms.tsx';

const fmt = (s: number) => (s >= 3600 ? `${(s / 3600).toFixed(1)} h` : s >= 60 ? `${Math.round(s / 60)} min` : `${Math.round(s)} s`);

/** "Stats for nerds": how a track earned its rating, plus its listening history. */
export function TrackDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const lib = useLibrary();
  const edit = useEditor((s) => s.open);
  const cache = useStore((s) => s.audioCache);
  const t = lib.trackById.get(id);
  if (!t) return null;
  const info = trackInfo(lib, id);
  const stat = (label: string, value: string) => <div className="rounded-theme bg-raised px-3 py-2"><div className="text-[11px] uppercase tracking-wider text-muted">{label}</div><div className="text-sm font-semibold tabular-nums">{value}</div></div>;
  return (
    <Modal title="Track details" onClose={onClose} footer={<button className="btn ml-auto" onClick={() => edit({ kind: 'track', id })}><Pencil size={15} />Edit</button>}>
      <div><div className="text-lg font-semibold">{t.title}</div><div className="text-sm text-muted">{t.artistName}{t.albumTitle && ` · ${t.albumTitle}`}</div></div>
      <div className="flex items-center gap-3"><Rating track={t} size="lg" /><span className="text-sm text-muted">{t.comparisons < 3 ? `Needs ${3 - t.comparisons} more comparison${3 - t.comparisons === 1 ? '' : 's'} before the vote rating is used.` : 'Rating comes from votes.'}</span></div>
      <div className="grid grid-cols-3 gap-2">
        {stat('Elo', Math.round(t.elo).toString())}{stat('Vote rating', t.rating.toFixed(2))}{stat('Manual rating', t.initialRating != null ? String(t.initialRating) : '—')}
        {stat('Won', String(info.wins))}{stat('Lost', String(info.losses))}{stat('Equal', String(info.draws))}
        {stat('Plays', String(info.plays))}{stat('Skips', String(info.skips))}{stat('Listened', fmt(info.secondsListened))}
      </div>
      <div className="text-xs text-muted">{info.lastPlayed ? `Last played ${new Date(info.lastPlayed).toLocaleString()}` : 'Never played here'} · {t.file ? `audio on server${t.file in cache ? ', saved on this device' : ''} (${t.file.slice(0, 8)}…${cache[t.file] ? `, ${fmtBytes(cache[t.file].size)}` : ''})` : 'no audio file'}{t.bitrate && ` · ${t.bitrate}`}</div>
      <div>
        <div className="mb-1 text-sm font-medium">Votes ({info.votes.length})</div>
        {!info.votes.length && <p className="text-sm text-muted">No votes yet. Use Rank to compare it with other tracks.</p>}
        <div className="max-h-64 divide-y divide-line/60 overflow-y-auto rounded-theme border border-line">{info.votes.map((v) => (
          <div key={v.voteId} className="flex items-center gap-3 px-3 py-1.5 text-sm">
            <span className={cn('w-12 text-xs font-semibold uppercase', v.result === 'won' ? 'text-good' : v.result === 'lost' ? 'text-bad' : 'text-muted')}>{v.result}</span>
            <span className={cn('min-w-0 flex-1 truncate', !v.opponentExists && 'italic text-muted')}>{v.opponent}</span>
            <span className="shrink-0 text-xs text-muted">{new Date(v.timestamp).toLocaleDateString()}</span></div>))}</div>
      </div>
    </Modal>
  );
}
