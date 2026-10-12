import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, GripVertical, Pencil, Save } from 'lucide-react';
import { useLibrary } from '../lib/derive.ts';
import { useEditor } from '../lib/editor.ts';
import { useStore } from '../lib/store.ts';
import { noteToken, resolveEntity } from '../lib/entities.ts';
import { NoteText } from '../components/NoteText.tsx';
import { Cover } from '../components/Cover.tsx';

/**
 * One note, in full. Writing happens here: the things the note is tied to sit in a tray, and a chip can be dragged into the middle of
 * the text (or tapped, to put it where the cursor is). In the text it is stored as {{type:id}}; this page draws it as a chip with its
 * picture, every other place as "ARTIST · Name".
 */
export function NotePage() {
  const { id = '' } = useParams();
  const lib = useLibrary();
  const nav = useNavigate();
  const edit = useEditor((s) => s.open);
  const patch = useStore((s) => s.patch);
  const note = lib.groups.find((g) => g.id === id);
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (note && !writing) setText(note.description ?? ''); }, [note?.description, writing]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!note) return <div className="space-y-3"><button className="btn btn-ghost" onClick={() => nav('/notes')}><ArrowLeft size={15} />Notes</button><p className="text-muted">This note does not exist (any more).</p></div>;
  const category = note.categoryId ? lib.noteCategories.find((c) => c.id === note.categoryId) : undefined;
  const things = note.members.map((m) => resolveEntity(lib, m.entityType, m.entityId)).filter((r): r is NonNullable<typeof r> => !!r);

  /** put a thing into the text where the cursor is (the tap alternative to dragging) */
  const insert = (token: string) => {
    const el = area.current;
    const at = el ? [el.selectionStart, el.selectionEnd] : [text.length, text.length];
    const next = `${text.slice(0, at[0])}${token}${text.slice(at[1])}`;
    setText(next);
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at[0] + token.length, at[0] + token.length); });
  };
  const save = () => { patch('groups', note.id, { description: text.trim() ? text : null }); setWriting(false); };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/notes" className="btn btn-ghost"><ArrowLeft size={15} />Notes</Link>
        <div className="ml-auto flex gap-2">
          <button className="btn" onClick={() => edit({ kind: 'note', id: note.id })}><Pencil size={15} />Title, category, links</button>
          {writing ? <><button className="btn btn-ghost" onClick={() => setWriting(false)}>Cancel</button><button className="btn btn-accent" onClick={save}><Save size={15} />Save text</button></>
            : <button className="btn btn-accent" onClick={() => { setText(note.description ?? ''); setWriting(true); }}><Pencil size={15} />Write</button>}
        </div>
      </div>
      <header className="space-y-1">
        <h1 className="break-words text-2xl font-bold">{note.name}</h1>
        {category && <span className="chip">{category.name}</span>}
      </header>

      {writing && <div className="space-y-2">
        <div className="text-sm text-muted">Drag a thing into the text, or tap it to put it at the cursor.</div>
        <div className="flex flex-wrap gap-2" aria-label="Things this note is tied to">
          {things.map((r) => (
            <button key={`${r.type}${r.id}`} type="button" draggable title={`Drag into the text: ${r.label}`}
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', noteToken(r.type, r.id)); e.dataTransfer.effectAllowed = 'copy'; }}
              onClick={() => insert(noteToken(r.type, r.id))}
              className="inline-flex max-w-full cursor-grab items-center gap-1.5 rounded-full border border-line bg-raised py-0.5 pl-1 pr-2.5 text-sm hover:border-accent active:cursor-grabbing">
              <GripVertical size={12} className="text-muted" />
              <Cover hash={r.image} seed={r.label} kind={r.type === 'artist' ? 'artist' : 'album'} className="!h-6 !w-6 shrink-0" />
              <span className="truncate">{r.label}</span><span className="text-[10px] uppercase tracking-wide text-muted">{r.type}</span>
            </button>))}
        </div>
        <textarea ref={area} onDrop={(e) => { const el = e.currentTarget; requestAnimationFrame(() => el.setSelectionRange(el.selectionEnd, el.selectionEnd)); }} className="input min-h-64 w-full font-[inherit] leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write the note. Dropped things appear as {{artist:…}} here and as chips below." />
        <div className="text-xs text-muted">Preview</div>
      </div>}

      <article className="card whitespace-pre-wrap break-words p-5 leading-relaxed">
        {(writing ? text : note.description) ? <NoteText lib={lib} text={writing ? text : note.description!} rich /> : <span className="text-muted">Nothing written yet. Press Write.</span>}
      </article>

      {!writing && things.length > 0 && <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted">Tied to</h2>
        <div className="flex flex-wrap gap-2">{things.map((r) => <Link key={`${r.type}${r.id}`} to={r.to ?? '#'} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised py-0.5 pl-0.5 pr-2.5 text-sm hover:border-accent">
          <Cover hash={r.image} seed={r.label} kind={r.type === 'artist' ? 'artist' : 'album'} className="!h-6 !w-6 shrink-0" /><span className="truncate">{r.label}</span><span className="text-[10px] uppercase tracking-wide text-muted">{r.type}</span></Link>)}</div>
      </section>}
    </div>
  );
}
