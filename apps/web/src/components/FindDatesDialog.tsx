import { useRef, useState } from 'react';
import { CalendarCheck, Loader2 } from 'lucide-react';
import type { DateAnswerRes } from '../lib/api.ts';
import { useLibrary } from '../lib/derive.ts';
import { api, useStore } from '../lib/store.ts';
import { siblingDate } from '../lib/releaseOps.ts';
import { Modal } from './forms.tsx';

interface Row { releaseId: string; label: string; date: string; source: string; on: boolean }
const BATCH = 4;
const SOURCE: Record<DateAnswerRes['source'] | 'album', string> = { spotify: 'Spotify', itunes: 'iTunes', musicbrainz: 'MusicBrainz', album: 'another release of the same album' };

/**
 * Give the releases that have no date one. First free and certain: another release of the same album that has a date (the Spotify
 * import's, when a YouTube import made a second release); then the server asks Spotify (when signed in), iTunes and MusicBrainz for an exact
 * album match. Every proposal is shown with its source and is saved only when ticked.
 */
export function FindDatesDialog({ onClose }: { onClose: () => void }) {
  const lib = useLibrary();
  const patch = useStore((s) => s.patch);
  const configured = useStore((s) => !!s.settings.token);
  const [rows, setRows] = useState<Row[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missed, setMissed] = useState<string[]>([]);
  const [saved, setSaved] = useState<number | null>(null);
  const [online, setOnline] = useState(true);
  const stop = useRef(false);

  const undated = lib.releases.filter((r) => !r.releaseDate);

  async function run() {
    stop.current = false; setError(null); setRows([]); setMissed([]); setSaved(null);
    const found: Row[] = [], ask: typeof undated = [];
    for (const r of undated) {
      const album = lib.albumById.get(r.albumId);
      const date = siblingDate(lib.releases.filter((x) => x.albumId === r.albumId), album?.defaultReleaseId, r.id);
      if (date) found.push({ releaseId: r.id, label: `${r.title} · ${album?.title ?? ''}`, date, source: SOURCE.album, on: true }); else ask.push(r);
    }
    setRows(found);
    if (!online || !configured) { setMissed(ask.map((r) => `${r.title} · ${lib.albumById.get(r.albumId)?.title ?? ''}`)); setProgress(null); return; }
    // one request per album, not per release: several releases of an album share the answer
    const albums = [...new Set(ask.map((r) => r.albumId))].flatMap((id) => { const a = lib.albumById.get(id); return a ? [{ id, album: a.title, artist: a.leads[0]?.name ?? a.artistName }] : []; });
    setProgress({ done: 0, total: albums.length });
    const answers = new Map<string, DateAnswerRes | null>();
    try {
      for (let i = 0; i < albums.length && !stop.current; i += BATCH) {
        const { results } = await api().releaseDates(albums.slice(i, i + BATCH));
        for (const x of results) answers.set(x.id, x.answer);
        setProgress({ done: Math.min(albums.length, i + BATCH), total: albums.length });
        setRows([...found, ...ask.flatMap((r) => { const a = answers.get(r.albumId); return a ? [{ releaseId: r.id, label: `${r.title} · ${lib.albumById.get(r.albumId)?.title ?? ''}`, date: a.date, source: SOURCE[a.source], on: true }] : []; })]);
      }
    } catch (e) { setError((e as Error).message === 'Failed to fetch' ? 'Cannot reach the server.' : (e as Error).message); }
    setMissed(ask.filter((r) => !answers.get(r.albumId)).map((r) => `${r.title} · ${lib.albumById.get(r.albumId)?.title ?? ''}`));
  }
  const running = !!progress && progress.done < progress.total && !error && !stop.current;
  const apply = () => { const picked = rows.filter((r) => r.on); for (const r of picked) patch('releases', r.releaseId, { releaseDate: r.date }); setSaved(picked.length); };
  const on = rows.filter((r) => r.on).length;

  return (
    <Modal title="Find release dates" onClose={onClose} wide
      footer={saved !== null ? <button className="btn btn-accent ml-auto" onClick={onClose}>Done</button> : <><button className="btn" onClick={onClose}>Close</button>
        <button className="btn btn-accent ml-auto" disabled={!on || running} onClick={apply}>Save {on} dates</button></>}>
      <p className="text-sm text-muted">{undated.length} release{undated.length === 1 ? ' has' : 's have'} no date. Releases of an album that already has a dated release take that date; for the rest the server asks Spotify (if you signed in under Settings), iTunes and MusicBrainz, and accepts only an exact album and artist match.</p>
      {!configured && <div className="rounded-theme bg-warn/15 p-3 text-sm text-warn">Looking dates up needs your server (Settings). Dates from other releases of the same album still work.</div>}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-accent" disabled={running || !undated.length} onClick={() => void run()}>{running ? <Loader2 size={15} className="animate-spin" /> : <CalendarCheck size={15} />}{rows.length ? 'Search again' : 'Find dates'}</button>
        {running && <button className="btn" onClick={() => { stop.current = true; setProgress((p) => (p ? { ...p } : p)); }}>Stop</button>}
        <label className="flex items-center gap-1.5 text-sm text-muted"><input type="checkbox" checked={online} disabled={!configured} onChange={(e) => setOnline(e.target.checked)} />Also look online</label>
        {progress && <span className="text-sm text-muted" role="status">{progress.done}/{progress.total} albums asked</span>}
      </div>
      {error && <div className="rounded-theme bg-bad/15 p-3 text-sm text-bad">{error}</div>}
      {rows.length > 0 && <div className="max-h-80 divide-y divide-line/60 overflow-y-auto rounded-theme border border-line">
        {rows.map((r, i) => (
          <label key={r.releaseId} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm hover:bg-raised/50">
            <input type="checkbox" checked={r.on} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))} />
            <span className="min-w-0 flex-1 basis-48 truncate">{r.label}</span>
            <input type="text" className="input !w-32 !py-1 text-xs" aria-label="Date" value={r.date} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} />
            <span className="w-40 shrink-0 text-xs text-muted">{r.source}</span>
          </label>))}
      </div>}
      {missed.length > 0 && !running && <details className="text-xs text-muted"><summary className="cursor-pointer">{missed.length} with no answer (open them in Health to set the date by hand)</summary><ul className="mt-1 list-disc pl-5">{missed.slice(0, 50).map((m) => <li key={m}>{m}</li>)}</ul></details>}
      {saved !== null && <div className="text-sm text-good" role="status">{saved} date{saved === 1 ? '' : 's'} saved.</div>}
    </Modal>
  );
}
