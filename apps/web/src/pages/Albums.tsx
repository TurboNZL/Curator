import { Select } from '../components/Select.tsx';
import { FilterBar } from '../components/FilterBar.tsx';
import { albumSubject, matchesAll, splitTyped, type Chip } from '../lib/filters.ts';
import { useMemo, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEditor } from '../lib/editor.ts';
import { useLibrary } from '../lib/derive.ts';
import { Cover } from '../components/Cover.tsx';
import { useMenu } from '../components/Menu.tsx';
import { useAlbumMenuItems } from '../components/entityMenus.tsx';
import { ArtistLinks } from '../components/ArtistLinks.tsx';

type Sort = 'title' | 'artist' | 'rating' | 'tracks' | 'memories' | 'released';

export function AlbumsPage() {
  const lib = useLibrary();
  const edit = useEditor((s) => s.open);
  const menu = useMenu();
  const itemsFor = useAlbumMenuItems();
  const [q, setQ] = useState('');
  const [chips, setChips] = useState<Chip[]>([]);
  const [sort, setSort] = useState<Sort>('title');
  const albums = useMemo(() => {
    const needle = splitTyped(q) ? '' : q.toLowerCase();
    const f = lib.albums.filter((a) => `${a.title} ${a.artistName}`.toLowerCase().includes(needle) && matchesAll(chips, albumSubject(lib, a)));
    const mem = (a: typeof f[0]) => a.trackIds.reduce((n, id) => n + (lib.trackById.get(id)?.memories ?? 0), 0);
    const cmp: Record<Sort, (a: typeof f[0], b: typeof f[0]) => number> = {
      title: (a, b) => a.title.localeCompare(b.title),
      artist: (a, b) => a.artistName.localeCompare(b.artistName) || a.title.localeCompare(b.title),
      rating: (a, b) => (b.rating ?? -1) - (a.rating ?? -1),
      tracks: (a, b) => b.trackIds.length - a.trackIds.length,
      memories: (a, b) => mem(b) - mem(a),
      released: (a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''),
    };
    return f.sort(cmp[sort]);
  }, [lib, q, chips, sort]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">Albums <span className="text-base font-normal text-muted">{albums.length}</span></h1>
        <button className="btn" onClick={() => edit({ kind: 'import', id: '' })}><Download size={15} />Import</button>
        <button className="btn" onClick={() => edit({ kind: 'new-album', id: '' })}><Plus size={15} />New album</button>
        <Select className="!w-40" aria-label="Sort" value={sort} onChange={(v) => setSort(v as Sort)} options={[{ value: 'title', label: 'Title' }, { value: 'artist', label: 'Artist' }, { value: 'rating', label: 'Rating' }, { value: 'tracks', label: 'Most tracks' }, { value: 'memories', label: 'Memories' }, { value: 'released', label: 'Newest' }]} />
      </div>
      <div className="mb-5"><FilterBar scope="albums" chips={chips} onChips={setChips} text={q} onText={setQ} /></div>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(var(--grid-min), 1fr))' }}>
        {albums.map((a) => (
          <div key={a.id} className="bt-tile group" onContextMenu={menu.onContextMenu(itemsFor(a), `Actions for ${a.title}`, a.id)}>
            <Link to={`/albums/${a.id}`} className="block">
              <Cover hash={a.cover} seed={a.title} className="transition-transform group-hover:scale-[1.02]" />
              <div className="bt-cap-t mt-2 truncate text-sm font-medium">{a.title}</div>
            </Link>
            <div className="bt-cap flex justify-between text-xs text-muted"><span className="truncate"><ArtistLinks leads={a.leads} /></span>{a.rating != null && <span className="tabular-nums">{a.rating.toFixed(1)}</span>}</div>
          </div>
        ))}
      </div>
      {menu.element}
    </div>
  );
}
