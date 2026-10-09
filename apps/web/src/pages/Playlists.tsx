import { useState } from 'react';
import { ArrowDown, ArrowUp, Link2, Plus, Trash2, X } from 'lucide-react';
import { moveTrack, removeTrack } from '../lib/defaults.ts';
import type { PlaylistData } from '@curator/core';
import { useLibrary } from '../lib/derive.ts';
import { useStore } from '../lib/store.ts';
import { KeepOffline } from '../components/KeepOffline.tsx';
import { TrackTable } from '../components/TrackTable.tsx';

export function PlaylistsPage() {
  const lib = useLibrary();
  const { put, patch, remove } = useStore();
  const [name, setName] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState('');
  const open = lib.playlists.find((p) => p.id === openId);
  const tracks = open ? open.trackIds.map((id) => lib.trackById.get(id)).filter((t) => !!t) : [];
  const matches = adding.length > 1 ? lib.tracks.filter((t) => `${t.title} ${t.artistName}`.toLowerCase().includes(adding.toLowerCase())).slice(0, 6) : [];

  const create = () => {
    if (!name.trim()) return;
    const data: PlaylistData = { name: name.trim(), description: null, cover: null, createdAt: Date.now(), trackIds: [] };
    setOpenId(put('playlists', data)); setName('');
  };
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Playlists</h1>
      <div className="flex gap-2"><input className="input max-w-xs" placeholder="New playlist name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} /><button className="btn btn-accent" onClick={create}><Plus size={16} />Create</button></div>
      <div className="flex flex-wrap gap-2">{lib.playlists.map((p) => (
        <button key={p.id} onClick={() => setOpenId(p.id)} className={`btn ${openId === p.id ? 'btn-accent' : ''}`}>{p.name} <span className="opacity-60">{p.trackIds.length}</span></button>))}</div>
      {open && (
        <section className="space-y-3">
          <div className="flex items-center gap-3"><input key={open.id} aria-label="Playlist name" className="min-w-0 flex-1 bg-transparent text-xl font-semibold outline-none focus:underline" defaultValue={open.name} onBlur={(e) => e.target.value.trim() && e.target.value !== open.name && patch('playlists', open.id, { name: e.target.value.trim() })} /><KeepOffline hashes={tracks.flatMap((t) => (t.file ? [t.file] : []))} />
            <button className="btn btn-ghost ml-auto text-bad" onClick={() => { remove('playlists', open.id); setOpenId(null); }}><Trash2 size={15} />Delete</button></div>
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
