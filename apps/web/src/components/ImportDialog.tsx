import { cleanAlbumTitle, cleanArtistName, genresFor, matchArtist } from '../lib/autofill.ts';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, ImagePlus, Loader2 } from 'lucide-react';
import type { ArtistData } from '@curator/core';
import { leadCredit, newAlbumData, newTrackData } from '../lib/defaults.ts';
import { fetchCoverFromLinks } from '../lib/cover.ts';
import type { ImportPreview } from '../lib/api.ts';
import { useLibrary } from '../lib/derive.ts';
import { logJournal } from '../lib/journal.ts';
import { api, useStore } from '../lib/store.ts';
import { saveImage } from '../lib/files.ts';
import { Cover } from './Cover.tsx';
import { ArtistSelect, Field, Modal, TagInput } from './forms.tsx';

interface Row { id: string; title: string; url: string; on: boolean }

/** Import an album from a YouTube / YouTube Music link: look up, review and edit, then create it and queue the audio. */
export function ImportDialog({ onClose, singleFirst = false }: { onClose: () => void; /** opened from the Singles page: start in "as a single" */ singleFirst?: boolean }) {
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
  /** a picture chosen from this device; it replaces whatever the link offers */
  const [ownCover, setOwnCover] = useState<string | null>(null);
  const [thumbBroken, setThumbBroken] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [download, setDownload] = useState(true);
  /** import each chosen track as a single (no album) with its own cover and release date, instead of making an album */
  const [asSingle, setAsSingle] = useState(singleFirst);
  /** set after an import whose cover could not be fetched, so the user hears about it before the dialog closes */
  const [done, setDone] = useState<{ to: string; what: string; coverError: string } | null>(null);

  async function lookUp() {
    setBusy('Looking it up…'); setError(null);
    try {
      const p = await api().importPreview(url.trim());
      setPv(p); setTitle(cleanAlbumTitle(p.title)); setAsSingle(p.entries.length === 1); setRows(p.entries.map((e) => ({ id: e.id, title: e.title, url: e.url, on: true })));
      const hit = matchArtist(lib.artists, p.artist);
      setArtistId(hit?.id ?? ''); setNewArtist(hit ? null : cleanArtistName(p.artist));
      setGenres(hit ? genresFor(lib, hit.id) : []); // a known artist: start from the genres of their other albums
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
      let cover: string | null = ownCover, coverError = '';
      if (!ownCover && useCover) {
        const links = pv.thumbnails?.length ? pv.thumbnails : pv.thumbnail ? [pv.thumbnail] : [];
        if (!links.length) coverError = 'YouTube gave no cover image for this link.';
        else { try { cover = await fetchCoverFromLinks(links); } catch (e) { coverError = (e as Error).message; } }
      }
      const known = new Set(lib.genres.map((g) => g.name.toLowerCase()));
      for (const g of genres) if (!known.has(g.toLowerCase())) put('genres', { name: g });
      const credits = leadCredit(aid);
      let ids: string[], to: string, what: string;
      if (asSingle) {
        // a single: no album, its own cover and release date, its own genres
        ids = picked.map((r) => put('tracks', newTrackData({ title: r.title.trim(), credits, genres, cover, releaseDate: pv.releaseDate ?? null, youtubeMusicUrl: r.url, syncWithAlbumCredits: false })));
        to = '/singles'; what = ids.length === 1 ? 'The single' : 'The singles';
        logJournal('add', `Imported ${ids.length === 1 ? 'single' : 'singles'}: ${picked.map((r) => r.title.trim()).join(', ')}`, 'from YouTube', ids[0]);
      } else {
        const albumId = put('albums', newAlbumData({ title: title.trim(), credits, genres, cover: null, covers: cover ? [cover] : [], coverPicked: false }));
        ids = picked.map((r, i) => put('tracks', newTrackData({ title: r.title.trim(), credits, youtubeMusicUrl: r.url, albums: [{ albumId, order: i }] })));
        // the imported edition is the album's default release: it carries the cover and the tracklist
        const releaseId = put('releases', { albumId, title: '', cover, releaseDate: pv.releaseDate ?? null, trackIds: ids });
        useStore.getState().patch('albums', albumId, { trackOrder: ids, defaultReleaseId: releaseId });
        logJournal('add', `Imported album: ${title.trim()}`, `${ids.length} tracks from YouTube`, albumId);
        to = `/albums/${albumId}`; what = 'The album';
      }
      if (download) { await syncNow(); await api().acquire(ids).catch(() => undefined); }
      if (coverError) { setDone({ to, what, coverError }); setBusy(null); return; }
      onClose(); nav(to);
    } catch (e) { setError((e as Error).message); setBusy(null); }
  }

  const count = rows.filter((r) => r.on).length;
  const footer = done
    ? <div className="ml-auto flex gap-2"><button className="btn btn-accent" onClick={() => { onClose(); nav(done.to); }}>{done.to === '/singles' ? 'Open singles' : 'Open the album'}</button></div>
    : pv
    ? <div className="ml-auto flex gap-2"><button className="btn btn-ghost" onClick={() => setPv(null)} disabled={!!busy}>Back</button>
        <button className="btn btn-accent" disabled={!!busy || !count || (!asSingle && !title.trim()) || (!artistId && !(newArtist ?? '').trim())} onClick={doImport}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}{asSingle ? (count === 1 ? 'Import the single' : `Import ${count} singles`) : `Import ${count} tracks`}</button></div>
    : <div className="ml-auto flex gap-2"><button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-accent" disabled={!url.trim() || !!busy || !configured} onClick={lookUp}>{busy ? <Loader2 size={15} className="animate-spin" /> : null}Look up</button></div>;

  return (
    <Modal title="Import from YouTube" onClose={onClose} footer={footer}>
      {!configured && <div className="rounded-theme bg-warn/15 p-3 text-sm text-warn">Importing runs on your server. Connect one in Settings first.</div>}
      {done ? null : !pv ? (
        <Field label="Album, playlist or single link" hint="A YouTube Music album or playlist, or one video for a single. Nothing is downloaded until you confirm.">
          <input autoFocus className="input" placeholder="https://music.youtube.com/playlist?list=…" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && url.trim() && !busy && void lookUp()} /></Field>
      ) : (<>
        <div className="flex gap-4">
          {ownCover ? <Cover hash={ownCover} seed={title} className="h-24 w-24 shrink-0" />
            : pv.thumbnail && !done && !thumbBroken ? <img src={pv.thumbnails?.[0] ?? pv.thumbnail} alt="" onError={() => setThumbBroken(true)} className={`h-24 w-24 shrink-0 rounded-theme object-cover ${useCover ? '' : 'opacity-30'}`} />
            : <Cover hash={null} seed={title} className="h-24 w-24 shrink-0" />}
          <div className="min-w-0 flex-1 space-y-2">
            <div role="radiogroup" aria-label="Import as" className="flex gap-1.5">
              {([['Album', false], ['Single', true]] as const).map(([label, v]) => (
                <button key={label} type="button" role="radio" aria-checked={asSingle === v} onClick={() => setAsSingle(v)}
                  className={`rounded-full border px-3 py-0.5 text-sm font-medium ${asSingle === v ? 'border-accent/60 bg-accent/15 text-accent' : 'border-line text-muted hover:text-fg'}`}>{label === 'Album' ? 'As an album' : 'As a single'}</button>))}
            </div>
            {!asSingle && <Field label="Album title"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>}
            {asSingle && <p className="text-xs text-muted">Each chosen track becomes a single of its own with this cover{pv.releaseDate ? ` and the release date ${pv.releaseDate}` : ''}.</p>}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {!ownCover && pv.thumbnail && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={useCover} onChange={(e) => setUseCover(e.target.checked)} />Use the cover from the link</label>}
              <button type="button" className="btn !py-1 text-sm" onClick={() => picker.current?.click()}><ImagePlus size={14} />{ownCover ? 'Choose another' : 'Upload a cover'}</button>
              {ownCover && <button type="button" className="btn btn-ghost !py-1 text-sm" onClick={() => setOwnCover(null)}>Use the link’s cover</button>}
              <input ref={picker} type="file" accept="image/*" hidden onChange={async (e) => {
                const f = e.target.files?.[0]; e.target.value = '';
                if (!f) return;
                try { setOwnCover(await saveImage(f)); setError(null); } catch { setError('Could not read that image.'); }
              }} />
            </div></div>
        </div>
        <Field label="Lead artist (becomes the first credit)" hint={!artistId ? `No match in your library; “${newArtist}” will be created.` : asSingle ? 'Added as a “Lead artist” credit on the single.' : 'Added as a “Lead artist” credit on the album and every track.'}>
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
      {done && <div role="alert" className="rounded-theme bg-warn/15 p-3 text-sm text-warn">{done.what} was imported, but its cover could not be fetched: {done.coverError} Add one from its Edit button, or use Library health → “Try YouTube thumbnails”.</div>}
      {busy && <div className="text-sm text-muted">{busy}</div>}
      {error && <div className="rounded-theme bg-bad/15 p-3 text-sm text-bad">{error}</div>}
    </Modal>
  );
}
