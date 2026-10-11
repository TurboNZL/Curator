import { useRef, useState } from 'react';
import { ExternalLink, Loader2, Search } from 'lucide-react';
import type { MatchCandidate } from '../lib/api.ts';
import { useLibrary } from '../lib/derive.ts';
import { api, useStore } from '../lib/store.ts';
import { Modal } from './forms.tsx';

interface Row { trackId: string; candidates: MatchCandidate[]; pick: number; on: boolean; error?: string }
const BATCH = 9;

/** Find YouTube Music links for tracks that have none: song.link (exact, from the Spotify link) and a YouTube search (scored). You review before anything is saved. */
export function MatchLinksDialog({ onClose }: { onClose: () => void }) {
  const lib = useLibrary();
  const patch = useStore((s) => s.patch);
  const syncNow = useStore((s) => s.syncNow);
  const configured = useStore((s) => !!s.settings.token);
  const [odesli, setOdesli] = useState(true);
  const [search, setSearch] = useState(true);
  const [download, setDownload] = useState(true);
  const [only, setOnly] = useState<'all' | 'withSpotify'>('all');
  const [rows, setRows] = useState<Row[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const stop = useRef(false);

  const todo = lib.tracks.filter((t) => !t.youtubeMusicUrl && (only === 'all' || t.spotifyUrl));
  const methods = [...(odesli ? ['odesli' as const] : []), ...(search ? ['search' as const] : [])];

  async function run() {
    stop.current = false; setError(null); setRows([]); setSaved(null);
    const queue = [...todo];
    setProgress({ done: 0, total: queue.length });
    try {
      for (let i = 0; i < queue.length && !stop.current; i += BATCH) {
        const batch = queue.slice(i, i + BATCH);
        const { results } = await api().match(batch.map((t) => ({ id: t.id, title: t.title, artist: t.leads[0]?.name ?? t.artistName, album: t.albumTitle ?? undefined, spotifyUrl: t.spotifyUrl })), methods);
        setRows((r) => [...r, ...results.map((x) => ({ trackId: x.id, candidates: x.candidates, pick: 0, on: (x.candidates[0]?.score ?? 0) >= 0.75, error: x.error }))]);
        setProgress({ done: Math.min(queue.length, i + BATCH), total: queue.length });
      }
    } catch (e) { setError((e as Error).message === 'Failed to fetch' ? 'Cannot reach the server.' : (e as Error).message); }
    setProgress((p) => (p ? { ...p } : p));
    stop.current = false;
  }
  const running = !!progress && progress.done < progress.total && !error && !stop.current;

  async function apply() {
    const picked = rows.filter((r) => r.on && r.candidates[r.pick]);
    for (const r of picked) patch('tracks', r.trackId, { youtubeMusicUrl: r.candidates[r.pick].url });
    setSaved(picked.length);
    if (download && picked.length) { await syncNow(); await api().acquire(picked.map((r) => r.trackId)).catch(() => undefined); }
  }
  const on = rows.filter((r) => r.on).length;
  const badge = (s: number) => (s >= 0.85 ? 'text-good' : s >= 0.6 ? 'text-warn' : 'text-bad');

  return (
    <Modal title="Find YouTube links" onClose={onClose} wide
      footer={saved !== null ? <button className="btn btn-accent ml-auto" onClick={onClose}>Done</button> : <><button className="btn" onClick={onClose}>Close</button>
        <button className="btn btn-accent ml-auto" disabled={!on || running} onClick={() => void apply()}>Save {on} links</button></>}>
      {!configured && <div className="rounded-theme bg-warn/15 p-3 text-sm text-warn">This runs on your server (it needs yt-dlp to search). Connect one in Settings first.</div>}
      <p className="text-sm text-muted">{todo.length} tracks have no YouTube Music link. Pick how to look for them; nothing is saved until you press Save. Low scores are probably the wrong video: untick those and fix them by hand.</p>
      <div className="space-y-1.5 text-sm">
        <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5" checked={odesli} onChange={(e) => setOdesli(e.target.checked)} /><span><b>song.link</b> <span className="text-muted">asks a service that knows the same song on every platform. Exact, needs the track's Spotify link, about 10 lookups a minute.</span></span></label>
        <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5" checked={search} onChange={(e) => setSearch(e.target.checked)} /><span><b>YouTube search</b> <span className="text-muted">searches “artist title” and scores the results (title, artist, “- Topic” channel, length). Works for any track.</span></span></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={only === 'withSpotify'} onChange={(e) => setOnly(e.target.checked ? 'withSpotify' : 'all')} />Only tracks that have a Spotify link</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={download} onChange={(e) => setDownload(e.target.checked)} />Download the audio for the links I save</label>
      </div>
      <div className="flex items-center gap-2"><button className="btn btn-accent" disabled={!configured || !todo.length || !methods.length || running} onClick={() => void run()}>{running ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}Find links for {todo.length} tracks</button>
        {running && <button className="btn" onClick={() => { stop.current = true; setProgress((p) => (p ? { ...p, total: p.done } : p)); }}>Stop</button>}
        {progress && <span className="text-xs text-muted">{progress.done}/{progress.total}</span>}</div>
      {error && <div className="rounded-theme bg-bad/15 p-3 text-sm text-bad">{error}</div>}
      {saved !== null && <div className="rounded-theme bg-good/10 p-3 text-sm text-good" role="status">Saved {saved} links.</div>}
      {rows.length > 0 && <div className="max-h-96 space-y-0.5 overflow-y-auto rounded-theme border border-line p-1">
        {rows.map((r, i) => {
          const t = lib.trackById.get(r.trackId); const c = r.candidates[r.pick];
          return (
            <div key={r.trackId} className="flex flex-wrap items-center gap-2 rounded-theme px-2 py-1 text-sm hover:bg-raised/50">
              <input type="checkbox" aria-label={`Use the link for ${t?.title}`} checked={r.on} disabled={!c} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))} />
              <div className="min-w-0 flex-1 basis-40"><div className="truncate font-medium">{t?.title}<span className="font-normal text-muted"> · {t?.artistName}</span></div>
                {c ? <div className="truncate text-xs text-muted">{c.title}{c.channel ? ` · ${c.channel}` : ''} <span className={badge(c.score)}>{c.method === 'odesli' ? 'song.link' : `${Math.round(c.score * 100)}%`}</span></div> : <div className="text-xs text-warn">{r.error ?? 'No match found'}</div>}</div>
              {r.candidates.length > 1 && <select className="input !w-auto !py-1 text-xs" value={r.pick} aria-label="Other results" onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, pick: Number(e.target.value), on: true } : x)))}>{r.candidates.map((x, k) => <option key={k} value={k}>{x.title.slice(0, 40)} ({Math.round(x.score * 100)}%)</option>)}</select>}
              {c && <a className="p-1 text-muted hover:text-fg" href={c.url} target="_blank" rel="noreferrer" aria-label="Open on YouTube"><ExternalLink size={14} /></a>}
            </div>);
        })}
      </div>}
    </Modal>
  );
}
