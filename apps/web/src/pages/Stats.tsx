import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Clock, Download, Flame, History, Upload, Users, SkipForward, Shuffle } from 'lucide-react';
import { useLibrary } from '../lib/derive.ts';
import { computeStats } from '../lib/stats.ts';
import { buildListens, type Listen } from '../lib/listens.ts';
import { computeListenStats, dayKey, rangeFor, RANGES, type RangeId, type ListenStats, type TopRow } from '../lib/listenStats.ts';
import { trackPath } from '../lib/trackPath.ts';
import { cn } from '../lib/cn.ts';
import { Area, Bars, Calendar, Donut, fmtHours, Heatgrid, Kpi, RankList } from '../components/charts.tsx';
import { ExportHistoryDialog, ImportHistoryDialog } from '../components/HistoryTools.tsx';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, h) => `${h}`);
const TABS = [{ id: 'overview', label: 'Overview' }, { id: 'top', label: 'Top' }, { id: 'activity', label: 'Activity' }, { id: 'history', label: 'History' }, { id: 'library', label: 'Library' }] as const;
type Tab = (typeof TABS)[number]['id'];

function Panel({ title, children, right, className }: { title: string; children: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return <section className={cn('card min-w-0 space-y-3 p-5', className)}><div className="flex items-center justify-between gap-2"><h2 className="font-semibold">{title}</h2>{right}</div>{children}</section>;
}

function Overview({ s, lib }: { s: ListenStats; lib: ReturnType<typeof useLibrary> }) {
  const months = s.byMonth.slice(-24);
  // a short history has too few months for a line: show days instead
  const daily = s.byMonth.length < 3;
  const series = daily ? [...s.byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-60).map(([d, v]) => ({ label: d.slice(5).replace('-', '/'), value: v })) : months.map((m) => ({ label: m.month.slice(2).replace('-', '/'), value: m.ms }));
  const feature = s.topArtists[0];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={<Clock size={13} />} label="Time listened" value={fmtHours(s.ms)} sub={`${s.plays.toLocaleString()} plays`} />
        <Kpi icon={<Users size={13} />} label="Artists" value={s.distinctArtists.toLocaleString()} sub={`${s.distinctTracks.toLocaleString()} different tracks`} />
        <Kpi icon={<Flame size={13} />} label="Streak" value={`${s.longestStreak.days} d`} sub={s.currentStreak ? `${s.currentStreak} day${s.currentStreak === 1 ? '' : 's'} running` : 'longest, in days in a row'} />
        <Kpi icon={<SkipForward size={13} />} label="Skip rate" value={`${Math.round(s.skipRate * 100)}%`} sub={`${s.skips.toLocaleString()} skips`} />
      </div>
      <Panel title="Listening over time" right={<span className="text-xs text-muted">{daily ? 'time per day' : 'time per month'}</span>}>
        <Area data={series} format={fmtHours} />
        {feature && <p className="text-sm text-muted">Most played: <b className="text-fg">{feature.label}</b> ({feature.plays.toLocaleString()} plays). Longest session {fmtHours(s.sessions.longestMs)}, {s.daysActive.toLocaleString()} active days.</p>}
      </Panel>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Top artists"><RankList rows={s.topArtists.slice(0, 6).map((r) => ({ key: r.key, label: r.label, value: r.plays }))} unit={(n) => `${n.toLocaleString()}`} /></Panel>
        <Panel title="Top tracks"><RankList rows={s.topTracks.slice(0, 6).map((r) => ({ key: r.key, label: r.label, sub: r.sub, value: r.plays }))} /></Panel>
        <Panel title="Top albums"><RankList rows={s.topAlbums.slice(0, 6).map((r) => ({ key: r.key, label: r.label, sub: r.sub, value: r.plays }))} /></Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {s.onThisDay.length > 0 && <Panel title="On this day"><ul className="space-y-1.5 text-sm">{s.onThisDay.map((d) => <li key={d.year} className="flex gap-3"><b className="w-12 shrink-0 tabular-nums">{d.year}</b><span className="min-w-0 truncate text-muted">{d.plays} play{d.plays === 1 ? '' : 's'}{d.top ? ` · ${d.top}` : ''}</span></li>)}</ul></Panel>}
        <Panel title="New artists per month" right={<span className="text-xs text-muted">first time you played them</span>}><Bars data={months.slice(-12).map((m) => ({ label: m.month.slice(5), value: m.newArtists }))} format={(n) => `${n} new`} height={110} /></Panel>
      </div>
      {lib.logs.length === 0 && <p className="text-sm text-muted">Nothing to show yet. Play music, or import your Spotify history with the button above.</p>}
    </div>
  );
}

