import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Loader2 } from 'lucide-react';
import type { ArtistData } from '@curator/core';
import { newAlbumData, newTrackData } from '../lib/defaults.ts';
import type { ImportPreview } from '../lib/api.ts';
import { useLibrary } from '../lib/derive.ts';
import { logJournal } from '../lib/journal.ts';
import { api, useStore } from '../lib/store.ts';
import { ArtistSelect, Field, Modal, TagInput } from './forms.tsx';

interface Row { id: string; title: string; url: string; on: boolean }

/** Import an album from a YouTube / YouTube Music link: look up, review and edit, then create it and queue the audio. */
export function ImportDialog({ onClose }: { onClose: () => void }) {
  const lib = useLibrary();
  const { put, syncNow } = useStore();
  const configured = useStore((s) => !!s.settings.token);
  const nav = useNavigate();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pv, setPv] = useState<ImportPreview | null>(null);
  const [title, setTitle] = useState('');
  const [artistId, setArtistId] = useState('');
  const [newArtist, setNewArtist] = useState<string | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [useCover, setUseCover] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [download, setDownload] = useState(true);

  async function lookUp() {
    setBusy('Looking it up…'); setError(null);
    try {
      const p = await api().importPreview(url.trim());
      setPv(p); setTitle(p.title); setRows(p.entries.map((e) => ({ id: e.id, title: e.title, url: e.url, on: true })));
      const hit = lib.artists.find((a) => a.name.toLowerCase() === p.artist.toLowerCase());
      setArtistId(hit?.id ?? ''); setNewArtist(hit ? null : p.artist);
    } catch (e) { setError((e as Error).message === 'Failed to fetch' ? 'Cannot reach the server.' : (e as Error).message); }
    finally { setBusy(null); }
  }

  async function doImport() {
    if (!pv) return;
    setBusy('Importing…'); setError(null);
    try {
      const picked = rows.filter((r) => r.on && r.title.trim());
      let aid = artistId;
      if (!aid) aid = put('artists', { name: (newArtist ?? pv.artist).trim(), image: null } satisfies ArtistData);
      let cover: string | null = null;
      if (useCover && pv.thumbnail) { try { cover = (await api().importCover(pv.thumbnail)).hash; } catch { /* a missing cover is not worth failing the import */ } }
      const known = new Set(lib.genres.map((g) => g.name.toLowerCase()));
      for (const g of genres) if (!known.has(g.toLowerCase())) put('genres', { name: g });
      const albumId = put('albums', newAlbumData({ title: title.trim(), artistId: aid, genres, cover }));
      const ids = picked.map((r, i) => put('tracks', newTrackData({ title: r.title.trim(), artistId: aid, youtubeMusicUrl: r.url, albums: [{ albumId, order: i }] })));
      useStore.getState().patch('albums', albumId, { trackOrder: ids });
      logJournal('add', `Imported album: ${title.trim()}`, `${ids.length} tracks from YouTube`, albumId);
      if (download) { await syncNow(); await api().acquire(ids).catch(() => undefined); }
      onClose(); nav(`/albums/${albumId}`);
    } catch (e) { setError((e as Error).message); setBusy(null); }
  }

  const count = rows.filter((r) => r.on).length;
  const footer = pv
    ? <div className="ml-auto flex gap-2"><button className="btn btn-ghost" onClick={() => setPv(null)} disabled={!!busy}>Back</button>
        <button className="btn btn-accent" disabled={!!busy || !count || !title.trim() || (!artistId && !(newArtist ?? '').trim())} onClick={doImport}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}Import {count} tracks</button></div>
    : <div className="ml-auto flex gap-2"><button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-accent" disabled={!url.trim() || !!busy || !configured} onClick={lookUp}>{busy ? <Loader2 size={15} className="animate-spin" /> : null}Look up</button></div>;

  return (
    <Modal title="Import an album from YouTube" onClose={onClose} footer={footer}>
      {!configured && <div className="rounded-theme bg-warn/15 p-3 text-sm text-warn">Importing runs on your server. Connect one in Settings first.</div>}
      {!pv ? (
        <Field label="Album or playlist link" hint="A YouTube Music album, a playlist, or a single video. Nothing is downloaded until you confirm.">
          <input autoFocus className="input" placeholder="https://music.youtube.com/playlist?list=…" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && url.trim() && !busy && void lookUp()} /></Field>
      ) : (<>
        <div className="flex gap-4">
          {pv.thumbnail && <img src={pv.thumbnail} alt="" className={`h-24 w-24 shrink-0 rounded-theme object-cover ${useCover ? '' : 'opacity-30'}`} />}
          <div className="min-w-0 flex-1 space-y-2"><Field label="Album title"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            {pv.thumbnail && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={useCover} onChange={(e) => setUseCover(e.target.checked)} />Use this as the cover</label>}</div>
        </div>
        <Field label="Artist" hint={!artistId ? `No match in your library; “${newArtist}” will be created.` : undefined}>
          {artistId || newArtist === null ? <ArtistSelect value={artistId} onChange={(id) => { setArtistId(id); setNewArtist(null); }} />
            : <div className="flex gap-2"><input className="input" value={newArtist ?? ''} onChange={(e) => setNewArtist(e.target.value)} />
              <button className="btn shrink-0" onClick={() => { setArtistId(lib.artists[0]?.id ?? ''); setNewArtist(null); }} disabled={!lib.artists.length}>Pick existing</button></div>}
        </Field>
        <Field label="Genres"><TagInput value={genres} onChange={setGenres} suggestions={lib.genres.map((g) => g.name)} /></Field>
        <div className="space-y-1"><div className="text-sm text-muted">Tracks ({count} of {rows.length})</div>
          {rows.map((r, i) => (
            <div key={r.id} className="flex items-center gap-2"><input type="checkbox" aria-label={`Include track ${i + 1}`} checked={r.on} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))} />
              <span className="w-6 text-right text-xs text-muted">{i + 1}</span>
              <input className="input !py-1" value={r.title} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} /></div>))}</div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={download} onChange={(e) => setDownload(e.target.checked)} />Download the audio now (needs yt-dlp and ffmpeg on the server)</label>
      </>)}
      {busy && <div className="text-sm text-muted">{busy}</div>}
      {error && <div className="rounded-theme bg-bad/15 p-3 text-sm text-bad">{error}</div>}
    </Modal>
  );
}
