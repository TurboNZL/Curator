import { Link, useParams } from 'react-router-dom';
import { Play, Shuffle } from 'lucide-react';
import { shuffleWithRules } from '@curator/core';
import { useLibrary } from '../lib/derive.ts';
import { usePlayer } from '../lib/player.ts';
import { Cover } from '../components/Cover.tsx';
import { TrackTable } from '../components/TrackTable.tsx';

export function AlbumPage() {
  const { id } = useParams();
  const lib = useLibrary();
  const play = usePlayer((s) => s.play);
  const album = id ? lib.albumById.get(id) : undefined;
  if (!album) return <div className="text-muted">Album not found.</div>;
  const tracks = album.trackIds.map((t) => lib.trackById.get(t)!);
  const playable = tracks.filter((t) => t.file).map((t) => t.id);
  const releases = lib.releases.filter((r) => r.albumId === album.id);
  const notes = lib.notes.filter((n) => n.entityType === 'album' && n.entityId === album.id);
  const groups = lib.groups.filter((g) => g.members.some((m) => m.entityType === 'album' && m.entityId === album.id && m.showOnEntityPage));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <Cover hash={album.cover} seed={album.title} className="w-48 shrink-0 sm:w-56" />
        <div className="min-w-0 space-y-2">
          <div className="text-xs uppercase tracking-wider text-muted">Album</div>
          <h1 className="text-3xl font-bold leading-tight">{album.title}</h1>
          <div className="text-sm">
            <Link to={`/artists/${album.artistId}`} className="font-medium hover:underline">{album.artistName}</Link>
            <span className="text-muted"> · {tracks.length} tracks{album.rating != null && ` · avg ${album.rating.toFixed(1)}`}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">{album.genres.map((g) => <span key={g} className="chip">{g}</span>)}</div>
          <div className="flex gap-2 pt-2">
            <button className="btn btn-accent" disabled={!playable.length} onClick={() => play(playable[0], playable, { type: 'album', id: album.id })}><Play size={16} fill="currentColor" />Play</button>
            <button className="btn" disabled={!playable.length} onClick={() => { const s = shuffleWithRules(playable, lib.rules); play(s[0], s, { type: 'album', id: album.id }); }}><Shuffle size={16} />Shuffle</button>
          </div>
          {!playable.length && <div className="text-xs text-muted">No audio on the server yet. Use Settings → Download missing audio.</div>}
        </div>
      </div>

      <div className="card overflow-hidden"><TrackTable tracks={tracks} source="album" sourceId={album.id} numbered showAlbum={false} /></div>

      {releases.length > 0 && (
        <section><h2 className="mb-2 text-lg font-semibold">Releases</h2>
          <div className="grid gap-2 sm:grid-cols-2">{releases.map((r) => (
            <div key={r.id} className="card px-4 py-3 text-sm"><div className="font-medium">{r.title}</div><div className="text-xs text-muted">{r.releaseDate ?? 'undated'} · {r.trackIds.length} tracks</div></div>
          ))}</div>
        </section>
      )}
      {groups.map((g) => (
        <section key={g.id} className="card p-4"><div className="text-sm font-semibold">{g.label ?? g.name}</div><p className="mt-1 text-sm text-muted">{g.description}</p></section>
      ))}
      {notes.map((n) => (
        <section key={n.id} className="card p-4"><div className="text-sm font-semibold">{n.label}</div><p className="mt-1 whitespace-pre-wrap text-sm text-muted">{n.content}</p></section>
      ))}
    </div>
  );
}
