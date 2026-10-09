import { Link } from 'react-router-dom';
import { useLibrary } from '../lib/derive.ts';
import { computeStats } from '../lib/stats.ts';

const fmtDuration = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m` : `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`);

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div className="card p-4"><div className="text-xs uppercase tracking-wider text-muted">{label}</div><div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>{sub && <div className="text-xs text-muted">{sub}</div>}</div>;
}

/** Horizontal bars. Width is relative to the largest value; the number sits at the end so it never depends on bar length. */
function Bars({ rows }: { rows: { label: string; value: number; to?: string; note?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return <div className="space-y-2">{rows.map((r) => (
    <div key={r.label} className="flex items-center gap-3 text-sm">
      <div className="w-40 shrink-0 truncate">{r.to ? <Link to={r.to} className="hover:underline">{r.label}</Link> : r.label}{r.note && <span className="block truncate text-xs text-muted">{r.note}</span>}</div>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-raised"><div className="h-full rounded-full bg-accent" style={{ width: `${(r.value / max) * 100}%` }} /></div>
      <div className="w-12 text-right text-xs tabular-nums text-muted">{r.value}</div>
    </div>))}</div>;
}

export function StatsPage() {
  const lib = useLibrary();
  const s = computeStats(lib);
  const empty = !lib.logs.length;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Stats</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Plays" value={String(s.plays)} sub={`${s.distinctTracks} different tracks`} />
        <Tile label="Time listened" value={fmtDuration(s.secondsListened)} />
        <Tile label="Skip rate" value={`${Math.round(s.skipRate * 100)}%`} sub={`${s.skips} skips`} />
        <Tile label="Votes" value={String(lib.votes.length)} sub={`${s.rated} rated · ${s.unrated} not yet`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3 p-5"><h2 className="font-semibold">Rating distribution</h2>
          <Bars rows={s.ratingBands.map((n, i) => ({ label: i === 9 ? '9 – 10' : `${i} – ${i + 1}`, value: n })).reverse()} />
        </section>
        <section className="card space-y-3 p-5"><h2 className="font-semibold">Genres</h2>
          <Bars rows={s.topGenres.map((g) => ({ label: g.name, value: g.tracks }))} /></section>
        <section className="card space-y-3 p-5"><h2 className="font-semibold">Most listened</h2>
          {empty ? <p className="text-sm text-muted">Play some music and it will show up here.</p>
            : <Bars rows={s.topTracks.map((t) => ({ label: t.title, note: t.artist, value: Math.round(t.seconds / 60), to: undefined }))} />}
          {!empty && <p className="text-xs text-muted">Minutes listened.</p>}</section>
        <section className="card space-y-2 p-5"><h2 className="font-semibold">Recent activity</h2>
          {empty ? <p className="text-sm text-muted">Nothing played yet.</p> : s.recent.map((r) => {
            const t = lib.trackById.get(r.trackId);
            return <div key={r.id} className="flex items-center justify-between gap-3 text-sm"><span className="truncate">{t?.title ?? 'Deleted track'} <span className="text-muted">· {t?.artistName}</span></span>
              <span className="shrink-0 text-xs text-muted">{r.isSkip ? 'skipped · ' : ''}{new Date(r.timestamp).toLocaleDateString()}</span></div>;
          })}</section>
      </div>
      <p className="text-xs text-muted">{s.withAudio} of {lib.tracks.length} tracks have audio on the server.</p>
    </div>
  );
}