function Top({ s, byTime, lib }: { s: ListenStats; byTime: boolean; lib: ReturnType<typeof useLibrary> }) {
  const rows = (list: TopRow[], link = false) => [...list].sort((a, b) => (byTime ? b.ms - a.ms : b.plays - a.plays)).slice(0, 25).map((r) => ({ key: r.key, label: r.label, sub: r.sub, value: byTime ? r.ms : r.plays, extra: byTime ? `${r.plays.toLocaleString()} plays` : fmtHours(r.ms), to: link && r.trackId ? trackPath(lib.trackById.get(r.trackId) ?? { id: r.trackId }) : undefined }));
  const unit = byTime ? fmtHours : (n: number) => n.toLocaleString();
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Panel title="Artists"><RankList rows={rows(s.topArtists)} unit={unit} /></Panel>
      <Panel title="Tracks"><RankList rows={rows(s.topTracks, true)} unit={unit} /></Panel>
      <Panel title="Albums"><RankList rows={rows(s.topAlbums)} unit={unit} /></Panel>
      {s.notInLibrary.length > 0 && <Panel className="xl:col-span-3" title="Played a lot, not in your library" right={<span className="text-xs text-muted">import them: Add › Import from Spotify</span>}>
        <RankList rows={s.notInLibrary.slice(0, 20).map((r) => ({ key: r.key, label: r.label, sub: r.sub, value: r.plays }))} /></Panel>}
    </div>
  );
}

