import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEditor } from '../lib/editor.ts';
import { useLibrary } from '../lib/derive.ts';
import { Cover } from '../components/Cover.tsx';
import { useMenu } from '../components/Menu.tsx';
import { plural } from '../lib/cn.ts';
import { useArtistMenuItems } from '../components/entityMenus.tsx';

export function ArtistsPage() {
  const lib = useLibrary();
  const edit = useEditor((s) => s.open);
  const menu = useMenu();
  const itemsFor = useArtistMenuItems();
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of lib.tracks) for (const l of t.leads) counts.set(l.id, (counts.get(l.id) ?? 0) + 1);
    return lib.artists.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()))
      .map((a) => ({ ...a, count: counts.get(a.id) ?? 0 })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [lib, q]);
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">Artists <span className="text-base font-normal text-muted">{rows.length}</span></h1>
        <button className="btn" onClick={() => edit({ kind: 'new-artist', id: '' })}><Plus size={15} />New artist</button>
        <input className="input !w-48" placeholder="Filter" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(var(--grid-min), 1fr))' }}>
        {rows.map((a) => (
          <Link key={a.id} to={`/artists/${a.id}`} className="group block text-center" onContextMenu={menu.onContextMenu(itemsFor(a.id), `Actions for ${a.name}`, a.id)}>
            <Cover kind="artist" hash={a.image} seed={a.name} className="mx-auto w-full transition-transform group-hover:scale-[1.03]" />
            <div className="mt-2 truncate text-sm font-medium">{a.name}</div>
            <div className="text-xs text-muted">{plural(a.count, 'track')}</div>
          </Link>
        ))}
      </div>
      {menu.element}
    </div>
  );
}
