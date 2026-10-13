import { useMemo, useState } from 'react';
import { ListToolbar } from '../components/ListToolbar.tsx';
import { EntityList } from '../components/EntityList.tsx';
import { eraSubject, matchesAll, splitTyped, type Chip } from '../lib/filters.ts';
import { ERA_SORTS, eraRows, sortEras } from '../lib/listSort.ts';
import { usePageState } from '../lib/pageState.ts';
import { canPlay } from '../lib/spotifyPlayer.ts';
import { Link, useParams } from 'react-router-dom';
import { statsPath } from '../lib/entityStats.ts';
import { BarChart3, Layers, MoreHorizontal, Pencil, Play, Plus, Shuffle } from 'lucide-react';
import { shuffleWithRules } from '@curator/core';
import { useLibrary } from '../lib/derive.ts';
import { useEditor } from '../lib/editor.ts';
import { usePlayer } from '../lib/player.ts';
import { Cover } from '../components/Cover.tsx';
import { PlaylistCover } from '../components/PlaylistCover.tsx';
import { playlistCount } from '../lib/playlists.ts';
import { Notes } from '../components/Notes.tsx';
import { DetailLayout } from '../components/DetailLayout.tsx';
import { SingleGrid } from '../components/SingleCard.tsx';
import { ArtistLinks } from '../components/ArtistLinks.tsx';
import { useMenu } from '../components/Menu.tsx';
import { plural } from '../lib/cn.ts';
import { useAlbumMenuItems } from '../components/entityMenus.tsx';

