import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { resolveEntity } from '../lib/entities.ts';
import { useLibrary } from '../lib/derive.ts';
import { useEditor } from '../lib/editor.ts';

export function BiosPage() {
  const lib = useLibrary();
  const edit = useEditor((s) => s.open);
  return (
    <div className="space-y-5">
      <div className="flex items-center"><h1 className="mr-auto text-2xl font-bold">Relational bios <span className="text-base font-normal text-muted">{lib.groups.length}</span></h1>
        <button className="btn btn-accent" onClick={() => edit({ kind: 'new-bio', id: '' })}><Plus size={15} />New bio</button></div>
      <div className="grid gap-3 md:grid-cols-2">{lib.groups.map((g) => (
        <button key={g.id} className="card space-y-2 p-4 text-left hover:bg-raised/50" onClick={() => edit({ kind: 'bio', id: g.id })}>
          <div className="flex items-center justify-between"><span className="font-semibold">{g.name}</span><span className="chip">{g.type}</span></div>
          {g.description && <p className="line-clamp-3 text-sm text-muted">{g.description}</p>}
          <div className="flex flex-wrap gap-1.5">{g.members.map((m, i) => { const r = resolveEntity(lib, m.entityType, m.entityId); return r && <span key={i} className="chip">{r.label}</span>; })}</div>
        </button>))}</div>
      {!lib.groups.length && <p className="text-sm text-muted">No bios yet. Start one here or with the + on an artist or album page. <Link to="/albums" className="underline">Browse albums</Link></p>}
    </div>
  );
}
