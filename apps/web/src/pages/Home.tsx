import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Swords, Trash2 } from 'lucide-react';
import { logJournal } from '../lib/journal.ts';
import { useLibrary } from '../lib/derive.ts';
import { useStore } from '../lib/store.ts';
import { cn } from '../lib/cn.ts';

function Tile({ label, value, to }: { label: string; value: string; to?: string }) {
  const body = <><div className="text-xs uppercase tracking-wider text-muted">{label}</div><div className="mt-1 text-2xl font-bold tabular-nums">{value}</div></>;
  return to ? <Link to={to} className="card block p-4 hover:bg-raised/50">{body}</Link> : <div className="card p-4">{body}</div>;
}

export function HomePage() {
  const lib = useLibrary();
  const remove = useStore((s) => s.remove);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [shown, setShown] = useState(15);

  const rated = lib.tracks.filter((t) => t.effectiveRating > 0.001);
  const avg = rated.length ? rated.reduce((s, t) => s + t.effectiveRating, 0) / rated.length : 0;
  // "complete" = enough votes to trust the rating, or a manual rating
  const done = lib.tracks.filter((t) => t.comparisons >= 3 || (t.initialRating ?? 0) > 0).length;
  const pct = lib.tracks.length ? Math.round((done / lib.tracks.length) * 100) : 0;
  const entries = [...lib.timeline].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3"><h1 className="mr-auto text-2xl font-bold">Curation journal</h1>
        <Link to="/vote" className="btn btn-accent"><Swords size={16} />Keep ranking · {lib.tracks.length - done} to go</Link></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Library" value={String(lib.tracks.length)} to="/tracks" />
        <Tile label="Avg. rating" value={avg.toFixed(2)} to="/stats" />
        <Tile label="Relational bios" value={String(lib.groups.length)} to="/bios" />
        <Tile label="Ranked" value={`${pct}%`} to="/vote" />
      </div>
      <section className="space-y-3">
        <form className="card space-y-2 p-4" onSubmit={(e) => { e.preventDefault(); if (!title.trim()) return; logJournal('entry', title.trim(), text.trim()); setTitle(''); setText(''); }}>
          <input className="input" placeholder="Write a journal entry title…" value={title} onChange={(e) => setTitle(e.target.value)} />
          {title && <><textarea className="input" rows={2} placeholder="Details (optional)" value={text} onChange={(e) => setText(e.target.value)} /><button className="btn btn-accent">Add entry</button></>}
        </form>
        {!entries.length && <p className="text-sm text-muted">Nothing here yet. Adding albums and writing entries will fill the timeline.</p>}
        <div className="space-y-2">{entries.slice(0, shown).map((e) => (
          <div key={e.id} className="card group flex gap-3 p-4">
            <div className={cn('w-1 shrink-0 rounded-full', e.type === 'entry' ? 'bg-accent' : 'bg-muted')} />
            <div className="min-w-0 flex-1"><div className="flex items-center gap-3 text-xs text-muted"><span>{new Date(e.timestamp).toLocaleString()}</span><span className="uppercase tracking-wider">{e.type}</span>
              <button className="ml-auto opacity-0 hover:text-bad group-hover:opacity-100" aria-label="Delete entry" onClick={() => confirm('Delete this entry?') && remove('timeline', e.id)}><Trash2 size={13} /></button></div>
              <div className="mt-0.5 text-sm font-semibold">{e.title}</div>{e.description && <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted">{e.description}</p>}</div>
          </div>))}</div>
        {shown < entries.length && <button className="btn" onClick={() => setShown(shown + 15)}>Show more</button>}
      </section>
    </div>
  );
}
