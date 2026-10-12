import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2, Search, SkipForward } from 'lucide-react';
import { Cover } from './Cover.tsx';
import type { MatchCandidate } from '../lib/api.ts';
import { useLibrary } from '../lib/derive.ts';
import { useEditor } from '../lib/editor.ts';
import { api, useStore } from '../lib/store.ts';
import { Modal } from './forms.tsx';

interface Found { candidates: MatchCandidate[]; error?: string }

/**
 * Find the YouTube Music album of an album that has none, ONE ALBUM AT A TIME. The server runs YouTube Music's album search for
 * “artist album”, opens the best results to read their real title, artist and track count, and the best match is proposed here.
 * “Import…” opens the usual import-into-album screen with that link already looked up, where the whole tracklist is shown before
 * anything is saved; “Skip” moves to the next album.
 */
export function MatchLinksDialog({ albumId = '', onClose }: { albumId?: string; onClose: () => void }) {
  const lib = useLibrary();
  const edit = useEditor((s) => s.open);
  const configured = useStore((s) => !!s.settings.token);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [found, setFound] = useState<Found | null>(null);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState(0);
  const asked = useRef('');

  // an album needs a link when it waits for one (Spotify import) or none of its tracks has a YouTube link yet
  const todo = lib.albums.filter((a) => (albumId ? a.id === albumId : (a as { needsSource?: boolean }).needsSource || (a.trackIds.length > 0 && a.trackIds.every((id) => !lib.trackById.get(id)?.youtubeMusicUrl))));
  const queue = todo.filter((a) => !skipped.includes(a.id));
  const current = queue[0];

  async function look(a: NonNullable<typeof current>) {
    asked.current = a.id; setBusy(true); setFound(null); setPick(0);
    try {
      const { results } = await api().matchAlbums([{ id: a.id, title: a.title, artist: a.leads[0]?.name ?? a.artistName, trackCount: a.trackIds.length }]);
      if (asked.current === a.id) setFound({ candidates: results[0]?.candidates ?? [], error: results[0]?.error });
    } catch (e) { if (asked.current === a.id) setFound({ candidates: [], error: (e as Error).message === 'Failed to fetch' ? 'Cannot reach the server.' : (e as Error).message }); }
    finally { if (asked.current === a.id) setBusy(false); }
  }
  // each album is looked up as soon as it is the current one
  useEffect(() => { if (configured && current && asked.current !== current.id) void look(current); }, [current?.id, configured]); // eslint-disable-line react-hooks/exhaustive-deps

  const badge = (sc: number) => (sc >= 0.8 ? 'text-good' : sc >= 0.55 ? 'text-warn' : 'text-bad');
  const c = found?.candidates[pick];

  return (
    <Modal title="Find the YouTube Music album" onClose={onClose} wide footer={<button className="btn ml-auto" onClick={onClose}>Close</button>}>
      {!configured && <div className="rounded-theme bg-warn/15 p-3 text-sm text-warn">This runs on your server (it needs yt-dlp to search). Connect one in Settings first.</div>}
      {!current && <p className="text-sm text-muted">{todo.length ? 'You skipped every album that is waiting.' : 'No album is waiting for a YouTube Music link.'}</p>}
      {current && <>
        <p className="text-sm text-muted">{queue.length} album{queue.length === 1 ? '' : 's'} {albumId ? 'to look up' : 'without a YouTube Music link'}, one at a time. The server searches YouTube Music’s albums for “artist album” and checks the best results.</p>
        <div className="flex items-center gap-3 rounded-theme border border-line p-3">
          <Cover hash={current.cover} seed={current.title} className="h-16 w-16 shrink-0" />
          <div className="min-w-0"><div className="truncate font-semibold">{current.title}</div><div className="truncate text-sm text-muted">{current.artistName} · {current.trackIds.length} track{current.trackIds.length === 1 ? '' : 's'}</div></div>
        </div>
        {busy && <div className="flex items-center gap-2 text-sm text-muted"><Loader2 size={15} className="animate-spin" />Searching YouTube Music…</div>}
        {found?.error && <div className="rounded-theme bg-bad/15 p-3 text-sm text-bad">{found.error}</div>}
        {found && !found.error && !found.candidates.length && <div className="rounded-theme bg-warn/15 p-3 text-sm text-warn">No album found. Skip it, or paste its link by hand in Health › Albums waiting for a YouTube album link.</div>}
        {found && found.candidates.length > 0 && <div role="radiogroup" aria-label="Results" className="space-y-1.5">{found.candidates.map((x, k) => (
          <div key={x.url} data-selected={pick === k || undefined} className="card bt-sel flex items-center gap-2 px-3 py-2 text-sm">
            <button role="radio" aria-checked={pick === k} className="min-w-0 flex-1 text-left" onClick={() => setPick(k)}>
              <div className="truncate font-medium">{x.title || 'Album'}</div>
              <div className="truncate text-xs text-muted">{x.channel}{x.count ? `${x.channel ? ' · ' : ''}${x.count} tracks` : ''} <span className={badge(x.score)}>{Math.round(Math.min(1, x.score) * 100)}% match</span></div>
            </button>
            <a className="p-1 text-muted hover:text-fg" href={x.url} target="_blank" rel="noreferrer" aria-label="Open on YouTube Music"><ExternalLink size={14} /></a>
          </div>))}</div>}
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-accent" disabled={!c || busy} onClick={() => edit({ kind: 'import-into-album', id: current.id, url: c!.url })}>Import…</button>
          <button className="btn" disabled={busy} onClick={() => void look(current)}><Search size={15} />Search again</button>
          {!albumId && queue.length > 1 && <button className="btn btn-ghost" onClick={() => setSkipped((s) => [...s, current.id])}>Skip<SkipForward size={14} className="ml-1" /></button>}
        </div>
      </>}
    </Modal>
  );
}
