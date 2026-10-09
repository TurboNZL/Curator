import { Link, useSearchParams } from 'react-router-dom';
import { useLibrary } from '../lib/derive.ts';
import { Cover } from '../components/Cover.tsx';
import { TrackTable } from '../components/TrackTable.tsx';

export function SearchPage() {
  const [params] = useSearchParams();
  const q = (params.get('q') ?? '').toLowerCase();
  const lib = useLibrary();
  const artists = lib.artists.filter((a) => a.name.toLowerCase().includes(q));
  const albums = lib.albums.filter((a) => `${a.title} ${a.artistName}`.toLowerCase().includes(q));
  const tracks = lib.tracks.filter((t) => `${t.title} ${t.artistName}`.toLowerCase().includes(q)).sort((a, b) => b.effectiveRating - a.effectiveRating);
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Results for “{params.get('q')}”</h1>
      {artists.length > 0 && <section><h2 className="mb-2 font-semibold">Artists</h2><div className="flex flex-wrap gap-3">{artists.slice(0, 12).map((a) => (
        <Link key={a.id} to={`/artists/${a.id}`} className="card flex w-48 items-center gap-3 p-2"><Cover kind="artist" hash={a.image} seed={a.name} className="w-10" /><span className="truncate text-sm">{a.name}</span></Link>))}</div></section>}
      {albums.length > 0 && <section><h2 className="mb-2 font-semibold">Albums</h2><div className="flex flex-wrap gap-3">{albums.slice(0, 12).map((a) => (
        <Link key={a.id} to={`/albums/${a.id}`} className="card flex w-56 items-center gap-3 p-2"><Cover hash={a.cover} seed={a.title} className="w-10" /><span className="min-w-0"><span className="block truncate text-sm">{a.title}</span><span className="block truncate text-xs text-muted">{a.artistName}</span></span></Link>))}</div></section>}
      <section><h2 className="mb-2 font-semibold">Tracks</h2><div className="card overflow-hidden"><TrackTable tracks={tracks.slice(0, 100)} source="search" /></div></section>
    </div>
  );
}
