import { useMemo, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEditor } from '../lib/editor.ts';
import { useLibrary } from '../lib/derive.ts';
import { Cover } from '../components/Cover.tsx';

type Sort = 'title' | 'artist' | 'rating' | 'tracks';

export function AlbumsPage() {
  const lib = useLibrary();
  const edit = useEditor((s) => s.open);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('title');
  const albums = useMemo(() => {
    const f = lib.albums.filter((a) => `${a.title} ${a.artistName}`.toLowerCase().includes(q.toLowerCase()));
    const cmp: Record<Sort, (a: typeof f[0], b: typeof f[0]) => number> = {
      title: (a, b) => a.title.localeCompare(b.title),
      artist: (a, b) => a.artistName.localeCompare(b.artistName) || a.title.localeCompare(b.title),
      rating: (a, b) => (b.rating ?? -1) - (a.rating ?? -1),
      tracks: (a, b) => b.trackIds.length - a.trackIds.length,
    };
    return f.sort(cmp[sort]);
  }, [lib, q, sort]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">Albums <span className="text-base font-normal text-muted">{albums.length}</span></h1>
        <button className="btn" onClick={() => edit({ kind: 'import', id: '' })}><Download size={15} />Import</button>
        <button className="btn" onClick={() => edit({ kind: 'new-album', id: '' })}><Plus size={15} />New album</button>
        <input className="input !w-48" placeholder="Filter" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input !w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
          <option value="title">Title</option><option value="artist">Artist</option><option value="rating">Rating</option><option value="tracks">Most tracks</option>
        </select>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(var(--grid-min), 1fr))' }}>
        {albums.map((a) => (
          <Link key={a.id} to={`/albums/${a.id}`} className="group block">
            <Cover hash={a.cover} seed={a.title} className="transition-transform group-hover:scale-[1.02]" />
            <div className="mt-2 truncate text-sm font-medium">{a.title}</div>
            <div className="flex justify-between text-xs text-muted"><span className="truncate">{a.artistName}</span>{a.rating != null && <span className="tabular-nums">{a.rating.toFixed(1)}</span>}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
