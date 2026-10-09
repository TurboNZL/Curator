import { useState } from 'react';
import { ArrowRight, Plus, X } from 'lucide-react';
import type { PlaybackRule } from '@curator/core';
import { useLibrary } from '../lib/derive.ts';
import { useStore } from '../lib/store.ts';
import { saveDefaultImage, defaultImage, saveRules } from '../lib/profile.ts';
import { ImagePicker, TrackPicker } from './forms.tsx';

/** Every "play B right after A" rule in one place (they can also be set from a track's editor). */
export function PlaybackRules() {
  const lib = useLibrary();
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const title = (id: string) => lib.trackById.get(id)?.title ?? '(deleted track)';
  const setRule = (i: number, change: Partial<PlaybackRule>) => saveRules(lib, lib.rules.map((r, j) => (j === i ? { ...r, ...change } : r)));
  const add = () => {
    if (!a || !b || a === b) return;
    saveRules(lib, [...lib.rules.filter((r) => r.trackAId !== a), { trackAId: a, trackBId: b, playFirstOnShuffle: true, applyToAlbumSource: false }]);
    setA(null); setB(null);
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">When track A plays, track B is queued right after it. {lib.rules.length} rule{lib.rules.length === 1 ? '' : 's'}.</p>
      {lib.rules.map((r, i) => (
        <div key={`${r.trackAId}`} className="space-y-1 rounded-theme border border-line p-3 text-sm">
          <div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate">{title(r.trackAId)}</span><ArrowRight size={14} className="shrink-0 text-muted" /><span className="min-w-0 flex-1 truncate">{title(r.trackBId)}</span>
            <button className="p-1 text-muted hover:text-bad" aria-label="Delete rule" onClick={() => saveRules(lib, lib.rules.filter((_, j) => j !== i))}><X size={15} /></button></div>
          <div className="flex flex-wrap gap-4 text-xs text-muted">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={r.playFirstOnShuffle} onChange={(e) => setRule(i, { playFirstOnShuffle: e.target.checked })} />Keep together when shuffling</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={r.applyToAlbumSource} onChange={(e) => setRule(i, { applyToAlbumSource: e.target.checked })} />Only when playing from an album</label></div>
        </div>))}
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-start">
        <TrackPicker value={a} onChange={setA} /><ArrowRight size={16} className="mt-2.5 hidden text-muted sm:block" /><TrackPicker value={b} onChange={setB} exclude={a ?? undefined} />
        <button className="btn btn-accent" disabled={!a || !b} onClick={add}><Plus size={15} />Add rule</button></div>
    </div>
  );
}

/** Genres and credit roles: add new ones, remove the ones nothing uses. */
export function Vocabulary() {
  const lib = useLibrary();
  const { put, remove } = useStore();
  const [genre, setGenre] = useState('');
  const [role, setRole] = useState('');
  const genreUse = new Map<string, number>(), roleUse = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string) => m.set(k.toLowerCase(), (m.get(k.toLowerCase()) ?? 0) + 1);
  for (const t of lib.tracks) { t.allGenres.forEach((g) => bump(genreUse, g)); t.credits.forEach((c) => c.role.forEach((r) => bump(roleUse, r))); }
  for (const al of lib.albums) { al.genres.forEach((g) => bump(genreUse, g)); al.credits.forEach((c) => c.role.forEach((r) => bump(roleUse, r))); }
  const chips = (rows: { id: string; name: string }[], use: Map<string, number>, table: 'genres' | 'roleCategories') => (
    <div className="flex flex-wrap gap-1.5">{[...rows].sort((x, y) => x.name.localeCompare(y.name)).map((r) => { const n = use.get(r.name.toLowerCase()) ?? 0; return (
      <span key={r.id} className="chip gap-1 !text-fg" title={n ? `Used ${n} time${n === 1 ? '' : 's'}` : 'Not used'}>{r.name}<span className="text-muted">{n}</span>
        {n === 0 && <button aria-label={`Delete ${r.name}`} onClick={() => remove(table, r.id)}><X size={12} /></button>}</span>); })}</div>);
  const add = (table: 'genres' | 'roleCategories', name: string, existing: { name: string }[], reset: () => void) => {
    const n = name.trim();
    if (n && !existing.some((x) => x.name.toLowerCase() === n.toLowerCase())) put(table, table === 'genres' ? { name: n } : { name: n, isRemovable: true });
    reset();
  };
  return (
    <div className="space-y-4">
      <div className="space-y-2"><div className="text-sm font-medium">Genres</div>{chips(lib.genres, genreUse, 'genres')}
        <div className="flex max-w-sm gap-2"><input className="input" placeholder="New genre" value={genre} onChange={(e) => setGenre(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add('genres', genre, lib.genres, () => setGenre(''))} />
          <button className="btn" onClick={() => add('genres', genre, lib.genres, () => setGenre(''))}><Plus size={15} />Add</button></div></div>
      <div className="space-y-2"><div className="text-sm font-medium">Credit roles</div>{chips(lib.roles, roleUse, 'roleCategories')}
        <div className="flex max-w-sm gap-2"><input className="input" placeholder="New role category" value={role} onChange={(e) => setRole(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add('roleCategories', role, lib.roles, () => setRole(''))} />
          <button className="btn" onClick={() => add('roleCategories', role, lib.roles, () => setRole(''))}><Plus size={15} />Add</button></div></div>
      <p className="text-xs text-muted">The number is how many tracks and albums use it. Only unused ones can be deleted.</p>
    </div>
  );
}

/** The picture shown for albums / artists that have none. */
export function DefaultImages() {
  const lib = useLibrary();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2"><div className="text-sm font-medium">Default album cover</div>
        <ImagePicker hash={defaultImage(lib, 'defaultAlbumCover')} onChange={(h) => saveDefaultImage(lib, 'defaultAlbumCover', h)} seed="default album" /></div>
      <div className="space-y-2"><div className="text-sm font-medium">Default artist image</div>
        <ImagePicker kind="artist" hash={defaultImage(lib, 'defaultArtistImage')} onChange={(h) => saveDefaultImage(lib, 'defaultArtistImage', h)} seed="default artist" /></div>
    </div>
  );
}
