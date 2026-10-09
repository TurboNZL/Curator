import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Pause, Play, Equal, SkipForward } from 'lucide-react';
import type { VoteData } from '@curator/core';
import { useLibrary, type Track } from '../lib/derive.ts';
import { pickPair } from '../lib/pairing.ts';
import { api, useStore } from '../lib/store.ts';
import { Cover } from '../components/Cover.tsx';
import { Rating } from '../components/Rating.tsx';
import { cn } from '../lib/cn.ts';

const SNIPPET_MS = 15_000;

export function VotePage() {
  const lib = useLibrary();
  const put = useStore((s) => s.put);
  const [pair, setPair] = useState<[string, string] | null>(null);
  const [onlyPlayable, setOnlyPlayable] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pool = useMemo(() => lib.tracks.filter((t) => !onlyPlayable || t.file), [lib, onlyPlayable]);

  const stop = useCallback(() => { clearTimeout(timer.current); audio.current?.pause(); setPlaying(null); }, []);
  const next = useCallback(() => {
    stop();
    setPair((prev) => { const p = pickPair(pool, Math.random, prev ?? undefined); return p ? [p[0].id, p[1].id] : null; });
  }, [pool, stop]);
  useEffect(() => { if (!pair) next(); }, [pair, next]);
  useEffect(() => stop, [stop]);

  const [a, b] = pair ? [lib.trackById.get(pair[0]), lib.trackById.get(pair[1])] : [];

  const vote = useCallback((winnerId: string | null, isEqual = false) => {
    if (!pair) return;
    const data: VoteData = { trackAId: pair[0], trackBId: pair[1], winnerId, isEqual, timestamp: Date.now() };
    put('votes', data);
    setFlash(isEqual ? 'Marked equal' : `Voted for ${lib.trackById.get(winnerId!)?.title}`);
    setTimeout(() => setFlash(null), 1500);
    setPair(null);
  }, [pair, put, lib]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || !pair) return;
      if (e.key === 'ArrowLeft') vote(pair[0]);
      else if (e.key === 'ArrowRight') vote(pair[1]);
      else if (e.key === 'ArrowDown') vote(null, true);
      else if (e.key === 's') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pair, vote, next]);

  /** Play 15 s from the middle of the track, as the original cleanup page did. */
  function snippet(t: Track) {
    if (playing === t.id) return stop();
    if (!t.file) return;
    stop();
    const el = (audio.current ??= new Audio());
    el.src = api().fileUrl(t.file);
    el.onloadedmetadata = () => { el.currentTime = Math.max(0, el.duration / 2 - 7.5); void el.play(); };
    setPlaying(t.id);
    timer.current = setTimeout(stop, SNIPPET_MS);
  }

  if (lib.tracks.length < 2) return <div className="text-muted">Add at least two tracks to start ranking.</div>;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">Which is better?</h1>
        <label className="flex items-center gap-1.5 text-sm text-muted"><input type="checkbox" checked={onlyPlayable} onChange={(e) => { setOnlyPlayable(e.target.checked); setPair(null); }} />Only tracks with audio</label>
        <span className="text-sm text-muted tabular-nums">{lib.votes.length} votes</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
        {[a, b].map((t, i) => t && (
          <div key={t.id} className="card flex min-w-0 flex-col items-center gap-3 p-4 text-center sm:p-5">
            <div className="flex w-full items-center gap-3 sm:flex-col sm:gap-3">
              <Cover hash={t.cover} seed={t.albumTitle ?? t.title} className="w-20 shrink-0 sm:w-44" />
              <div className="min-w-0 flex-1 text-left sm:text-center"><div className="truncate text-base font-semibold sm:text-lg">{t.title}</div><div className="truncate text-sm text-muted">{t.artistName}{t.albumTitle && ` · ${t.albumTitle}`}</div></div>
            </div>
            <Rating track={t} />
            <div className="flex gap-2">
              <button className="btn" disabled={!t.file} onClick={() => snippet(t)} title={t.file ? 'Preview 15 s' : 'No audio yet'}>
                {playing === t.id ? <Pause size={15} /> : <Play size={15} />}Preview</button>
              {t.youtubeMusicUrl && <a className="btn btn-ghost" href={t.youtubeMusicUrl} target="_blank" rel="noreferrer" title="Open on YouTube"><ExternalLink size={15} /></a>}
            </div>
            <button className={cn('btn btn-accent mt-1 w-full !py-3')} onClick={() => vote(t.id)}>{i === 0 ? '← ' : ''}This one{i === 1 ? ' →' : ''}</button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-center gap-3">
        <button className="btn" onClick={() => vote(null, true)}><Equal size={16} />Equal ↓</button>
        <button className="btn btn-ghost" onClick={next}><SkipForward size={16} />Skip (S)</button>
      </div>
      <div className="mt-3 h-5 text-center text-sm text-good" aria-live="polite">{flash}</div>
    </div>
  );
}
