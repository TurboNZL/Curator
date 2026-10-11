import { FilterBar } from '../components/FilterBar.tsx';
import { canPlay } from '../lib/spotifyPlayer.ts';
import { makeChip, matchesAll, splitTyped, trackSubject, type Chip, type FilterKey } from '../lib/filters.ts';
import { useSearchParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useLibrary } from '../lib/derive.ts';
import { ArrowDown, ArrowUp, FileAudio, Play, Plus, Shuffle } from 'lucide-react';
import { shuffleWithRules } from '@curator/core';
import { useEditor } from '../lib/editor.ts';
import { usePlayer } from '../lib/player.ts';
import { defaultDir, sortTracks, type SortDir, type SortKey } from '../lib/trackSort.ts';
import { cn } from '../lib/cn.ts';
import { TrackTable } from '../components/TrackTable.tsx';

const PAGE = 100;

export function TracksPage() {
  const lib = useLibrary();
  const edit = useEditor((s) => s.open);
  const play = usePlayer((s) => s.play);
  const [params] = useSearchParams();
  // /tracks?track=<id> (Go to track, for a single) starts with its title typed in, so it is the one on screen
  const [q, setQ] = useState(() => { const t = params.get('track'); return (t && lib.trackById.get(t)?.title) || ''; });
  const [sort, setSort] = useState<SortKey>('rating');
  const [dir, setDir] = useState<SortDir>('desc');
  // a link such as /tracks?era=<id> or ?artist=<id> starts with that filter already on
  const [chips, setChips] = useState<Chip[]>(() => (['artist', 'era', 'album', 'genre'] as FilterKey[]).flatMap((k) => {
    const v = params.get(k);
    if (!v) return [];
    const label = k === 'artist' ? lib.artistById.get(v)?.name : k === 'era' ? lib.eraById.get(v)?.name : k === 'album' ? lib.albumById.get(v)?.title : v;
    return label ? [{ key: k, value: v, label }] : makeChip(lib, k, v) ? [makeChip(lib, k, v)!] : [];
  }));
  const [shown, setShown] = useState(PAGE);

  const tracks = useMemo(() => {
    const needle = splitTyped(q) ? '' : q.toLowerCase(); // while a `key:` is being typed it is not a search word
    const f = lib.tracks.filter((t) =>
      (!needle || `${t.title} ${t.artistName} ${t.albumTitle ?? ''}`.toLowerCase().includes(needle)) && matchesAll(chips, trackSubject(lib, t)));
    return sortTracks(f, sort, dir);
  }, [lib, q, sort, dir, chips]);

  const playable = tracks.filter(canPlay).map((t) => t.id);
  const pick = (k: SortKey) => { if (k === sort) setDir(dir === 'asc' ? 'desc' : 'asc'); else { setSort(k); setDir(defaultDir(k)); } };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">Tracks <span className="text-base font-normal text-muted">{tracks.length}</span></h1>
        <button className="btn btn-accent" disabled={!playable.length} onClick={() => play(playable[0], playable, { type: 'search', id: null })}><Play size={15} fill="currentColor" />Play</button>
        <button className="btn" disabled={!playable.length} onClick={() => { const s = shuffleWithRules(playable, lib.rules); play(s[0], s, { type: 'search', id: null }); }}><Shuffle size={15} />Shuffle</button>
        <button className="btn" onClick={() => edit({ kind: 'new-track', id: '' })}><Plus size={15} />New track</button>
        <button className="btn" onClick={() => edit({ kind: 'upload', id: '' })}><FileAudio size={15} />Add files</button>
      </div>
      <div className="mb-4"><FilterBar scope="tracks" chips={chips} onChips={(c) => { setChips(c); setShown(PAGE); }} text={q} onText={(t) => { setQ(t); setShown(PAGE); }} /></div>
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-1 border-b border-line/60 px-3 py-1.5 text-xs text-muted" role="toolbar" aria-label="Sort by">
          <span className="mr-1">Sort</span>
          {([['title', 'Title'], ['artist', 'Artist'], ['album', 'Album'], ['released', 'Released'], ['memories', 'Memories'], ['comparisons', 'Compared']] as const).map(([k, label]) => <SortButton key={k} k={k} label={label} sort={sort} dir={dir} onPick={pick} />)}
          <span className="ml-auto"><SortButton k="rating" label="Rating" sort={sort} dir={dir} onPick={pick} /></span>
        </div>
        <TrackTable tracks={tracks.slice(0, shown)} source="search" numbered />
      </div>
      {shown < tracks.length && <div className="mt-4 text-center"><button className="btn" onClick={() => setShown(shown + PAGE)}>Show more ({tracks.length - shown} left)</button></div>}
    </div>
  );
}

function SortButton({ k, label, sort, dir, onPick }: { k: SortKey; label: string; sort: SortKey; dir: SortDir; onPick: (k: SortKey) => void }) {
  const on = sort === k;
  return (
    <button className={cn('inline-flex items-center gap-1 rounded-theme px-2 py-1 hover:text-fg', on && 'bg-raised font-semibold text-fg')} aria-pressed={on} onClick={() => onPick(k)}>
      {label}{on && (dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
    </button>
  );
}
