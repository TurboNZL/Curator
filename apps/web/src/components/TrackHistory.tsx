import type { TrackInfo } from '../lib/trackinfo.ts';
import { cn } from '../lib/cn.ts';

export const fmtListened = (s: number) => (s >= 3600 ? `${(s / 3600).toFixed(1)} h` : s >= 60 ? `${Math.round(s / 60)} min` : `${Math.round(s)} s`);

/** A track's play history and vote record, as two scrolling lists. */
export function TrackHistory({ info }: { info: TrackInfo }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <div className="mb-1 text-sm font-medium">Play history ({info.history.length})</div>
        {!info.history.length && <p className="text-sm text-muted">No plays yet, in Curator or in imported Spotify history.</p>}
        {info.history.length > 0 && <div className="max-h-72 divide-y divide-line/60 overflow-y-auto rounded-theme border border-line">{info.history.map((h) => (
          <div key={h.logId} className="flex items-center gap-3 px-3 py-1.5 text-sm">
            <span className={cn('w-12 text-xs font-semibold uppercase', h.isSkip ? 'text-warn' : 'text-good')}>{h.isSkip ? 'skip' : 'played'}</span>
            <span className="min-w-0 flex-1 truncate text-muted">{fmtListened(h.seconds)} · {h.imported ? 'on Spotify' : `from ${h.source ?? 'unknown'}`}</span>
            <span className="shrink-0 text-xs text-muted">{new Date(h.timestamp).toLocaleString()}</span></div>))}</div>}
      </div>
      <div>
        <div className="mb-1 text-sm font-medium">Votes ({info.votes.length})</div>
        {!info.votes.length && <p className="text-sm text-muted">No votes yet. Use Rank to compare it with other tracks.</p>}
        {info.votes.length > 0 && <div className="max-h-72 divide-y divide-line/60 overflow-y-auto rounded-theme border border-line">{info.votes.map((v) => (
          <div key={v.voteId} className="flex items-center gap-3 px-3 py-1.5 text-sm">
            <span className={cn('w-20 text-xs font-semibold uppercase', v.result === 'won' || v.result === 'thumb up' ? 'text-good' : v.result === 'lost' || v.result === 'thumb down' ? 'text-bad' : 'text-muted')}>{v.result}</span>
            <span className={cn('min-w-0 flex-1 truncate', !v.opponentExists && 'italic text-muted')}>{v.opponent}</span>
            <span className="shrink-0 text-xs text-muted">{new Date(v.timestamp).toLocaleDateString()}</span></div>))}</div>}
      </div>
    </div>
  );
}
