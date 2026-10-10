import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Layers, MoreHorizontal, Pencil, Play, Plus } from 'lucide-react';
import { useLibrary } from '../lib/derive.ts';
import { useEditor } from '../lib/editor.ts';
import { usePlayer } from '../lib/player.ts';
import { Cover } from '../components/Cover.tsx';
import { Notes } from '../components/Notes.tsx';
import { DetailLayout } from '../components/DetailLayout.tsx';
import { SingleGrid } from '../components/SingleCard.tsx';
import { ArtistLinks } from '../components/ArtistLinks.tsx';
import { useMenu } from '../components/Menu.tsx';
import { plural } from '../lib/cn.ts';
import { useAlbumMenuItems } from '../components/entityMenus.tsx';

/** Era > Album > Release > Track: an era groups albums and singles, and can have relational bios attached. */
export function ErasPage() {
  const lib = useLibrary();
  const edit = useEditor((s) => s.open);
  const rows = useMemo(() => [...lib.eras].sort((a, b) => a.name.localeCompare(b.name)).map((e) => {
    const albums = lib.albums.filter((a) => a.eraId === e.id);
    return { era: e, albums, singles: lib.singles.filter((t) => t.eraId === e.id), cover: e.cover || albums.find((a) => a.cover)?.cover || null };
  }), [lib]);
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">Eras <span className="text-base font-normal text-muted">{rows.length}</span></h1>
        <button className="btn" onClick={() => edit({ kind: 'new-era', id: '' })}><Plus size={15} />New era</button>
      </div>
      {!rows.length && <p className="max-w-xl text-sm text-muted">An era groups albums and singles that belong to the same period (a phase of an artist, a scene). Make one here, then choose it in an album’s or single’s editor. Relational bios can be attached to an era.</p>}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(var(--grid-min), 1fr))' }}>
        {rows.map(({ era, albums, singles, cover }) => (
          <Link key={era.id} to={`/eras/${era.id}`} className="group block">
            <Cover hash={cover} seed={era.name} className="transition-transform group-hover:scale-[1.02]" />
            <div className="mt-2 truncate text-sm font-medium">{era.name}</div>
            <div className="text-xs text-muted">{plural(albums.length, 'album')} · {plural(singles.length, 'single')}</div>
          </Link>))}
      </div>
    </div>
  );
}

export function EraPage() {
  const { id } = useParams();
  const lib = useLibrary();
  const edit = useEditor((s) => s.open);
  const play = usePlayer((s) => s.play);
  const menu = useMenu();
  const albumItems = useAlbumMenuItems();
  const era = id ? lib.eraById.get(id) : undefined;
  if (!era) return <div className="text-muted">Era not found.</div>;
  const albums = lib.albums.filter((a) => a.eraId === era.id);
  const singles = lib.singles.filter((t) => t.eraId === era.id);
  const ids = [...albums.flatMap((a) => a.trackIds), ...singles.map((t) => t.id)].filter((t) => lib.trackById.get(t)?.file);
  const cover = era.cover || albums.find((a) => a.cover)?.cover || null;
  return (
    <DetailLayout right={<Notes lib={lib} type="era" id={era.id} />}>
      <div className="flex items-center gap-5">
        <Cover hash={cover} seed={era.name} className="w-40 shrink-0 sm:w-48" />
        <div className="min-w-0 space-y-2"><div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted"><Layers size={13} />Era</div>
          <h1 className="text-3xl font-bold">{era.name}</h1>
          <div className="text-sm text-muted">{plural(albums.length, 'album')} · {plural(singles.length, 'single')}</div>
          {era.description && <p className="max-w-prose text-sm">{era.description}</p>}
          <div className="flex gap-2 pt-1">
            <button className="btn btn-accent" disabled={!ids.length} onClick={() => play(ids[0], ids, { type: 'search', id: null })}><Play size={16} fill="currentColor" />Play</button>
            <button className="btn btn-ghost" onClick={() => edit({ kind: 'era', id: era.id })}><Pencil size={15} />Edit</button></div></div>
      </div>
      {albums.length > 0 && <section><h2 className="mb-3 text-lg font-semibold">Albums</h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(var(--grid-min), 1fr))' }}>
          {albums.map((a) => (
            <div key={a.id} onContextMenu={menu.onContextMenu(albumItems(a), `Actions for ${a.title}`, a.id)}>
              <Link to={`/albums/${a.id}`} className="block"><Cover hash={a.cover} seed={a.title} /><div className="mt-2 truncate text-sm font-medium">{a.title}</div></Link>
              <div className="truncate text-xs text-muted"><ArtistLinks leads={a.leads} /></div>
            </div>))}
        </div></section>}
      {singles.length > 0 && <section><h2 className="mb-3 text-lg font-semibold">Singles</h2><SingleGrid tracks={singles} /></section>}
      {!albums.length && !singles.length && <p className="text-sm text-muted">Nothing in this era yet. Choose it in an album’s or a single’s editor.</p>}
      {menu.element}
    </DetailLayout>
  );
}
