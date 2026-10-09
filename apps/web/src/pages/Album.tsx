import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ListOrdered, Pencil, Play, Plus, Shuffle } from 'lucide-react';
import { shuffleWithRules } from '@curator/core';
import { useLibrary } from '../lib/derive.ts';
import { useEditor } from '../lib/editor.ts';
import { usePlayer } from '../lib/player.ts';
import { Cover } from '../components/Cover.tsx';
import { Bios } from '../components/Bios.tsx';
import { Notes } from '../components/Notes.tsx';
import { KeepOffline } from '../components/KeepOffline.tsx';
import { TracklistEditor } from '../components/TracklistEditor.tsx';
import { TrackTable } from '../components/TrackTable.tsx';

export function AlbumPage() {
  const { id } = useParams();
  const lib = useLibrary();
  const play = usePlayer((s) => s.play);
  const edit = useEditor((s) => s.open);
  const [arranging, setArranging] = useState(false);
  const album = id ? lib.albumById.get(id) : undefined;
  if (!album) return <div className="text-muted">Album not found.</div>;
  const tracks = album.trackIds.map((t) => lib.trackById.get(t)!);
  const playable = tracks.filter((t) => t.file).map((t) => t.id);
  const releases = lib.releases.filter((r) => r.albumId === album.id);

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
            <button className="btn btn-ghost" onClick={() => edit({ kind: 'album', id: album.id })}><Pencil size={15} />Edit</button>
            <button className={`btn ${arranging ? 'btn-accent' : 'btn-ghost'}`} onClick={() => setArranging(!arranging)}><ListOrdered size={15} />{arranging ? 'Done' : 'Edit tracks'}</button>
            <KeepOffline hashes={tracks.flatMap((t) => (t.file ? [t.file] : []))} />
          </div>
          {!playable.length && <div className="text-xs text-muted">No audio on the server yet. Use Settings → Download missing audio.</div>}
        </div>
      </div>

      {arranging ? <TracklistEditor album={album} lib={lib} />
        : <div className="card overflow-hidden"><TrackTable tracks={tracks} source="album" sourceId={album.id} numbered showAlbum={false} />{!tracks.length && <div className="px-4 pb-4 text-center text-xs text-muted">Use “Edit tracks” to add some.</div>}</div>}

      <section className="space-y-2">
        <div className="flex items-center gap-2"><h2 className="text-lg font-semibold">Releases</h2>
          <button className="btn btn-ghost !p-1.5" aria-label="New release" onClick={() => edit({ kind: 'new-release', id: album.id })}><Plus size={16} /></button></div>
        {!releases.length && <p className="text-sm text-muted">No releases. A release is an edition of the album (deluxe, streaming, vinyl) with its own date and tracklist.</p>}
        <div className="grid gap-2 sm:grid-cols-2">{releases.map((r) => (
          <button key={r.id} className="card px-4 py-3 text-left text-sm hover:bg-raised/50" onClick={() => edit({ kind: 'release', id: r.id })}>
            <div className="flex items-center justify-between gap-2"><span className="font-medium">{r.title}</span>{album.defaultReleaseId === r.id && <span className="chip">default</span>}</div>
            <div className="text-xs text-muted">{r.releaseDate ?? 'undated'} · {r.trackIds.length} tracks</div></button>))}</div>
      </section>
      <Bios lib={lib} type="album" id={album.id} />
      <Notes lib={lib} type="album" id={album.id} />
    </div>
  );
}
