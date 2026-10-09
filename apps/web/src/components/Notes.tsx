import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { NoteData } from '@curator/core';
import type { Library } from '../lib/derive.ts';
import { useStore } from '../lib/store.ts';

/** Free-text notes attached to one entity. Edits save as you leave the field. */
export function Notes({ lib, type, id }: { lib: Library; type: string; id: string }) {
  const { put, patch, remove } = useStore();
  const notes = lib.notes.filter((n) => n.entityType === type && n.entityId === id).sort((a, b) => a.createdAt - b.createdAt);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [content, setContent] = useState('');
  const save = () => {
    if (!content.trim() && !label.trim()) { setAdding(false); return; }
    const data: NoteData = { entityType: type, entityId: id, label: label.trim() || 'Note', content: content.trim(), isLinked: false, createdAt: Date.now() };
    put('notes', data); setAdding(false); setLabel(''); setContent('');
  };
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2"><h2 className="text-lg font-semibold">Notes</h2>
        <button className="btn btn-ghost !p-1.5" aria-label="Add note" onClick={() => setAdding(true)}><Plus size={16} /></button></div>
      {!notes.length && !adding && <p className="text-sm text-muted">No notes.</p>}
      {notes.map((n) => (
        <div key={n.id} className="card space-y-1 p-4">
          <div className="flex items-center gap-2"><input className="flex-1 bg-transparent text-sm font-semibold outline-none" defaultValue={n.label} aria-label="Note title" onBlur={(e) => e.target.value !== n.label && patch('notes', n.id, { label: e.target.value })} />
            <button className="text-muted hover:text-bad" aria-label="Delete note" onClick={() => confirm('Delete this note?') && remove('notes', n.id)}><Trash2 size={14} /></button></div>
          <textarea className="w-full resize-y bg-transparent text-sm text-muted outline-none" rows={Math.max(2, n.content.split('\n').length)} defaultValue={n.content} aria-label="Note text" onBlur={(e) => e.target.value !== n.content && patch('notes', n.id, { content: e.target.value })} />
        </div>))}
      {adding && <div className="card space-y-2 p-4"><input autoFocus className="input" placeholder="Title" value={label} onChange={(e) => setLabel(e.target.value)} />
        <textarea className="input" rows={3} placeholder="Write something…" value={content} onChange={(e) => setContent(e.target.value)} />
        <div className="flex gap-2"><button className="btn btn-accent" onClick={save}>Save note</button><button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button></div></div>}
    </section>
  );
}
