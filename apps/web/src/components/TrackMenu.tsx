import { Info, ListEnd, ListPlus, ListStart, Pencil, Play, Plus, Minus, Disc3, User } from 'lucide-react';
import type { Track } from '../lib/derive.ts';
import type { EditTarget } from '../lib/editor.ts';
import { useEditor } from '../lib/editor.ts';
import { usePlayer } from '../lib/player.ts';
import { useStore } from '../lib/store.ts';
import type { MenuItem } from './Menu.tsx';

/** The per-track menu (the old right-click menu) as menu items; shown by useMenu()/ContextMenu. */
export function useTrackMenuItems() {
  const edit = useEditor((s) => s.open);
  const enqueue = usePlayer((s) => s.enqueue);
  const patch = useStore((s) => s.patch);
  return (t: Track, onPlay: () => void): MenuItem[] => {
    const memories = t.memories ?? 0;
    const open = (target: EditTarget) => () => edit(target);
    return [
      { label: 'Play', icon: <Play size={15} />, run: onPlay, disabled: !t.file },
      { label: 'Play next', icon: <ListStart size={15} />, run: () => enqueue(t.id, 'next'), disabled: !t.file },
      { label: 'Add to queue', icon: <ListEnd size={15} />, run: () => enqueue(t.id, 'last'), disabled: !t.file },
      { label: 'Add to playlist…', icon: <ListPlus size={15} />, run: open({ kind: 'add-to-playlist', id: t.id }) },
      ...(t.albumId ? [] : [{ label: 'Add to album…', icon: <Disc3 size={15} />, run: open({ kind: 'add-to-album', id: t.id }) }]),
      { separator: true },
      { label: `Add memory (${memories})`, icon: <Plus size={15} />, run: () => patch('tracks', t.id, { memories: memories + 1 }) },
      { label: 'Remove a memory', icon: <Minus size={15} />, run: () => patch('tracks', t.id, { memories: Math.max(0, memories - 1) }), disabled: memories < 1 },
      { separator: true },
      ...t.leads.map((l) => ({ label: `Go to ${l.name}`, icon: <User size={15} />, to: `/artists/${l.id}` })),
      { label: 'Details', icon: <Info size={15} />, run: open({ kind: 'track-details', id: t.id }) },
      { label: 'Edit…', icon: <Pencil size={15} />, run: open({ kind: 'track', id: t.id }) },
    ];
  };
}
