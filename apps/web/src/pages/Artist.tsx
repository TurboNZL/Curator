import { Pencil } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useEditor } from '../lib/editor.ts';
import { useLibrary } from '../lib/derive.ts';
import { Cover } from '../components/Cover.tsx';
import { TrackTable } from '../components/TrackTable.tsx';

export function ArtistPage() {
  const { id } = useParams();
  const lib = useLibrary();
  const edit = useEditor((s) => s.open);
  const artist = id ? lib.artistById.get(id) : undefined;
  if (!artist) return <div className="text-muted">Artist not found.</div>;
  const albums = lib.albums.filter((a) => a.artistId === artist.id || a.credits.some((c) => c.artistId === artist.id));
  const tracks = lib.tracks.filter((t) => t.artistId === artist.id || t.credits.some((c) => c.artistId === artist.id))
    .sort((a, b) => b.effectiveRating - a.effectiveRating || b.elo - a.elo);
  const notes = lib.notes.filter((n) => n.entityType === 'artist' && n.entityId === artist.id);
  const groups = lib.groups.filter((g) => g.members.some((m) => m.entityType === 'artist' && m.entityId === artist.id && m.showOnEntityPage));
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-5">
        <Cover kind="artist" hash={artist.image} seed={artist.name} className="w-32 shrink-0 sm:w-40" />
        <div><div className="text-xs uppercase tracking-wider text-muted">Artist</div><h1 className="text-3xl font-bold">{artist.name}</h1>
          <div className="text-sm text-muted">{albums.length} albums · {tracks.length} tracks</div>
          <button className="btn btn-ghost mt-2 -ml-3" onClick={() => edit({ kind: 'artist', id: artist.id })}><Pencil size={15} />Edit</button></div>
      </div>
      {groups.map((g) => <section key={g.id} className="card p-4"><div className="text-sm font-semibold">{g.label ?? g.name}</div><p className="mt-1 text-sm text-muted">{g.description}</p></section>)}
      {albums.length > 0 && <section><h2 className="mb-3 text-lg font-semibold">Albums</h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(var(--grid-min), 1fr))' }}>
          {albums.map((a) => <Link key={a.id} to={`/albums/${a.id}`}><Cover hash={a.cover} seed={a.title} /><div className="mt-2 truncate text-sm font-medium">{a.title}</div></Link>)}
        </div></section>}
      <section><h2 className="mb-3 text-lg font-semibold">Tracks, best first</h2><div className="card overflow-hidden"><TrackTable tracks={tracks} source="search" /></div></section>
      {notes.map((n) => <section key={n.id} className="card p-4"><div className="text-sm font-semibold">{n.label}</div><p className="mt-1 whitespace-pre-wrap text-sm text-muted">{n.content}</p></section>)}
    </div>
  );
}
