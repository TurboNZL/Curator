import { useState } from 'react';
import { ArrowDown, ArrowUp, Link2, Pencil, Play, Plus, Shuffle, X } from 'lucide-react';
import { shuffleWithRules } from '@curator/core';
import { moveTrack, removeTrack } from '../lib/defaults.ts';
import { useLibrary } from '../lib/derive.ts';
import { useEditor } from '../lib/editor.ts';
import { usePlayer } from '../lib/player.ts';
import { useStore } from '../lib/store.ts';
import { Cover } from '../components/Cover.tsx';
import { KeepOffline } from '../components/KeepOffline.tsx';
import { plural } from '../lib/cn.ts';
import { TrackTable } from '../components/TrackTable.tsx';

export function PlaylistsPage() {
  const lib = useLibrary();
  const patch = useStore((s) => s.patch);
  const edit = useEditor((s) => s.open);
  const play = usePlayer((s) => s.play);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState('');
  const open = lib.playlists.find((p) => p.id === openId);
  const tracks = open ? open.trackIds.map((id) => lib.trackById.get(id)).filter((t) => !!t) : [];
  const playable = tracks.filter((t) => t.file).map((t) => t.id);
  const matches = adding.length > 1 ? lib.tracks.filter((t) => `${t.title} ${t.artistName}`.toLowerCase().includes(adding.toLowerCase())).slice(0, 6) : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3"><h1 className="mr-auto text-2xl font-bold">Playlists</h1>
        <button className="btn btn-accent" onClick={() => edit({ kind: 'new-playlist', id: '' })}><Plus size={16} />New playlist</button></div>
      <div className="flex flex-wrap gap-2">{lib.playlists.map((p) => (
        <button key={p.id} onClick={() => setOpenId(p.id)} className={`btn ${openId === p.id ? 'btn-accent' : ''}`}>{p.name} <span className="opacity-60">{p.trackIds.length}</span></button>))}</div>
      {open && (
        <section className="space-y-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Cover hash={open.cover} seed={open.name} className="w-32 shrink-0 sm:w-40" />
            <div className="min-w-0 space-y-2">
              <div className="text-xs uppercase tracking-wider text-muted">Playlist · {plural(tracks.length, 'track')}</div>
              <h2 className="text-2xl font-bold leading-tight">{open.name}</h2>
              {open.description && <p className="max-w-xl whitespace-pre-wrap text-sm text-muted">{open.description}</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                <button className="btn btn-accent" disabled={!playable.length} onClick={() => play(playable[0], playable, { type: 'playlist', id: open.id })}><Play size={16} fill="currentColor" />Play</button>
                <button className="btn" disabled={!playable.length} onClick={() => { const s = shuffleWithRules(playable, lib.rules); play(s[0], s, { type: 'playlist', id: open.id }); }}><Shuffle size={16} />Shuffle</button>
                <button className="btn btn-ghost" onClick={() => edit({ kind: 'playlist', id: open.id })}><Pencil size={15} />Edit</button>
                <KeepOffline hashes={tracks.flatMap((t) => (t.file ? [t.file] : []))} />
              </div>
            </div>
          </div>
          <div className="relative max-w-md"><input className="input" placeholder="Add a track…" value={adding} onChange={(e) => setAdding(e.target.value)} />
            {matches.length > 0 && <div className="card absolute z-10 mt-1 w-full overflow-hidden shadow-xl">{matches.map((t) => (
              <button key={t.id} className="block w-full px-3 py-2 text-left text-sm hover:bg-raised" onClick={() => { patch('playlists', open.id, { trackIds: [...open.trackIds, t.id] }); setAdding(''); }}>{t.title} <span className="text-muted">· {t.artistName}</span></button>))}</div>}</div>
          <div className="card overflow-hidden"><TrackTable tracks={tracks} source="playlist" sourceId={open.id} numbered extra={(t, i) => (
            <div className="flex">
              <button className="p-1 text-muted hover:text-fg disabled:opacity-30" aria-label={`Move ${t.title} up`} disabled={i === 0} onClick={() => patch('playlists', open.id, { trackIds: moveTrack(tracks.map((x) => x.id), i, i - 1) })}><ArrowUp size={15} /></button>
              <button className="p-1 text-muted hover:text-fg disabled:opacity-30" aria-label={`Move ${t.title} down`} disabled={i === tracks.length - 1} onClick={() => patch('playlists', open.id, { trackIds: moveTrack(tracks.map((x) => x.id), i, i + 1) })}><ArrowDown size={15} /></button>
              <button className="p-1 text-muted hover:text-bad" aria-label={`Remove ${t.title} from the playlist`} onClick={() => patch('playlists', open.id, { trackIds: removeTrack(open.trackIds, t.id) })}><X size={15} /></button>
            </div>)} /></div>
        </section>
      )}
      {!lib.playlists.length && <div className="flex items-center gap-2 text-sm text-muted"><Link2 size={14} />No playlists yet.</div>}
    </div>
  );
}
