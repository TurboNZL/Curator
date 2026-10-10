import { Link } from 'react-router-dom';
import { Disc3, Layers, Music2, Pencil, Plus, User } from 'lucide-react';
import { biosFor, resolveEntity, type EntityType } from '../lib/entities.ts';
import type { Library } from '../lib/derive.ts';
import { useEditor } from '../lib/editor.ts';

const ICON = { artist: User, album: Disc3, track: Music2, release: Disc3, era: Layers } as const;

/** The "relational bios" that mention an entity, with a + to start a new bio linked to it. */
export function Bios({ lib, type, id }: { lib: Library; type: EntityType; id: string }) {
  const edit = useEditor((s) => s.open);
  const bios = biosFor(lib, type, id);
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2"><h2 className="text-lg font-semibold">Relational bios</h2>
        <button className="btn btn-ghost !p-1.5" aria-label="New relational bio" onClick={() => edit({ kind: 'new-bio', id: `${type}:${id}` })}><Plus size={16} /></button></div>
      {!bios.length && <p className="text-sm text-muted">None yet. Bios connect artists, albums and tracks that belong together (a feud, a collective, an era).</p>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">{bios.map((g) => (
        <div key={g.id} className="card space-y-2 p-4">
          <div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{g.name}</h3>
            <button className="text-muted hover:text-fg" aria-label={`Edit ${g.name}`} onClick={() => edit({ kind: 'bio', id: g.id })}><Pencil size={14} /></button></div>
          <span className="chip">{g.type}</span>
          {g.description && <p className="text-sm text-muted">{g.description}</p>}
          <div className="flex flex-wrap gap-1.5 pt-1">{g.members.filter((m) => !(m.entityType === type && m.entityId === id) && m.showOnEntityPage).map((m, i) => {
            const r = resolveEntity(lib, m.entityType, m.entityId);
            if (!r) return null;
            const Icon = ICON[r.type];
            const body = <><Icon size={11} />{r.label}</>;
            return r.to ? <Link key={i} to={r.to} className="chip gap-1 hover:text-fg">{body}</Link> : <span key={i} className="chip gap-1">{body}</span>;
          })}</div>
        </div>))}</div>
    </section>
  );
}
