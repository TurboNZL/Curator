import { Pencil } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useEditor } from '../lib/editor.ts';
import { useLibrary } from '../lib/derive.ts';
import { Bios } from '../components/Bios.tsx';
import { Notes } from '../components/Notes.tsx';
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
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-5">
        <Cover kind="artist" hash={artist.image} seed={artist.name} className="w-32 shrink-0 sm:w-40" />
        <div><div className="text-xs uppercase tracking-wider text-muted">Artist</div><h1 className="text-3xl font-bold">{artist.name}</h1>
          <div className="text-sm text-muted">{albums.length} albums · {tracks.length} tracks</div>
          <button className="btn btn-ghost mt-2 -ml-3" onClick={() => edit({ kind: 'artist', id: artist.id })}><Pencil size={15} />Edit</button></div>
      </div>
      {albums.length > 0 && <section><h2 className="mb-3 text-lg font-semibold">Albums</h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(var(--grid-min), 1fr))' }}>
          {albums.map((a) => <Link key={a.id} to={`/albums/${a.id}`}><Cover hash={a.cover} seed={a.title} /><div className="mt-2 truncate text-sm font-medium">{a.title}</div></Link>)}
        </div></section>}
      <section><h2 className="mb-3 text-lg font-semibold">Tracks, best first</h2><div className="card overflow-hidden"><TrackTable tracks={tracks} source="search" /></div></section>
      <Bios lib={lib} type="artist" id={artist.id} />
      <Notes lib={lib} type="artist" id={artist.id} />
    </div>
  );
}
