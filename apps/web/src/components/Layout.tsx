import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, Stethoscope, Disc3, Download, FileAudio, Home, ListMusic, MoreHorizontal, Network, ListOrdered, Music2, Plus, Search, Settings, Swords, User, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePlayer } from '../lib/player.ts';
import { cn } from '../lib/cn.ts';
import { useStore } from '../lib/store.ts';
import { useEditor, type EditTarget } from '../lib/editor.ts';
import { EditorHost } from './EditorHost.tsx';
import { PlayerBar } from './PlayerBar.tsx';

const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/albums', label: 'Albums', icon: Disc3 },
  { to: '/artists', label: 'Artists', icon: Users },
  { to: '/tracks', label: 'Tracks', icon: Music2 },
  { to: '/vote', label: 'Rank', icon: Swords },
  { to: '/playlists', label: 'Playlists', icon: ListMusic },
  { to: '/queue', label: 'Queue', icon: ListOrdered },
  { to: '/bios', label: 'Bios', icon: Network },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
  { to: '/health', label: 'Health', icon: Stethoscope },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function SyncDot() {
  const { state, error } = useStore((s) => s.sync);
  const color = { idle: 'bg-good', syncing: 'bg-warn animate-pulse', offline: 'bg-muted', error: 'bg-bad', unconfigured: 'bg-muted' }[state];
  const text = { idle: 'Synced', syncing: 'Syncing…', offline: 'Offline', error: error ?? 'Sync error', unconfigured: 'Local only' }[state];
  return <div className="flex items-center gap-2 px-3 text-xs text-muted md:px-3" title={error ?? ""}><span className={cn('h-2 w-2 rounded-full', color)} />{text}</div>;
}

const MOBILE_HIDDEN = ['/playlists', '/stats', '/queue', '/bios', '/health', '/settings'];

const ADD: { label: string; icon: typeof Plus; target: EditTarget }[] = [
  { label: 'Import album from YouTube', icon: Download, target: { kind: 'import', id: '' } },
  { label: 'Add audio files', icon: FileAudio, target: { kind: 'upload', id: '' } },
  { label: 'New album', icon: Disc3, target: { kind: 'new-album', id: '' } },
  { label: 'New track', icon: Music2, target: { kind: 'new-track', id: '' } },
  { label: 'New artist', icon: User, target: { kind: 'new-artist', id: '' } },
  { label: 'New playlist', icon: ListMusic, target: { kind: 'new-playlist', id: '' } },
];

/** One place to add anything, reachable on every page and on a phone. */
function AddMenu() {
  const [open, setOpen] = useState(false);
  const edit = useEditor((s) => s.open);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);
  return (
    <div className="relative">
      <button type="button" className="btn btn-accent" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}><Plus size={16} /><span className="hidden sm:inline">Add</span></button>
      {open && <>
        <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
        <div role="menu" className="card absolute right-0 z-30 mt-2 w-64 overflow-hidden py-1 shadow-2xl">
          {ADD.map(({ label, icon: Icon, target }) => (
            <button key={label} role="menuitem" className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-raised" onClick={() => { setOpen(false); edit(target); }}><Icon size={16} />{label}</button>))}
        </div></>}
    </div>
  );
}

/** Phone-only: the pages that do not fit in the bottom bar. */
function MoreMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex flex-1">
      <button type="button" className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] text-muted" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}><MoreHorizontal size={20} />More</button>
      {open && <>
        <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
        <div role="menu" className="card absolute bottom-full right-0 z-30 mb-2 w-48 overflow-hidden py-1 shadow-2xl">
          {NAV.filter((n) => MOBILE_HIDDEN.includes(n.to)).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-raised"><Icon size={16} />{label}</NavLink>))}
        </div></>}
    </div>
  );
}

export function Layout() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const toggle = usePlayer((s) => s.toggle);
  // space = play/pause, unless typing in a field or pressing a button
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.code !== 'Space' || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(el.tagName) || el.isContentEditable) return;
      e.preventDefault(); toggle();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [toggle]);
  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r border-line bg-surface p-3 md:flex">
          <div className="mb-3 px-3 pt-1 text-lg font-bold tracking-tight">Curator</div>
          {NAV.map(({ to, label, icon: Icon, ...rest }) => (
            <NavLink key={to} to={to} end={'end' in rest} className={({ isActive }) => cn('flex items-center gap-3 rounded-theme px-3 py-2 text-sm font-medium text-muted hover:bg-raised hover:text-fg', isActive && 'bg-raised text-fg')}>
              <Icon size={18} />{label}
            </NavLink>
          ))}
          <div className="mt-auto"><SyncDot /></div>
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <form className="sticky top-0 z-10 border-b border-line bg-bg/90 p-3 backdrop-blur" onSubmit={(e) => { e.preventDefault(); if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`); }}>
            <div className="relative mx-auto flex max-w-3xl items-center gap-3">
              <div className="md:hidden"><SyncDot /></div>
              <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input className="input pl-9" placeholder="Search tracks, albums, artists" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <AddMenu />
            </div>
          </form>
          <div className="mx-auto max-w-6xl p-4 md:p-6"><Outlet /></div>
        </main>
      </div>
      <PlayerBar />
      <EditorHost />
      <nav className="flex border-t border-line bg-surface md:hidden">
        {NAV.filter((n) => !MOBILE_HIDDEN.includes(n.to)).map(({ to, label, icon: Icon, ...rest }) => (
          <NavLink key={to} to={to} end={'end' in rest} className={({ isActive }) => cn('flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] text-muted', isActive && 'text-accent')}>
            <Icon size={20} />{label}
          </NavLink>
        ))}
        <MoreMenu />
      </nav>
    </div>
  );
}
