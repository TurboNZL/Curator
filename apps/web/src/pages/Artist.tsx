import { useState } from 'react';
import { canPlay } from '../lib/spotifyPlayer.ts';
import { MoreHorizontal, Pencil, Play, Shuffle } from 'lucide-react';
import { shuffleWithRules } from '@curator/core';
import { usePlayer } from '../lib/player.ts';
import { Link, useParams } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { cn } from '../lib/cn.ts';
import { useEditor } from '../lib/editor.ts';
import { useLibrary } from '../lib/derive.ts';
import { Notes } from '../components/Notes.tsx';
import { Cover } from '../components/Cover.tsx';
import { TrackTable } from '../components/TrackTable.tsx';
import { DetailLayout } from '../components/DetailLayout.tsx';
import { SingleGrid } from '../components/SingleCard.tsx';
import { ArtistLinks } from '../components/ArtistLinks.tsx';
import { useMenu } from '../components/Menu.tsx';
import { useAlbumMenuItems, useArtistMenuItems } from '../components/entityMenus.tsx';

/** The best tracks are shown in steps: a few first, then more on request, so a long discography does not make a long page. */
const FIRST = 8;
const STEP = 10;

export function ArtistPage() {
  const { id } = useParams();
  const lib = useLibrary();
  const edit = useEditor((s) => s.open);
  const play = usePlayer((s) => s.play);
  const menu = useMenu();
  const artistItems = useArtistMenuItems();
  const albumItems = useAlbumMenuItems();
  const [shown, setShown] = useState(FIRST);
  const [era, setEra] = useState<string | null>(null);
  const artist = id ? lib.artistById.get(id) : undefined;
  if (!artist) return <div className="text-muted">Artist not found.</div>;
  const credited = (cs: { artistId: string }[]) => cs.some((c) => c.artistId === artist.id);
  const allAlbums = lib.albums.filter((a) => credited(a.credits));
  const allTracks = lib.tracks.filter((t) => credited(t.credits));
  // the eras this artist appears in; picking one narrows the page to it
  const eraIds = [...new Set([...allAlbums.flatMap((a) => a.eraIds), ...allTracks.flatMap((t) => t.eraIds)])].filter((e) => lib.eraById.has(e));
  const albums = era ? allAlbums.filter((a) => a.eraIds.includes(era)) : allAlbums;
  const tracks = (era ? allTracks.filter((t) => t.eraIds.includes(era)) : allTracks).sort((a, b) => b.effectiveRating - a.effectiveRating || b.elo - a.elo);
  const singles = tracks.filter((t) => !t.albumId);
  const playable = tracks.filter(canPlay).map((t) => t.id);
  const visible = tracks.slice(0, shown);
  const left = tracks.length - visible.length;
  return (
    <DetailLayout right={<Notes lib={lib} type="artist" id={artist.id} />}>
      <div className="flex items-center gap-5" onContextMenu={menu.onContextMenu(artistItems(artist.id), `Actions for ${artist.name}`, 'artist')}>
        <Cover kind="artist" hash={artist.image} seed={artist.name} className="w-32 shrink-0 sm:w-40" />
        <div><div className="text-xs uppercase tracking-wider text-muted">Artist</div><h1 className="text-3xl font-bold">{artist.name}</h1>
          <div className="text-sm text-muted">{albums.length} album{albums.length === 1 ? "" : "s"}{singles.length > 0 && ` · ${singles.length} single${singles.length === 1 ? "" : "s"}`} · {tracks.length} tracks</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn btn-accent" disabled={!playable.length} onClick={() => play(playable[0], playable, { type: 'search', id: null })}><Play size={16} fill="currentColor" />Play</button>
            <button className="btn" disabled={!playable.length} onClick={() => { const s = shuffleWithRules(playable, lib.rules); play(s[0], s, { type: 'search', id: null }); }}><Shuffle size={16} />Shuffle</button>
            <button className="btn btn-ghost" onClick={() => edit({ kind: 'artist', id: artist.id })}><Pencil size={15} />Edit</button>
            <button data-menu-trigger className="btn btn-ghost !p-2" aria-label="More actions" aria-haspopup="menu" onClick={(e) => menu.toggle(e.currentTarget, 'artist', artistItems(artist.id), `Actions for ${artist.name}`)}><MoreHorizontal size={16} /></button></div></div>
      </div>
      {eraIds.length > 0 && <section className="flex flex-wrap items-center gap-2" aria-label="Eras">
        <span className="flex items-center gap-1.5 text-sm font-medium"><Layers size={14} />Eras</span>
        {eraIds.map((e) => (
          <span key={e} className={cn('inline-flex overflow-hidden rounded-full border text-sm', era === e ? 'border-accent text-accent' : 'border-line')}>
            <button className="px-3 py-1 hover:bg-raised/60" aria-pressed={era === e} title="Show only this era" onClick={() => { setEra(era === e ? null : e); setShown(FIRST); }}>{lib.eraById.get(e)!.name}</button>
            <Link to={`/eras/${e}`} className="border-l border-line px-2 py-1 text-muted hover:text-fg" aria-label={`Open ${lib.eraById.get(e)!.name}`}>↗</Link>
          </span>))}
        {era && <button className="text-xs text-muted underline" onClick={() => setEra(null)}>Show everything</button>}
      </section>}
      {albums.length > 0 && <section><h2 className="mb-3 text-lg font-semibold">Albums</h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(var(--grid-min), 1fr))' }}>
          {albums.map((a) => (
            <div key={a.id} className="bt-tile" onContextMenu={menu.onContextMenu(albumItems(a), `Actions for ${a.title}`, a.id)}>
              <Link to={`/albums/${a.id}`} className="block"><Cover hash={a.cover} seed={a.title} /><div className="bt-cap-t mt-2 truncate text-sm font-medium">{a.title}</div></Link>
              <div className="bt-cap truncate text-xs text-muted"><ArtistLinks leads={a.leads} /></div>
            </div>))}
        </div></section>}
      {singles.length > 0 && <section><h2 className="mb-3 text-lg font-semibold">Singles</h2><SingleGrid tracks={singles} /></section>}
      <section><h2 className="mb-3 text-lg font-semibold">Tracks, best first</h2>
        <div className="card overflow-hidden"><TrackTable tracks={visible} source="search" />
          {left > 0 && (
            <div className="flex items-center justify-center gap-2 border-t border-line/60 p-2.5">
              <button className="btn btn-ghost" onClick={() => setShown(shown + STEP)}>Show {Math.min(STEP, left)} more</button>
              {left > STEP && <button className="btn btn-ghost" onClick={() => setShown(tracks.length)}>Show all {tracks.length}</button>}
              <span className="text-xs text-muted">{visible.length} of {tracks.length}</span>
            </div>)}
          {shown > FIRST && left <= 0 && tracks.length > FIRST && <div className="flex justify-center border-t border-line/60 p-2.5"><button className="btn btn-ghost" onClick={() => setShown(FIRST)}>Show fewer</button></div>}
        </div></section>
      {menu.element}
    </DetailLayout>
  );
}
