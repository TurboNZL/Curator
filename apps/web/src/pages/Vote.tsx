import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Pause, Play, Equal, SkipForward, Volume2 } from 'lucide-react';
import type { VoteData } from '@curator/core';
import { useLibrary, type Track } from '../lib/derive.ts';
import { pickPair } from '../lib/pairing.ts';
import { useStore } from '../lib/store.ts';
import { audioSource } from '../lib/files.ts';
import { usePlayer } from '../lib/player.ts';
import { Cover } from '../components/Cover.tsx';
import { Rating } from '../components/Rating.tsx';
import { cn } from '../lib/cn.ts';
import { ArtistLinks } from '../components/ArtistLinks.tsx';

const SNIPPET_MS = 15_000;

/**
 * The height left for the page inside the scrolling content area, so the two cards and the buttons always fit on
 * screen (on a phone the lower card used to slide under the player bar). Re-measured when the window or the player changes.
 */
function useFitHeight() {
  // a callback ref: the page can mount its root later (it shows a message until the library has two tracks)
  const [el, ref] = useState<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | undefined>();
  useLayoutEffect(() => {
    const main = el?.closest('main');
    if (!el || !main) return;
    const measure = () => {
      const css = getComputedStyle(main);
      const top = el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop;
      const below = parseFloat(css.paddingBottom) + 16; // whatever floats over the bottom of the area, and the page padding
      setHeight(Math.max(320, Math.floor(main.clientHeight - top - below)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(main);
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); window.visualViewport?.removeEventListener('resize', measure); };
  }, [el]);
  return { ref, height };
}

export function VotePage() {
  const lib = useLibrary();
  const put = useStore((s) => s.put);
  const [pair, setPair] = useState<[string, string] | null>(null);
  const [onlyPlayable, setOnlyPlayable] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const loadSeq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const fit = useFitHeight();
  const pool = useMemo(() => lib.tracks.filter((t) => !onlyPlayable || t.file), [lib, onlyPlayable]);

  const blobUrl = useRef<string | null>(null);
  const volume = usePlayer((s) => s.volume);
  const playerPlaying = usePlayer((s) => s.playing);

  const stop = useCallback(() => {
    clearTimeout(timer.current);
    loadSeq.current++; // a preview still resolving its source must not start after this
    audio.current?.pause();
    if (blobUrl.current) { URL.revokeObjectURL(blobUrl.current); blobUrl.current = null; }
    setPlaying(null);
  }, []);
  const next = useCallback(() => {
    stop();
    setPair((prev) => { const p = pickPair(pool, Math.random, prev ?? undefined); return p ? [p[0].id, p[1].id] : null; });
  }, [pool, stop]);
  useEffect(() => { if (!pair) next(); }, [pair, next]);
  useEffect(() => stop, [stop]);
  // the preview follows the player's volume slider, also while it is playing
  useEffect(() => { if (audio.current) audio.current.volume = volume; }, [volume]);
  // starting the main player (play button, a track in a list) ends a preview, so the two never overlap
  useEffect(() => { if (playerPlaying) stop(); }, [playerPlaying, stop]);

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

  /** Play 15 s from the middle of the track, as the original cleanup page did. The music player is paused meanwhile. */
  function snippet(t: Track) {
    if (playing === t.id) return stop();
    if (!t.file) return;
    stop();
    usePlayer.getState().pause();
    const el = (audio.current ??= new Audio());
    el.volume = usePlayer.getState().volume;
    setPlaying(t.id);
    const seq = ++loadSeq.current;
    // same source rule as the player: the copy kept on this device when there is one, else the server
    void audioSource(t.file).then(({ url, local }) => {
      if (seq !== loadSeq.current) { if (local) URL.revokeObjectURL(url); return; }
      blobUrl.current = local ? url : null;
      el.onloadedmetadata = () => { el.currentTime = Math.max(0, el.duration / 2 - 7.5); void el.play(); };
      el.src = url;
      timer.current = setTimeout(stop, SNIPPET_MS);
    });
  }

  if (lib.tracks.length < 2) return <div className="text-muted">Add at least two tracks to start ranking.</div>;

  return (
    <div ref={fit.ref} className="mx-auto flex max-w-4xl flex-col" style={{ height: fit.height }}>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="mr-auto text-xl font-bold sm:text-2xl">Which is better?</h1>
        <label className="flex items-center gap-1.5 text-sm text-muted"><input type="checkbox" checked={onlyPlayable} onChange={(e) => { setOnlyPlayable(e.target.checked); setPair(null); }} />Only tracks with audio</label>
        <span className="text-sm text-muted tabular-nums">{lib.votes.length} votes</span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[repeat(2,minmax(0,1fr))] gap-3 sm:grid-cols-2 sm:grid-rows-[minmax(0,1fr)] sm:gap-4">
        {[a, b].map((t, i) => t && (
          <div key={t.id} role="button" tabIndex={0} aria-pressed={playing === t.id} aria-label={`${playing === t.id ? 'Stop preview of' : 'Preview'} ${t.title}`}
            onClick={() => snippet(t)} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); snippet(t); } }}
            className={cn('card flex min-h-0 min-w-0 cursor-pointer select-none flex-row items-center gap-3 overflow-hidden p-3 transition-shadow sm:flex-col sm:gap-2 sm:p-4', playing === t.id && 'ring-2 ring-accent', !t.file && 'cursor-default')}>
            {/* a phone shows a small cover beside the text; wider screens give the cover all the room that is left, as a square that never overflows */}
            <div className="flex h-full max-h-28 min-h-0 shrink-0 items-center justify-center sm:max-h-none sm:w-full sm:flex-1 sm:[container-type:size]">
              <div className="relative aspect-square h-full sm:h-auto sm:[width:min(100cqw,100cqh)]">
                <Cover hash={t.cover} seed={t.albumTitle ?? t.title} className="h-full w-full" />
                {playing === t.id && <span className="absolute inset-0 flex items-center justify-center rounded-theme bg-black/40 text-white"><Volume2 className="animate-pulse" size={26} /></span>}
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:w-full sm:flex-none sm:items-center">
              <div className="min-w-0 text-left sm:text-center"><div className="truncate text-base font-semibold sm:text-lg">{t.title}</div>
                <div className="truncate text-sm text-muted" onClick={(e) => e.stopPropagation()}><ArtistLinks leads={t.leads} />{t.albumTitle && ` · ${t.albumTitle}`}</div></div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-center" onClick={(e) => e.stopPropagation()}>
                <Rating track={t} />
                {t.youtubeMusicUrl && <a className="btn btn-ghost !p-1.5" href={t.youtubeMusicUrl} target="_blank" rel="noreferrer" title="Open on YouTube" aria-label="Open on YouTube"><ExternalLink size={14} /></a>}
              </div>
              <div className="text-xs text-muted sm:text-center" aria-hidden>{!t.file ? 'No audio yet' : playing === t.id ? <span className="inline-flex items-center gap-1"><Pause size={11} />Tap to stop</span> : <span className="inline-flex items-center gap-1"><Play size={11} />Tap to preview 15 s</span>}</div>
              <button className="btn btn-accent !px-4 !py-1.5 text-sm sm:w-auto" onClick={(e) => { e.stopPropagation(); vote(t.id); }}>{i === 0 ? '← ' : ''}This one{i === 1 ? ' →' : ''}</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex shrink-0 flex-col items-center gap-1.5">
        <div className="flex flex-wrap justify-center gap-2">
          <button className="btn" onClick={() => vote(null, true)} title="Both are as good as each other. This is saved as a draw and moves both ratings towards each other."><Equal size={16} />They’re equal (↓)</button>
          <button className="btn btn-ghost" onClick={next} title="Not sure, or you don't want to rank this pair. Nothing is saved; you just get a new pair."><SkipForward size={16} />Skip, save nothing (S)</button>
        </div>
        <div className="h-4 text-center text-xs text-good" aria-live="polite">{flash ?? <span className="text-muted">Equal records a draw. Skip records nothing.</span>}</div>
      </div>
    </div>
  );
}
