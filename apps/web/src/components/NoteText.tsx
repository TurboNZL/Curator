import { Link } from 'react-router-dom';
import { noteParts, type EntityRef } from '../lib/entities.ts';
import type { Library } from '../lib/derive.ts';
import { Cover } from './Cover.tsx';

/** One embedded thing as a chip with its picture (the note's own page). */
export function ThingChip({ r }: { r: EntityRef }) {
  const body = <>
    <Cover hash={r.image} seed={r.label} kind={r.type === 'artist' ? 'artist' : 'album'} className="!h-6 !w-6 shrink-0" />
    <span className="min-w-0 truncate">{r.label}</span>
    <span className="text-[10px] uppercase tracking-wide text-muted">{r.type}</span>
  </>;
  const cls = 'mx-0.5 inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-raised py-0.5 pl-0.5 pr-2.5 align-middle text-sm no-underline';
  return r.to ? <Link to={r.to} className={`${cls} hover:border-accent`}>{body}</Link> : <span className={cls}>{body}</span>;
}

/**
 * A note's text. `rich` (the note's own page) draws embedded things as chips with their picture; otherwise they read as
 * "ARTIST · Name" (cards, lists), so the text stays plain and short wherever space is tight.
 */
export function NoteText({ lib, text, rich }: { lib: Library; text: string; rich?: boolean }) {
  return <>{noteParts(lib, text).map((p, i) => {
    if ('text' in p) return <span key={i}>{p.text}</span>;
    if (!p.ref) return <span key={i} className="text-muted line-through">{p.type} removed</span>;
    return rich ? <ThingChip key={i} r={p.ref} /> : <span key={i} className="font-medium text-fg"><span className="text-[0.7em] uppercase tracking-wide">{p.type}</span> · {p.ref.label}</span>;
  })}</>;
}
