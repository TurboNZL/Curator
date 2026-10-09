import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Heart, Info, ListEnd, ListPlus, ListStart, Pencil, Play, Plus, Minus } from 'lucide-react';
import type { Track } from '../lib/derive.ts';
import { useEditor } from '../lib/editor.ts';
import { usePlayer } from '../lib/player.ts';
import { useStore } from '../lib/store.ts';

export interface MenuAt { track: Track; x: number; y: number }

/** The per-track menu (the old right-click menu). Rendered in a portal so tables that clip their content cannot cut it off. */
export function TrackMenu({ at, onClose, onPlay }: { at: MenuAt; onClose: () => void; onPlay: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: at.x, top: at.y });
  const edit = useEditor((s) => s.open);
  const enqueue = usePlayer((s) => s.enqueue);
  const patch = useStore((s) => s.patch);
  const t = at.track;

  // keep the menu on screen
  useLayoutEffect(() => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ left: Math.max(8, Math.min(at.x, window.innerWidth - r.width - 8)), top: Math.max(8, Math.min(at.y, window.innerHeight - r.height - 8)) });
  }, [at.x, at.y]);
  useEffect(() => {
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('mousedown', down); window.addEventListener('keydown', key); window.addEventListener('scroll', onClose, true); window.addEventListener('resize', onClose);
    return () => { window.removeEventListener('mousedown', down); window.removeEventListener('keydown', key); window.removeEventListener('scroll', onClose, true); window.removeEventListener('resize', onClose); };
  }, [onClose]);

  const item = (icon: React.ReactNode, label: string, run: () => void, disabled = false) => (
    <button role="menuitem" disabled={disabled} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-raised disabled:opacity-40 disabled:hover:bg-transparent"
      onClick={() => { run(); onClose(); }}>{icon}{label}</button>
  );
  const memories = t.memories ?? 0;
  return createPortal(
    <div ref={ref} role="menu" aria-label={`Actions for ${t.title}`} className="card fixed z-[60] w-56 overflow-hidden py-1 shadow-2xl" style={pos}>
      {item(<Play size={15} />, 'Play', onPlay, !t.file)}
      {item(<ListStart size={15} />, 'Play next', () => enqueue(t.id, 'next'), !t.file)}
      {item(<ListEnd size={15} />, 'Add to queue', () => enqueue(t.id, 'last'), !t.file)}
      {item(<ListPlus size={15} />, 'Add to playlist…', () => edit({ kind: 'add-to-playlist', id: t.id }))}
      {item(<Heart size={15} fill={t.isFavorite ? 'currentColor' : 'none'} />, t.isFavorite ? 'Remove favourite' : 'Favourite', () => patch('tracks', t.id, { isFavorite: !t.isFavorite }))}
      <div className="my-1 border-t border-line/60" />
      {item(<Plus size={15} />, `Add memory (${memories})`, () => patch('tracks', t.id, { memories: memories + 1 }))}
      {item(<Minus size={15} />, 'Remove a memory', () => patch('tracks', t.id, { memories: Math.max(0, memories - 1) }), memories < 1)}
      <div className="my-1 border-t border-line/60" />
      {item(<Info size={15} />, 'Details', () => edit({ kind: 'track-details', id: t.id }))}
      {item(<Pencil size={15} />, 'Edit…', () => edit({ kind: 'track', id: t.id }))}
    </div>, document.body);
}
