import { useState } from 'react';
import { canPlay } from '../lib/spotifyPlayer.ts';
import { statsPath } from '../lib/entityStats.ts';
import { BarChart3, ArrowDown, ArrowUp, Link2, Pencil, Play, Plus, Shuffle, X } from 'lucide-react';
import { shuffleWithRules } from '@curator/core';
import { moveTrack, removeTrack } from '../lib/defaults.ts';
import { useLibrary } from '../lib/derive.ts';
import { useEditor } from '../lib/editor.ts';
import { usePlayer } from '../lib/player.ts';
import { useStore } from '../lib/store.ts';
import { Cover } from '../components/Cover.tsx';
import { PlaylistCover } from '../components/PlaylistCover.tsx';
import { ArtistLinks } from '../components/ArtistLinks.tsx';
import { Link } from 'react-router-dom';
import { isAlbumList, playlistAlbums, playlistCount, playlistTrackIds } from '../lib/playlists.ts';
import { KeepOffline } from '../components/KeepOffline.tsx';
import { plural } from '../lib/cn.ts';
import { PlaylistNote, withoutKey } from '../components/PlaylistNote.tsx';
import { TrackTable } from '../components/TrackTable.tsx';

export function PlaylistsPage() {
  const lib = useLibrary();
  const patch = useStore((s) => s.patch);
  const edit = useEditor((s) => s.open);
  const play = usePlayer((s) => s.play);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState('');
  const open = lib.playlists.find((p) => p.id === openId);
  const albumMode = !!open && isAlbumList(open);
  const albums = open && albumMode ? playlistAlbums(lib, open) : [];
  const tracks = open ? playlistTrackIds(lib, open).map((id) => lib.trackById.get(id)!) : [];
  const playable = tracks.filter(canPlay).map((t) => t.id);
  const needle = adding.toLowerCase();
  const matches = adding.length > 1 && !albumMode ? lib.tracks.filter((t) => `${t.title} ${t.artistName}`.toLowerCase().includes(needle)).slice(0, 6) : [];
  const albumMatches = adding.length > 1 && albumMode ? lib.albums.filter((a) => !(open!.albumIds ?? []).includes(a.id) && `${a.title} ${a.artistName}`.toLowerCase().includes(needle)).slice(0, 6) : [];
  const ids = open?.albumIds ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3"><h1 className="mr-auto text-2xl font-bold">Playlists</h1>
        <button className="btn btn-accent" onClick={() => edit({ kind: 'new-playlist', id: '' })}><Plus size={16} />New playlist</button></div>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(var(--grid-min), 9rem), 1fr))' }}>{lib.playlists.map((p) => { const c = playlistCount(lib, p); return (
        <button key={p.id} onClick={() => setOpenId(p.id)} aria-pressed={openId === p.id} className="bt-tile bt-sel group text-left" data-selected={openId === p.id || undefined}>
          <PlaylistCover playlist={p} className="transition-transform group-hover:scale-[1.02]" />
          <div className="bt-cap-t mt-2 truncate text-sm font-medium">{p.name}</div>
          <div className="bt-cap text-xs text-muted">{isAlbumList(p) ? 'Albums · ' : ''}{plural(c.n, c.noun)}</div>
        </button>); })}</div>
      {open && (
        <section className="space-y-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <PlaylistCover playlist={open} className="w-32 shrink-0 sm:w-40" />
            <div className="min-w-0 space-y-2">
              <div className="text-xs uppercase tracking-wider text-muted">{albumMode ? `Album playlist · ${plural(albums.length, 'album')} · ${plural(tracks.length, 'track')}` : `Playlist · ${plural(tracks.length, 'track')}`}</div>
              <h2 className="text-2xl font-bold leading-tight">{open.name}</h2>
              {open.description && <p className="max-w-xl whitespace-pre-wrap text-sm text-muted">{open.description}</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                <button className="btn btn-accent" disabled={!playable.length} onClick={() => play(playable[0], playable, { type: 'playlist', id: open.id })}><Play size={16} fill="currentColor" />Play</button>
                <button className="btn" disabled={!playable.length} onClick={() => { const s = shuffleWithRules(playable, lib.rules); play(s[0], s, { type: 'playlist', id: open.id }); }}><Shuffle size={16} />Shuffle</button>
                <Link className="btn btn-ghost" to={statsPath('playlist', open.id)}><BarChart3 size={15} />Stats</Link>
                <button className="btn btn-ghost" onClick={() => edit({ kind: 'playlist', id: open.id })}><Pencil size={15} />Edit</button>
                <KeepOffline hashes={tracks.flatMap((t) => (t.file ? [t.file] : []))} />
              </div>
            </div>
          </div>
          <div className="relative max-w-md"><input className="input" placeholder={albumMode ? 'Add an album…' : 'Add a track…'} value={adding} onChange={(e) => setAdding(e.target.value)} />
            {matches.length > 0 && <div className="card absolute z-10 mt-1 w-full overflow-hidden shadow-xl">{matches.map((t) => (
              <button key={t.id} className="block w-full px-3 py-2 text-left text-sm hover:bg-raised" onClick={() => { patch('playlists', open.id, { trackIds: [...open.trackIds, t.id] }); setAdding(''); }}>{t.title} <span className="text-muted">· {t.artistName}</span></button>))}</div>}
            {albumMatches.length > 0 && <div className="card absolute z-10 mt-1 w-full overflow-hidden shadow-xl">{albumMatches.map((a) => (
              <button key={a.id} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-raised" onClick={() => { patch('playlists', open.id, { albumIds: [...ids, a.id] }); setAdding(''); }}><Cover hash={a.cover} seed={a.title} className="h-8 w-8 shrink-0" /><span className="min-w-0 truncate">{a.title} <span className="text-muted">· {a.artistName}</span></span></button>))}</div>}</div>
          {albumMode
            ? <div className="card divide-y divide-line/50 overflow-hidden">
                {albums.map((a, i) => (
                  <div key={a.id} className="flex items-center gap-3 px-3 py-2">
                    <Link to={a.to} className="flex min-w-0 flex-1 items-center gap-3"><Cover hash={a.cover} seed={a.title} className="h-12 w-12 shrink-0" />
                      <span className="min-w-0"><span className="block truncate text-sm font-medium">{a.title}</span><span className="block truncate text-xs text-muted"><ArtistLinks leads={a.leads} /> · {plural(a.trackIds.length, 'track')}</span></span></Link>
                    <button className="p-1 text-muted hover:text-fg disabled:opacity-30" aria-label={`Move ${a.title} up`} disabled={i === 0} onClick={() => patch('playlists', open.id, { albumIds: moveTrack(albums.map((x) => x.id), i, i - 1) })}><ArrowUp size={15} /></button>
                    <button className="p-1 text-muted hover:text-fg disabled:opacity-30" aria-label={`Move ${a.title} down`} disabled={i === albums.length - 1} onClick={() => patch('playlists', open.id, { albumIds: moveTrack(albums.map((x) => x.id), i, i + 1) })}><ArrowDown size={15} /></button>
                    <button className="p-1 text-muted hover:text-bad" aria-label={`Remove ${a.title} from the playlist`} onClick={() => patch('playlists', open.id, { albumIds: removeTrack(ids, a.id) })}><X size={15} /></button>
                  </div>))}
                {!albums.length && <div className="px-3 py-4 text-sm text-muted">No albums yet. Search above, or use “Add to an album playlist…” in an album’s menu.</div>}
              </div>
            : <div className="card overflow-hidden"><TrackTable tracks={tracks} source="playlist" sourceId={open.id} numbered below={(t) => <PlaylistNote playlistId={open.id} trackId={t.id} notes={open.trackNotes} />} extra={(t, i) => (
            <div className="flex">
              <button className="p-1 text-muted hover:text-fg disabled:opacity-30" aria-label={`Move ${t.title} up`} disabled={i === 0} onClick={() => patch('playlists', open.id, { trackIds: moveTrack(tracks.map((x) => x.id), i, i - 1) })}><ArrowUp size={15} /></button>
              <button className="p-1 text-muted hover:text-fg disabled:opacity-30" aria-label={`Move ${t.title} down`} disabled={i === tracks.length - 1} onClick={() => patch('playlists', open.id, { trackIds: moveTrack(tracks.map((x) => x.id), i, i + 1) })}><ArrowDown size={15} /></button>
              <button className="p-1 text-muted hover:text-bad" aria-label={`Remove ${t.title} from the playlist`} onClick={() => patch('playlists', open.id, { trackIds: removeTrack(open.trackIds, t.id), trackNotes: withoutKey(open.trackNotes, t.id) })}><X size={15} /></button>
            </div>)} /></div>}
        </section>
      )}
      {!lib.playlists.length && <div className="flex items-center gap-2 text-sm text-muted"><Link2 size={14} />No playlists yet.</div>}
    </div>
  );
}