function Activity({ s }: { s: ListenStats }) {
  const peak = s.byHour.indexOf(Math.max(...s.byHour));
  return (
    <div className="space-y-4">
      <Panel title="Listening clock" right={<span className="text-xs text-muted">plays by weekday and hour</span>}><Heatgrid cells={s.clock} rows={WEEKDAYS} cols={HOURS} /></Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Time of day" right={<span className="text-xs text-muted">busiest hour: {s.plays ? `${peak}:00` : '–'}</span>}><Bars data={s.byHour.map((v, h) => ({ label: h % 3 === 0 ? String(h) : '', value: v }))} format={fmtHours} highlight={s.plays ? peak : undefined} /></Panel>
        <Panel title="Day of the week"><Bars data={s.byWeekday.map((v, i) => ({ label: WEEKDAYS[i], value: v }))} format={(n) => `${n.toLocaleString()} plays`} highlight={s.byWeekday.indexOf(Math.max(...s.byWeekday))} /></Panel>
      </div>
      <Panel title="Calendar" right={<span className="text-xs text-muted">the last 12 months, darker = more listening</span>}><Calendar byDay={s.byDay} format={fmtHours} /></Panel>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Where you listen"><Donut slices={s.platforms.slice(0, 5).map((p) => ({ label: p.name, value: p.plays }))} /></Panel>
        <Panel title="Shuffle and skips"><Donut slices={[{ label: 'Played through', value: s.plays - s.skips }, { label: 'Skipped', value: s.skips }]} />
          {s.shuffleShare !== null && <p className="flex items-center gap-1.5 text-xs text-muted"><Shuffle size={12} />{Math.round(s.shuffleShare * 100)}% of plays were on shuffle</p>}</Panel>
        <Panel title="Sessions"><dl className="space-y-1.5 text-sm"><div className="flex justify-between"><dt className="text-muted">Sessions</dt><dd className="tabular-nums">{s.sessions.count.toLocaleString()}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Average</dt><dd className="tabular-nums">{fmtHours(s.sessions.avgMs)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Longest</dt><dd className="tabular-nums">{fmtHours(s.sessions.longestMs)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Active days</dt><dd className="tabular-nums">{s.daysActive.toLocaleString()} of {s.days.toLocaleString()}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Longest streak</dt><dd className="tabular-nums">{s.longestStreak.days} days</dd></div></dl>
          <p className="text-xs text-muted">A session ends after 30 minutes of silence.</p></Panel>
      </div>
    </div>
  );
}

const PAGE = 200;
/** Every play as a timeline, newest first, grouped by day. */
function Timeline({ listens, lib }: { listens: Listen[]; lib: ReturnType<typeof useLibrary> }) {
  const [q, setQ] = useState('');
  const [source, setSource] = useState<'all' | 'curator' | 'spotify'>('all');
  const [skips, setSkips] = useState<'all' | 'played' | 'skipped'>('all');
  const [on, setOn] = useState('');
  const [shown, setShown] = useState(PAGE);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out: Listen[] = [];
    for (let i = listens.length - 1; i >= 0; i--) {
      const l = listens[i];
      if (source !== 'all' && l.source !== source) continue;
      if (skips === 'skipped' ? !l.skipped : skips === 'played' ? l.skipped : false) continue;
      if (on && dayKey(l.ts) !== on) continue;
      if (needle && !`${l.title} ${l.artist} ${l.album}`.toLowerCase().includes(needle)) continue;
      out.push(l);
    }
    return out;
  }, [listens, q, source, skips, on]);
  const groups = useMemo(() => {
    const g: { day: string; items: Listen[] }[] = [];
    for (const l of rows.slice(0, shown)) { const d = dayKey(l.ts); if (g[g.length - 1]?.day !== d) g.push({ day: d, items: [] }); g[g.length - 1].items.push(l); }
    return g;
  }, [rows, shown]);
  const dayMs = (items: Listen[]) => items.reduce((n, l) => n + l.ms, 0);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input className="input !w-64 max-w-full" placeholder="Search your history…" value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} />
        <input className="input !w-auto" type="date" aria-label="Jump to a day" value={on} onChange={(e) => { setOn(e.target.value); setShown(PAGE); }} />
        {on && <button className="btn btn-ghost" onClick={() => setOn('')}>All days</button>}
        <select className="input !w-auto" value={source} onChange={(e) => { setSource(e.target.value as typeof source); setShown(PAGE); }}><option value="all">All sources</option><option value="curator">Played in Curator</option><option value="spotify">From Spotify</option></select>
        <select className="input !w-auto" value={skips} onChange={(e) => { setSkips(e.target.value as typeof skips); setShown(PAGE); }}><option value="all">Plays and skips</option><option value="played">Played through</option><option value="skipped">Skipped only</option></select>
        <span className="ml-auto text-xs text-muted">{rows.length.toLocaleString()} plays</span>
      </div>
      {!rows.length && <div className="card p-6 text-center text-sm text-muted">{listens.length ? 'No plays match.' : 'No plays yet. Play something, or import your Spotify history.'}</div>}
      <div className="relative space-y-5 border-l border-line/70 pl-4">
        {groups.map((g) => (
          <section key={g.day}>
            <h3 className="sticky top-14 z-[1] -ml-[1.4rem] mb-1 flex items-center gap-2 bg-bg/85 py-1 pl-1 text-sm font-semibold backdrop-blur">
              <span className="h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-bg" aria-hidden />
              {new Date(g.items[0].ts).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              <span className="text-xs font-normal text-muted">{g.items.length} plays · {fmtHours(dayMs(g.items))}</span>
            </h3>
            <ul className="divide-y divide-line/50">
              {g.items.map((l) => {
                const t = l.trackId ? lib.trackById.get(l.trackId) : undefined;
                const body = <><span className="block truncate text-sm font-medium">{l.title}</span><span className="block truncate text-xs text-muted">{l.artist}{l.album ? ` · ${l.album}` : ''}</span></>;
                return (
                  <li key={l.id} className="flex items-center gap-3 py-1.5">
                    <time className="w-[4.5rem] shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-muted" dateTime={new Date(l.ts).toISOString()}>{new Date(l.ts - l.ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                    <div className="min-w-0 flex-1">{t ? <Link to={trackPath(t)} className="block hover:underline">{body}</Link> : body}</div>
                    {l.skipped && <span className="chip text-warn">skipped</span>}
                    {l.source === 'spotify' && <span className="chip hidden sm:inline-flex">Spotify</span>}
                    {!t && <span className="chip hidden text-muted md:inline-flex" title="Not in your library">not in library</span>}
                    <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted">{Math.floor(l.ms / 60000)}:{String(Math.floor((l.ms % 60000) / 1000)).padStart(2, '0')}</span>
                  </li>);
              })}
            </ul>
          </section>))}
      </div>
      {rows.length > shown && <div className="flex justify-center gap-2"><button className="btn" onClick={() => setShown(shown + PAGE)}>Show {Math.min(PAGE, rows.length - shown)} more</button><button className="btn btn-ghost" onClick={() => setShown(rows.length)}>Show all {rows.length.toLocaleString()}</button></div>}
    </div>
  );
}

const fmtDuration = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m` : `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`);
function LibraryTab() {
  const lib = useLibrary();
  const s = computeStats(lib);
  const maxBand = Math.max(1, ...s.ratingBands);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Votes" value={lib.votes.length.toLocaleString()} sub={`${s.rated} rated · ${s.unrated} not yet`} />
        <Kpi label="Tracks" value={lib.tracks.length.toLocaleString()} sub={`${s.withAudio} with audio`} />
        <Kpi label="Albums" value={lib.albums.length.toLocaleString()} sub={`${lib.artists.length} artists`} />
        <Kpi label="Played in Curator" value={fmtDuration(s.secondsListened)} sub={`${s.plays} plays · ${Math.round(s.skipRate * 100)}% skipped`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Rating distribution"><Bars height={140} data={s.ratingBands.map((n, i) => ({ label: i === 9 ? '9+' : String(i), value: n }))} format={(n) => `${n} tracks`} highlight={s.ratingBands.indexOf(maxBand)} /></Panel>
        <Panel title="Genres"><RankList rows={s.topGenres.map((g) => ({ key: g.name, label: g.name, value: g.tracks }))} unit={(n) => `${n} tracks`} /></Panel>
      </div>
    </div>
  );
}

export function StatsPage() {
  const lib = useLibrary();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'overview') as Tab;
  const [range, setRange] = useState<RangeId>('all');
  const [thirty, setThirty] = useState(false);
  const [byTime, setByTime] = useState(false);
  const [dialog, setDialog] = useState<'import' | 'export' | null>(null);
  const listens = useMemo(() => buildListens(lib), [lib]);
  const s = useMemo(() => computeListenStats(listens, rangeFor(range), { minMs: thirty ? 30_000 : 0 }), [listens, range, thirty]);
  const imported = listens.filter((l) => l.source === 'spotify').length;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-bold">Stats</h1>
        <button className="btn" onClick={() => setDialog('import')}><Upload size={15} />Import Spotify history</button>
        <button className="btn" onClick={() => setDialog('export')}><Download size={15} />Export for stats.fm</button>
      </div>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line pb-px">
        {TABS.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setParams({ tab: t.id }, { replace: true })}
          className={cn('-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors', tab === t.id ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg')}>{t.label}</button>)}
      </div>
      {tab !== 'library' && tab !== 'history' && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Time range">{RANGES.map((r) => <button key={r.id} className={cn('btn !py-1 !text-xs', range === r.id && 'btn-accent')} aria-pressed={range === r.id} onClick={() => setRange(r.id)}>{r.label}</button>)}</div>
          <label className="ml-auto flex items-center gap-1.5 text-xs text-muted" title="stats.fm only counts a play that lasted at least 30 seconds"><input type="checkbox" checked={thirty} onChange={(e) => setThirty(e.target.checked)} />Only plays of 30 s or more</label>
          {tab === 'top' && <label className="flex items-center gap-1.5 text-xs text-muted"><input type="checkbox" checked={byTime} onChange={(e) => setByTime(e.target.checked)} />Rank by time</label>}
        </div>)}
      {tab === 'overview' && <Overview s={s} lib={lib} />}
      {tab === 'top' && <Top s={s} byTime={byTime} lib={lib} />}
      {tab === 'activity' && <Activity s={s} />}
      {tab === 'history' && <Timeline listens={listens} lib={lib} />}
      {tab === 'library' && <LibraryTab />}
      <p className="flex items-center gap-1.5 text-xs text-muted"><History size={12} />{listens.length.toLocaleString()} plays in total{imported ? `, ${imported.toLocaleString()} imported from Spotify` : ''}.</p>
      {dialog === 'import' && <ImportHistoryDialog onClose={() => setDialog(null)} />}
      {dialog === 'export' && <ExportHistoryDialog onClose={() => setDialog(null)} />}
    </div>
  );
}
