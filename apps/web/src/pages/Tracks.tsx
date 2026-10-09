import { useMemo, useState } from 'react';
import { useLibrary } from '../lib/derive.ts';
import { TrackTable } from '../components/TrackTable.tsx';

type Sort = 'rating' | 'title' | 'artist' | 'comparisons' | 'unrated';
const PAGE = 100;

export function TracksPage() {
  const lib = useLibrary();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('rating');
  const [genre, setGenre] = useState('');
  const [onlyFav, setOnlyFav] = useState(false);
  const [onlyPlayable, setOnlyPlayable] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const tracks = useMemo(() => {
    const needle = q.toLowerCase();
    const f = lib.tracks.filter((t) =>
      (!needle || `${t.title} ${t.artistName} ${t.albumTitle ?? ''}`.toLowerCase().includes(needle)) &&
      (!genre || t.allGenres.includes(genre)) && (!onlyFav || t.isFavorite) && (!onlyPlayable || t.file));
    const cmp: Record<Sort, (a: typeof f[0], b: typeof f[0]) => number> = {
      rating: (a, b) => b.effectiveRating - a.effectiveRating || b.elo - a.elo,
      title: (a, b) => a.title.localeCompare(b.title),
      artist: (a, b) => a.artistName.localeCompare(b.artistName) || a.title.localeCompare(b.title),
      comparisons: (a, b) => b.comparisons - a.comparisons,
      unrated: (a, b) => a.comparisons - b.comparisons,
    };
    return f.sort(cmp[sort]);
  }, [lib, q, sort, genre, onlyFav, onlyPlayable]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">Tracks <span className="text-base font-normal text-muted">{tracks.length}</span></h1>
        <input className="input !w-48" placeholder="Filter" value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} />
        <select className="input !w-auto" value={genre} onChange={(e) => setGenre(e.target.value)} aria-label="Genre">
          <option value="">All genres</option>{lib.genres.map((g) => <option key={g.id}>{g.name}</option>)}
        </select>
        <select className="input !w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
          <option value="rating">Best rated</option><option value="title">Title</option><option value="artist">Artist</option>
          <option value="comparisons">Most compared</option><option value="unrated">Least compared</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-muted"><input type="checkbox" checked={onlyFav} onChange={(e) => setOnlyFav(e.target.checked)} />Favourites</label>
        <label className="flex items-center gap-1.5 text-sm text-muted"><input type="checkbox" checked={onlyPlayable} onChange={(e) => setOnlyPlayable(e.target.checked)} />Has audio</label>
      </div>
      <div className="card overflow-hidden"><TrackTable tracks={tracks.slice(0, shown)} source="search" numbered /></div>
      {shown < tracks.length && <div className="mt-4 text-center"><button className="btn" onClick={() => setShown(shown + PAGE)}>Show more ({tracks.length - shown} left)</button></div>}
    </div>
  );
}
