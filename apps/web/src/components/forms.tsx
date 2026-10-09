import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ImagePlus, Plus, X } from 'lucide-react';
import type { ArtistData } from '@curator/core';
import { useLibrary } from '../lib/derive.ts';
import { saveImage } from '../lib/files.ts';
import { useStore } from '../lib/store.ts';
import { Cover } from './Cover.tsx';

export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label={title} className="card flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3"><h2 className="font-semibold">{title}</h2>
          <button className="p-1 text-muted hover:text-fg" aria-label="Close" onClick={onClose}><X size={18} /></button></div>
        <div className="space-y-4 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex items-center gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block space-y-1 text-sm"><span className="text-muted">{label}</span>{children}{hint && <span className="block text-xs text-muted">{hint}</span>}</label>;
}

/** Chips with suggestions from the existing genre list; unknown names are created as genre records on save. */
export function TagInput({ value, onChange, suggestions }: { value: string[]; onChange: (v: string[]) => void; suggestions: string[] }) {
  const [text, setText] = useState('');
  const add = (raw: string) => {
    const v = raw.trim();
    if (v && !value.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...value, suggestions.find((s) => s.toLowerCase() === v.toLowerCase()) ?? v]);
    setText('');
  };
  const options = suggestions.filter((s) => !value.includes(s) && s.toLowerCase().includes(text.toLowerCase())).slice(0, 6);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">{value.map((g) => (
        <span key={g} className="chip gap-1 !text-fg">{g}<button type="button" aria-label={`Remove ${g}`} onClick={() => onChange(value.filter((x) => x !== g))}><X size={12} /></button></span>))}</div>
      <input className="input" placeholder="Add genre, press Enter" value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(text); } }} />
      {text && <div className="flex flex-wrap gap-1.5">{options.map((o) => <button key={o} type="button" className="chip hover:bg-line" onClick={() => add(o)}>{o}</button>)}</div>}
    </div>
  );
}

/** Pick an artist, or create one on the spot. */
export function ArtistSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const lib = useLibrary();
  const put = useStore((s) => s.put);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const create = () => {
    const n = name.trim();
    if (!n) return;
    const existing = lib.artists.find((a) => a.name.toLowerCase() === n.toLowerCase());
    const data: ArtistData = { name: n, image: null };
    onChange(existing?.id ?? put('artists', data));
    setCreating(false); setName('');
  };
  const sorted = [...lib.artists].sort((a, b) => a.name.localeCompare(b.name));
  return creating ? (
    <div className="flex gap-2"><input autoFocus className="input" placeholder="New artist name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); create(); } }} />
      <button type="button" className="btn btn-accent" onClick={create}>Add</button><button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>Cancel</button></div>
  ) : (
    <div className="flex gap-2"><select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      {!lib.artistById.has(value) && <option value={value}>(unknown artist)</option>}
      {sorted.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
      <button type="button" className="btn shrink-0" title="Create a new artist" onClick={() => setCreating(true)}><Plus size={15} />New</button></div>
  );
}

/** Choose / replace an image; the file is resized, hashed and stored locally, then uploaded when a server is available. */
export function ImagePicker({ hash, onChange, seed, kind = 'album' }: { hash: string | null; onChange: (hash: string | null) => void; seed: string; kind?: 'album' | 'artist' }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-4">
      <Cover hash={hash} seed={seed} kind={kind} className="w-24 shrink-0" />
      <div className="space-y-2">
        <div className="flex gap-2">
          <button type="button" className="btn" disabled={busy} onClick={() => input.current?.click()}><ImagePlus size={15} />{busy ? 'Saving…' : hash ? 'Replace' : 'Choose image'}</button>
          {hash && <button type="button" className="btn btn-ghost" onClick={() => onChange(null)}>Remove</button>}
        </div>
        {err && <div className="text-xs text-bad">{err}</div>}
        <input ref={input} type="file" accept="image/*" hidden onChange={async (e) => {
          const f = e.target.files?.[0]; e.target.value = '';
          if (!f) return;
          setBusy(true); setErr(null);
          try { onChange(await saveImage(f)); } catch { setErr('Could not read that image.'); } finally { setBusy(false); }
        }} />
      </div>
    </div>
  );
}

/** Search-and-pick a track (for playback rules). */
export function TrackPicker({ value, onChange, exclude }: { value: string | null; onChange: (id: string | null) => void; exclude?: string }) {
  const lib = useLibrary();
  const [q, setQ] = useState('');
  const chosen = value ? lib.trackById.get(value) : null;
  const matches = q.length > 1 ? lib.tracks.filter((t) => t.id !== exclude && `${t.title} ${t.artistName}`.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
  if (chosen) return <div className="flex items-center gap-2 rounded-theme bg-raised px-3 py-2 text-sm"><span className="min-w-0 flex-1 truncate">{chosen.title} <span className="text-muted">· {chosen.artistName}</span></span>
    <button type="button" className="text-muted hover:text-fg" aria-label="Clear" onClick={() => onChange(null)}><X size={15} /></button></div>;
  return <div className="relative"><input className="input" placeholder="Search for a track…" value={q} onChange={(e) => setQ(e.target.value)} />
    {matches.length > 0 && <div className="card absolute z-10 mt-1 w-full overflow-hidden shadow-xl">{matches.map((t) => (
      <button key={t.id} type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-raised" onClick={() => { onChange(t.id); setQ(''); }}>{t.title} <span className="text-muted">· {t.artistName}</span></button>))}</div>}</div>;
}
