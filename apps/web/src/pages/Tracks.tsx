import { useMemo, useState } from 'react';
import { useLibrary } from '../lib/derive.ts';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { defaultDir, sortTracks, type SortDir, type SortKey } from '../lib/trackSort.ts';
import { cn } from '../lib/cn.ts';
import { TrackTable } from '../components/TrackTable.tsx';

const PAGE = 100;

export function TracksPage() {
  const lib = useLibrary();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('rating');
  const [dir, setDir] = useState<SortDir>('desc');
  const [genre, setGenre] = useState('');
  const [onlyFav, setOnlyFav] = useState(false);
  const [onlyPlayable, setOnlyPlayable] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const tracks = useMemo(() => {
    const needle = q.toLowerCase();
    const f = lib.tracks.filter((t) =>
      (!needle || `${t.title} ${t.artistName} ${t.albumTitle ?? ''}`.toLowerCase().includes(needle)) &&
      (!genre || t.allGenres.includes(genre)) && (!onlyFav || t.isFavorite) && (!onlyPlayable || t.file));
    return sortTracks(f, sort, dir);
  }, [lib, q, sort, dir, genre, onlyFav, onlyPlayable]);

  const pick = (k: SortKey) => { if (k === sort) setDir(dir === 'asc' ? 'desc' : 'asc'); else { setSort(k); setDir(defaultDir(k)); } };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">Tracks <span className="text-base font-normal text-muted">{tracks.length}</span></h1>
        <input className="input !w-48" placeholder="Filter" value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} />
        <select className="input !w-auto" value={genre} onChange={(e) => setGenre(e.target.value)} aria-label="Genre">
          <option value="">All genres</option>{lib.genres.map((g) => <option key={g.id}>{g.name}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-muted"><input type="checkbox" checked={onlyFav} onChange={(e) => setOnlyFav(e.target.checked)} />Favourites</label>
        <label className="flex items-center gap-1.5 text-sm text-muted"><input type="checkbox" checked={onlyPlayable} onChange={(e) => setOnlyPlayable(e.target.checked)} />Has audio</label>
      </div>
      <div className="card overflow-hidden">
        <div className="flex items-center gap-1 border-b border-line/60 px-3 py-1.5 text-xs text-muted" role="toolbar" aria-label="Sort by">
          <span className="mr-1">Sort</span>
          {([['title', 'Title'], ['artist', 'Artist'], ['album', 'Album'], ['comparisons', 'Compared']] as const).map(([k, label]) => <SortButton key={k} k={k} label={label} sort={sort} dir={dir} onPick={pick} />)}
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
