import { useRef, useState } from 'react';
import { ExternalLink, Loader2, Search } from 'lucide-react';
import type { MatchCandidate } from '../lib/api.ts';
import { useLibrary } from '../lib/derive.ts';
import { useEditor } from '../lib/editor.ts';
import { api, useStore } from '../lib/store.ts';
import { Modal } from './forms.tsx';

interface Row { albumId: string; candidates: MatchCandidate[]; pick: number; error?: string }
const BATCH = 6;

/**
 * Find the YouTube Music album of albums that have none, then import it one release at a time: the server searches YouTube's playlists for
 * “artist album”, the best result is proposed, and “Import…” opens the usual import-into-album screen with that link already looked up,
 * where the whole tracklist is shown before anything is saved.
 */
export function MatchLinksDialog({ albumId = '', onClose }: { albumId?: string; onClose: () => void }) {
  const lib = useLibrary();
  const edit = useEditor((s) => s.open);
  const configured = useStore((s) => !!s.settings.token);
  const [rows, setRows] = useState<Row[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stop = useRef(false);

  // an album needs a link when it waits for one (Spotify import) or none of its tracks has a YouTube link yet
  const todo = lib.albums.filter((a) => (albumId ? a.id === albumId : (a as { needsSource?: boolean }).needsSource || (a.trackIds.length > 0 && a.trackIds.every((id) => !lib.trackById.get(id)?.youtubeMusicUrl))));
  const forAlbum = albumId ? lib.albumById.get(albumId) : undefined;

  async function run() {
    stop.current = false; setError(null); setRows([]);
    setProgress({ done: 0, total: todo.length });
    try {
      for (let i = 0; i < todo.length && !stop.current; i += BATCH) {
        const { results } = await api().matchAlbums(todo.slice(i, i + BATCH).map((a) => ({ id: a.id, title: a.title, artist: a.leads[0]?.name ?? a.artistName, trackCount: a.trackIds.length })));
        setRows((r) => [...r, ...results.map((x) => ({ albumId: x.id, candidates: x.candidates, pick: 0, error: x.error }))]);
        setProgress({ done: Math.min(todo.length, i + BATCH), total: todo.length });
      }
    } catch (e) { setError((e as Error).message === 'Failed to fetch' ? 'Cannot reach the server.' : (e as Error).message); }
  }
  const running = !!progress && progress.done < progress.total && !error && !stop.current;
  const badge = (s: number) => (s >= 0.8 ? 'text-good' : s >= 0.55 ? 'text-warn' : 'text-bad');

  return (
    <Modal title={forAlbum ? `Find the YouTube Music album: ${forAlbum.title}` : 'Find YouTube Music albums'} onClose={onClose} wide footer={<button className="btn ml-auto" onClick={onClose}>Close</button>}>
      {!configured && <div className="rounded-theme bg-warn/15 p-3 text-sm text-warn">This runs on your server (it needs yt-dlp to search). Connect one in Settings first.</div>}
      <p className="text-sm text-muted">{todo.length} album{todo.length === 1 ? '' : 's'} {forAlbum ? 'to look up' : 'have no YouTube Music link yet'}. The server searches YouTube's playlists for “artist album” and proposes the best match. Press <b>Import…</b> to open it as a release of that album: you see its tracklist and what will be added before anything is saved. Check the track count: a wrong pick is easy to spot there.</p>
      <div className="flex items-center gap-2"><button className="btn btn-accent" disabled={!configured || !todo.length || running} onClick={() => void run()}>{running ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}Find {todo.length === 1 ? 'the album' : `${todo.length} albums`}</button>
        {running && <button className="btn" onClick={() => { stop.current = true; setProgress((p) => (p ? { ...p, total: p.done } : p)); }}>Stop</button>}
        {progress && <span className="text-xs text-muted">{progress.done}/{progress.total}</span>}</div>
      {error && <div className="rounded-theme bg-bad/15 p-3 text-sm text-bad">{error}</div>}
      {rows.length > 0 && <div className="max-h-96 space-y-0.5 overflow-y-auto rounded-theme border border-line p-1">
        {rows.map((r, i) => {
          const a = lib.albumById.get(r.albumId); const c = r.candidates[r.pick];
          if (!a) return null;
          return (
            <div key={r.albumId} className="flex flex-wrap items-center gap-2 rounded-theme px-2 py-1.5 text-sm hover:bg-raised/50">
              <div className="min-w-0 flex-1 basis-48"><div className="truncate font-medium">{a.title}<span className="font-normal text-muted"> · {a.artistName} · {a.trackIds.length} track{a.trackIds.length === 1 ? '' : 's'}</span></div>
                {c ? <div className="truncate text-xs text-muted">{c.title}{c.channel ? ` · ${c.channel}` : ''}{c.count ? ` · ${c.count} tracks` : ''} <span className={badge(c.score)}>{Math.round(c.score * 100)}%</span></div> : <div className="text-xs text-warn">{r.error ?? 'No album found. Paste its link by hand in Health › Albums waiting for a YouTube album link.'}</div>}</div>
              {r.candidates.length > 1 && <select className="input !w-auto max-w-[14rem] !py-1 text-xs" value={r.pick} aria-label="Other results" onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, pick: Number(e.target.value) } : x)))}>{r.candidates.map((x, k) => <option key={k} value={k}>{x.title.slice(0, 40)} ({Math.round(x.score * 100)}%)</option>)}</select>}
              {c && <a className="p-1 text-muted hover:text-fg" href={c.url} target="_blank" rel="noreferrer" aria-label="Open on YouTube Music"><ExternalLink size={14} /></a>}
              {c && <button className="btn btn-accent !py-1 text-xs" onClick={() => edit({ kind: 'import-into-album', id: a.id, url: c.url })}>Import…</button>}
            </div>);
        })}
      </div>}
    </Modal>
  );
}
