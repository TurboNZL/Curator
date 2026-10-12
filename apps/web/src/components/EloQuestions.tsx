import { useMemo, useState } from 'react';
import { Check, Equal, Play, RefreshCw, SkipForward, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { useLibrary, type Track } from '../lib/derive.ts';
import { usePlayer } from '../lib/player.ts';
import { useStore } from '../lib/store.ts';
import { nextQuestion, votesFor, type Question } from '../lib/questions.ts';
import { canPlay } from '../lib/spotifyPlayer.ts';
import { Cover } from './Cover.tsx';
import { cn } from '../lib/cn.ts';

const LABEL: Record<Question['kind'], string> = { duel: 'Head to head', triple: 'Pick the best of three', benchmark: 'Top 10% check', love: 'Gut check' };

function Option({ t, onPick, label, accent }: { t: Track; onPick: () => void; label?: string; accent?: boolean }) {
  const play = usePlayer((s) => s.play);
  return (
    <div className={cn('card flex min-w-0 flex-1 basis-40 flex-col gap-2 p-3', accent && 'ring-1 ring-accent/40')}>
      <Cover hash={t.cover} seed={t.albumTitle ?? t.title} className="w-full" />
      <div className="min-w-0"><div className="truncate text-sm font-semibold" title={t.title}>{t.title}</div><div className="truncate text-xs text-muted">{t.artistName}</div></div>
      <div className="mt-auto flex gap-2">
        <button className="btn !p-2" title="Preview" aria-label={`Play ${t.title}`} disabled={!canPlay(t)} onClick={() => play(t.id, [t.id], { type: 'track', id: t.id })}><Play size={14} fill="currentColor" /></button>
        <button className="btn btn-accent flex-1" onClick={onPick}><Check size={14} />{label ?? 'This one'}</button>
      </div>
    </div>
  );
}

/** Home: a question about the ranking that is worth answering, in one of four formats (lib/questions.ts). */
export function EloQuestions() {
  const lib = useLibrary();
  const put = useStore((s) => s.put);
  const pool = useMemo(() => lib.tracks.filter((t) => t.file).map((t) => ({ id: t.id, elo: t.elo, comparisons: t.comparisons, rating: t.rating })), [lib]);
  const [q, setQ] = useState<Question | null>(() => nextQuestion(pool));
  const [answered, setAnswered] = useState(0);
  const next = (prev?: Question['kind']) => setQ(nextQuestion(pool, prev));
  const answer = (a: string) => {
    if (!q) return;
    for (const v of votesFor(q, a)) put('votes', v);
    if (a !== 'skip') setAnswered((n) => n + 1);
    next(q.kind);
  };
  const T = (id: string) => lib.trackById.get(id);
  if (!q) return null;
  const tracks = q.kind === 'duel' ? [T(q.a), T(q.b)] : q.kind === 'triple' ? q.ids.map(T) : [T(q.id), 'ref' in q ? T(q.ref) : undefined];
  if (tracks.some((t) => !t)) return null;
  return (
    <section className="card space-y-3 p-5" aria-label="Ranking question">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">Sharpen your ranking</h2>
        <span className="chip">{LABEL[q.kind]}</span>
        <span className="ml-auto text-xs text-muted">{answered ? `${answered} answered this visit` : 'every answer is a vote'}</span>
      </div>
      <p className="text-sm text-muted">{q.why}</p>
      {(q.kind === 'duel' || q.kind === 'triple') && <div className="flex flex-wrap gap-3">{(tracks as Track[]).map((t) => <Option key={t.id} t={t} onPick={() => answer(t.id)} />)}</div>}
      {q.kind === 'benchmark' && (() => { const [t, ref] = tracks as Track[]; return (
        <div className="flex flex-wrap items-stretch gap-3">
          <Option t={t} onPick={() => answer('yes')} label="Yes, better" accent />
          <div className="flex min-w-0 flex-1 basis-40 flex-col justify-center gap-2 text-sm"><div className="text-muted">than</div><div className="truncate font-semibold">{ref.title}</div><div className="truncate text-xs text-muted">{ref.artistName} · rated {ref.rating.toFixed(1)}</div>
            <button className="btn" onClick={() => answer('no')}><X size={14} />No, not as good</button></div>
        </div>); })()}
      {q.kind === 'love' && (() => { const [t] = tracks as Track[]; return (
        <div className="flex flex-wrap items-center gap-4"><Cover hash={t.cover} seed={t.albumTitle ?? t.title} className="w-28" />
          <div className="min-w-0 flex-1 space-y-2"><div className="truncate text-lg font-semibold">{t.title}</div><div className="truncate text-sm text-muted">{t.artistName}</div>
            <div className="flex flex-wrap gap-2"><button className="btn btn-accent" onClick={() => answer('yes')}><ThumbsUp size={15} />Love it</button><button className="btn" onClick={() => answer('no')}><ThumbsDown size={15} />Not really</button>
              <button className="btn btn-ghost !p-2" title="Preview" aria-label="Preview" disabled={!canPlay(t)} onClick={() => usePlayer.getState().play(t.id, [t.id], { type: 'track', id: t.id })}><Play size={14} fill="currentColor" /></button></div></div></div>); })()}
      <div className="flex flex-wrap gap-2">
        {q.kind === 'duel' && <button className="btn btn-ghost" onClick={() => answer('equal')}><Equal size={14} />Equal</button>}
        <button className="btn btn-ghost" onClick={() => answer('skip')}><SkipForward size={14} />Skip</button>
        <button className="btn btn-ghost" onClick={() => next(q.kind)}><RefreshCw size={14} />Another kind</button>
      </div>
    </section>
  );
}