/** An era is a collection of albums, singles and playlists (they can overlap); notes can be tied to it. */
export function ErasPage() {
  const lib = useLibrary();
  const edit = useEditor((s) => s.open);
  const [q, setQ] = useState('');
  const [chips, setChips] = useState<Chip[]>([]);
  const page = usePageState('eras', ERA_SORTS, { sort: 'name' });
  const all = useMemo(() => eraRows(lib), [lib]);
  const rows = useMemo(() => {
    const needle = splitTyped(q, 'eras') ? '' : q.toLowerCase();
    const f = all.filter((r) => r.era.name.toLowerCase().includes(needle) && (!chips.length || matchesAll(chips, eraSubject(lib, r.era))));
    return sortEras(f, page.sort, page.dir);
  }, [lib, all, q, chips, page.sort, page.dir]);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">Eras <span className="text-base font-normal text-muted">{rows.length}</span></h1>
        <button className="btn" onClick={() => edit({ kind: 'new-era', id: '' })}><Plus size={15} />New era</button>
      </div>
      <ListToolbar scope="eras" chips={chips} onChips={setChips} text={q} onText={setQ} placeholder="Search eras, or filter: artist, genre, before…" sorts={ERA_SORTS} sort={page.sort} dir={page.dir} onSort={page.setSort} onFlip={page.flip} view={page.view} onView={page.setView} />
      {!all.length && <p className="max-w-xl text-sm text-muted">An era groups albums and singles that belong to the same period (a phase of an artist, a scene). Make one here and fill it, or choose it in an album’s or single’s editor. Eras can overlap, and notes and playlists can belong to them.</p>}
      {all.length > 0 && !rows.length && <p className="text-sm text-muted">No eras match.</p>}
      {page.view === 'list'
        ? <EntityList rows={rows.map(({ era, albums, singles, cover }) => ({ id: era.id, to: `/eras/${era.id}`, cover, seed: era.name, title: era.name, sub: `${plural(albums.length, 'album')} · ${plural(singles.length, 'single')}` }))} />
        : <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(var(--grid-min), 1fr))' }}>
            {rows.map(({ era, albums, singles, cover }) => (
              <Link key={era.id} to={`/eras/${era.id}`} className="bt-tile group block">
                <Cover hash={cover} seed={era.name} className="transition-transform group-hover:scale-[1.02]" />
                <div className="bt-cap-t mt-2 truncate text-sm font-medium">{era.name}</div>
                <div className="bt-cap text-xs text-muted">{plural(albums.length, 'album')} · {plural(singles.length, 'single')}</div>
              </Link>))}
          </div>}
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
  // oldest first by release date ("2019" < "2019-05" < "2019-05-02"); what has no date goes last, in the order it was added
  const byDate = <T extends { releaseDate: string | null }>(xs: T[]) => xs.map((x, i) => ({ x, i })).sort((a, b) => (a.x.releaseDate ?? '\uffff').localeCompare(b.x.releaseDate ?? '\uffff') || a.i - b.i).map((e) => e.x);
  const albums = byDate(era.albumIds.flatMap((id) => lib.albumById.get(id) ?? []));
  const singles = byDate(era.trackIds.flatMap((id) => lib.trackById.get(id) ?? []));
  const playlists = era.playlistIds.flatMap((id) => lib.playlists.find((p) => p.id === id) ?? []);
  const ids = [...albums.flatMap((a) => a.trackIds), ...singles.map((t) => t.id)].filter((t) => canPlay(lib.trackById.get(t)));
  const cover = era.cover || albums.find((a) => a.cover)?.cover || null;
  return (
    <DetailLayout right={<Notes lib={lib} type="era" id={era.id} />}>
      <div className="flex items-center gap-5">
        <Cover hash={cover} seed={era.name} className="w-40 shrink-0 sm:w-48" />
        <div className="min-w-0 space-y-2"><div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted"><Layers size={13} />Era</div>
          <h1 className="text-3xl font-bold">{era.name}</h1>
          <div className="text-sm text-muted">{plural(albums.length, 'album')} · {plural(singles.length, 'single')}{playlists.length > 0 && ` · ${plural(playlists.length, 'playlist')}`}</div>
          {era.description && <p className="max-w-prose text-sm">{era.description}</p>}
          <div className="flex gap-2 pt-1">
            <button className="btn btn-accent" disabled={!ids.length} onClick={() => play(ids[0], ids, { type: 'search', id: null })}><Play size={16} fill="currentColor" />Play</button>
            <button className="btn" disabled={!ids.length} onClick={() => { const s = shuffleWithRules(ids, lib.rules); play(s[0], s, { type: 'search', id: null }); }}><Shuffle size={15} />Shuffle</button>
            <Link className="btn btn-ghost" to={`/tracks?era=${era.id}`}><Layers size={15} />Tracks in this era</Link>
            <Link className="btn btn-ghost" to={statsPath('era', era.id)}><BarChart3 size={15} />Stats</Link>
            <button className="btn btn-ghost" onClick={() => edit({ kind: 'era', id: era.id })}><Pencil size={15} />Edit</button></div></div>
      </div>
      {albums.length > 0 && <section><h2 className="mb-3 text-lg font-semibold">Albums</h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(var(--grid-min), 1fr))' }}>
          {albums.map((a) => (
            <div key={a.id} className="bt-tile" onContextMenu={menu.onContextMenu(albumItems(a), `Actions for ${a.title}`, a.id)}>
              <Link to={`/albums/${a.id}`} className="block"><Cover hash={a.cover} seed={a.title} /><div className="bt-cap-t mt-2 truncate text-sm font-medium">{a.title}</div></Link>
              <div className="bt-cap truncate text-xs text-muted"><ArtistLinks leads={a.leads} /></div>
            </div>))}
        </div></section>}
      {singles.length > 0 && <section><h2 className="mb-3 text-lg font-semibold">Singles</h2><SingleGrid tracks={singles} /></section>}
      {playlists.length > 0 && <section><h2 className="mb-3 text-lg font-semibold">Playlists</h2>
        <div className="grid gap-3 sm:grid-cols-2">{playlists.map((p) => (
          <Link key={p.id} to="/playlists" className="card flex items-center gap-3 p-3 hover:bg-raised/50"><PlaylistCover playlist={p} className="h-12 w-12 shrink-0" /><div className="min-w-0"><div className="truncate font-medium">{p.name}</div><div className="text-xs text-muted">{plural(playlistCount(lib, p).n, playlistCount(lib, p).noun)}</div></div></Link>))}</div></section>}
      {!albums.length && !singles.length && !playlists.length && <p className="text-sm text-muted">Nothing in this era yet. Edit the era to add albums, singles and playlists, or choose it in an album’s or single’s editor.</p>}
      {menu.element}
    </DetailLayout>
  );
}
