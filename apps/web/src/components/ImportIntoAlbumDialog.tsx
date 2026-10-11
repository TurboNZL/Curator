import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { newTrackData, inheritFromAlbum } from '../lib/defaults.ts';
import { fetchCoverFromLinks } from '../lib/cover.ts';
import { insertNewTracks, matchEntries, type MergeRow } from '../lib/albumMerge.ts';
import type { ImportPreview } from '../lib/api.ts';
import { useLibrary } from '../lib/derive.ts';
import { logJournal } from '../lib/journal.ts';
import { api, useStore } from '../lib/store.ts';
import { Field, Modal } from './forms.tsx';

/**
 * Import a YouTube album into an album you already have: a deluxe edition that adds a few songs (and maybe reorders them), or the real
 * tracklist of an album a Spotify import only started. Songs the album already has are recognised and NOT added again; new songs are
 * added to the album; the link becomes a release with its own order, so the original tracklist is untouched.
 */
export function ImportIntoAlbumDialog({ albumId, initialUrl, onClose }: { albumId: string; initialUrl?: string; onClose: () => void }) {
  const lib = useLibrary();
  const { put, patch, syncNow } = useStore();
  const album = lib.albumById.get(albumId);
  const rawAlbum = useStore((s) => s.rows.albums.get(albumId)?.data) as { needsSource?: boolean; covers?: string[] } | undefined;
  const [url, setUrl] = useState(initialUrl ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pv, setPv] = useState<ImportPreview | null>(null);
  const [rows, setRows] = useState<MergeRow[]>([]);
  const [releaseTitle, setReleaseTitle] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);
  const [useCover, setUseCover] = useState(true);
  const [rename, setRename] = useState(false);
  const [download, setDownload] = useState(true);
  const [done, setDone] = useState<string | null>(null);
  const have = (album?.trackIds ?? []).map((id) => lib.trackById.get(id)).filter((t): t is NonNullable<typeof t> => !!t);

  async function lookUp(u = url) {
    setBusy('Looking it up…'); setError(null);
    try {
      const p = await api().importPreview(u.trim());
      setPv(p); setReleaseTitle(p.title);
      setRows(matchEntries(have.map((t) => ({ id: t.id, title: t.title, youtubeMusicUrl: t.youtubeMusicUrl })), p.entries.map((e) => ({ id: e.id, title: e.title, url: e.url, duration: e.duration }))));
      setRename(!!rawAlbum?.needsSource && p.title.toLowerCase() !== album?.title.toLowerCase());
      setMakeDefault(!!rawAlbum?.needsSource);
    } catch (e) { setError((e as Error).message === 'Failed to fetch' ? 'Cannot reach the server.' : (e as Error).message); }
    finally { setBusy(null); }
  }
  useEffect(() => { if (initialUrl) void lookUp(initialUrl); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!album) return <Modal title="Import into album" onClose={onClose}><p className="text-sm text-muted">That album no longer exists.</p></Modal>;

  async function run() {
    if (!pv || !album) return;
    setBusy('Importing…'); setError(null);
    try {
      const included = rows.filter((r) => r.include && (r.trackId || r.title.trim()));
      const newIds = new Map<number, string>();
      included.forEach((r, i) => { if (!r.trackId) newIds.set(i, put('tracks', newTrackData({ title: r.title.trim(), credits: album.credits, ...inheritFromAlbum(album, album.credits), youtubeMusicUrl: r.entry.url, albums: [{ albumId: album.id, order: album.trackIds.length + newIds.size }] }))); });
      // the existing songs the link has: give them the link when they have none
      const needDownload: string[] = [...newIds.values()];
      for (const r of included) {
        if (!r.trackId) continue;
        const t = lib.trackById.get(r.trackId);
        if (t && !t.youtubeMusicUrl) patch('tracks', t.id, { youtubeMusicUrl: r.entry.url });
        if (t && !t.file) needDownload.push(t.id);
      }
      const order = included.map((r, i) => r.trackId ?? newIds.get(i)!);
      let cover: string | null = null, coverNote = '';
      if (useCover) {
        const links = pv.thumbnails?.length ? pv.thumbnails : pv.thumbnail ? [pv.thumbnail] : [];
        if (links.length) { try { cover = await fetchCoverFromLinks(links); } catch (e) { coverNote = (e as Error).message; } }
      }
      const releaseId = put('releases', { albumId: album.id, title: releaseTitle.trim() || pv.title, cover, releaseDate: null, trackIds: order });
      const albumPatch: Record<string, unknown> = {
        trackOrder: insertNewTracks(album.trackIds, included.map((r, i) => ({ trackId: r.trackId, newId: newIds.get(i), include: true }))),
        ...(cover ? { covers: [...(rawAlbum?.covers ?? []), cover] } : {}),
        ...(makeDefault ? { defaultReleaseId: releaseId } : {}),
        ...(rawAlbum?.needsSource ? { needsSource: false } : {}),
        ...(rename && pv.title.trim() ? { title: pv.title.trim() } : {}),
      };
      patch('albums', album.id, albumPatch);
      logJournal('add', `Imported a release into ${album.title}`, `${releaseTitle || pv.title}: ${newIds.size} new tracks, ${included.length - newIds.size} already in the album`, album.id);
      if (download && needDownload.length) { await syncNow(); await api().acquire(needDownload).catch(() => undefined); }
      if (coverNote) { setDone(`Imported, but the cover could not be fetched: ${coverNote}`); setBusy(null); return; }
      onClose();
    } catch (e) { setError((e as Error).message); setBusy(null); }
  }

  const included = rows.filter((r) => r.include);
  const fresh = included.filter((r) => !r.trackId).length;
  const taken = new Set(rows.filter((r) => r.trackId).map((r) => r.trackId));
  const footer = done ? <button className="btn btn-accent ml-auto" onClick={onClose}>Close</button>
    : pv ? <div className="ml-auto flex gap-2"><button className="btn btn-ghost" onClick={() => setPv(null)} disabled={!!busy}>Back</button>
      <button className="btn btn-accent" disabled={!!busy || !included.length} onClick={() => void run()}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}Import {included.length} tracks ({fresh} new)</button></div>
    : <div className="ml-auto flex gap-2"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-accent" disabled={!url.trim() || !!busy} onClick={() => void lookUp()}>{busy ? <Loader2 size={15} className="animate-spin" /> : null}Look up</button></div>;

  return (
    <Modal title={`Import a release into “${album.title}”`} onClose={onClose} wide footer={footer}>
      {done ? <div role="alert" className="rounded-theme bg-warn/15 p-3 text-sm text-warn">{done}</div> : !pv ? (
        <Field label="YouTube Music album or playlist link" hint="Songs the album already has are recognised and not added again. The link becomes a release with its own track order.">
          <input autoFocus className="input" placeholder="https://music.youtube.com/playlist?list=…" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && url.trim() && !busy && void lookUp()} /></Field>
      ) : (<>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Release name"><input className="input" value={releaseTitle} onChange={(e) => setReleaseTitle(e.target.value)} /></Field>
          <div className="space-y-1.5 pt-5 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} />Make this the album's default release</label>
            {pv.thumbnail && <label className="flex items-center gap-2"><input type="checkbox" checked={useCover} onChange={(e) => setUseCover(e.target.checked)} />Add its cover to the album</label>}
            {rawAlbum?.needsSource && <label className="flex items-center gap-2"><input type="checkbox" checked={rename} onChange={(e) => setRename(e.target.checked)} />Rename the album to “{pv.title}”</label>}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-sm text-muted">{included.length} of {rows.length} in this release · <b className="text-fg">{fresh} new</b> to the album · {included.length - fresh} already in it. Untick a song to leave it out completely.</div>
          {rows.map((r, i) => {
            const set = (patchRow: Partial<MergeRow>) => setRows(rows.map((x, j) => (j === i ? { ...x, ...patchRow } : x)));
            const t = r.trackId ? lib.trackById.get(r.trackId) : null;
            return (
              <div key={r.entry.id + i} className="flex flex-wrap items-center gap-2 rounded-theme px-1 py-0.5 hover:bg-raised/50">
                <input type="checkbox" aria-label={`Include track ${i + 1}`} checked={r.include} onChange={(e) => set({ include: e.target.checked })} />
                <span className="w-6 text-right text-xs text-muted">{i + 1}</span>
                <div className="min-w-0 flex-1 basis-48">{t ? <div className="truncate text-sm">{r.entry.title}{t.title !== r.entry.title && <span className="text-muted"> = {t.title}</span>}</div>
                  : <input className="input !py-1" value={r.title} onChange={(e) => set({ title: e.target.value })} aria-label="New track title" />}</div>
                <select className="input !w-auto !py-1 text-xs" value={r.trackId ?? ''} aria-label="Which track of the album this is" onChange={(e) => set({ trackId: e.target.value || null })}>
                  <option value="">New track</option>
                  {have.filter((h) => h.id === r.trackId || !taken.has(h.id)).map((h) => <option key={h.id} value={h.id}>In album: {h.title}</option>)}
                </select>
              </div>);
          })}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={download} onChange={(e) => setDownload(e.target.checked)} />Download the audio of new tracks (and album tracks that have none) now</label>
      </>)}
      {busy && <div className="text-sm text-muted">{busy}</div>}
      {error && <div className="rounded-theme bg-bad/15 p-3 text-sm text-bad">{error}</div>}
    </Modal>
  );
}
