import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useLibrary } from '../lib/derive.ts';
import { useEditor } from '../lib/editor.ts';
import { cn } from '../lib/cn.ts';
import { NoteCard } from '../components/Notes.tsx';
import { resolveEntity } from '../lib/entities.ts';

/** Every note, with the user's own categories as filters. */
export function NotesPage() {
  const lib = useLibrary();
  const edit = useEditor((s) => s.open);
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const notes = useMemo(() => {
    const n = q.trim().toLowerCase();
    return [...lib.groups]
      .filter((g) => (cat === null || (cat === '' ? !g.categoryId : g.categoryId === cat)))
      .filter((g) => !n || `${g.name} ${g.description ?? ''} ${g.members.map((m) => resolveEntity(lib, m.entityType, m.entityId)?.label ?? '').join(' ')}`.toLowerCase().includes(n))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0) || a.name.localeCompare(b.name));
  }, [lib, cat, q]);
  const used = lib.noteCategories.filter((c) => lib.groups.some((g) => g.categoryId === c.id));
  const chip = (on: boolean) => cn('rounded-full border px-3 py-1 text-sm', on ? 'border-accent text-accent' : 'border-line text-muted hover:text-fg');
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">Notes <span className="text-base font-normal text-muted">{lib.groups.length}</span></h1>
        <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input className="input !w-56 pl-8" placeholder="Search notes" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <button className="btn btn-accent" onClick={() => edit({ kind: 'new-note', id: '' })}><Plus size={15} />New note</button></div>
      {used.length > 0 && <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
        <button className={chip(cat === null)} aria-pressed={cat === null} onClick={() => setCat(null)}>All</button>
        {used.map((c) => <button key={c.id} className={chip(cat === c.id)} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.name}</button>)}
        {lib.groups.some((g) => !g.categoryId) && <button className={chip(cat === '')} aria-pressed={cat === ''} onClick={() => setCat('')}>No category</button>}
      </div>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{notes.map((g) => <NoteCard key={g.id} lib={lib} note={g} />)}</div>
      {!notes.length && <p className="text-sm text-muted">{lib.groups.length ? 'No note matches.' : 'No notes yet. Write one here, or with the + on an artist, album, track or era page. Every note is tied to at least one thing.'}</p>}
    </div>
  );
}
