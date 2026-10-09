import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, Disc3, Home, ListMusic, Network, ListOrdered, Music2, Search, Settings, Swords, Users } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/cn.ts';
import { useStore } from '../lib/store.ts';
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
  { to: '/settings', label: 'Settings', icon: Settings },
];

function SyncDot() {
  const { state, error } = useStore((s) => s.sync);
  const color = { idle: 'bg-good', syncing: 'bg-warn animate-pulse', offline: 'bg-muted', error: 'bg-bad', unconfigured: 'bg-muted' }[state];
  const text = { idle: 'Synced', syncing: 'Syncing…', offline: 'Offline', error: error ?? 'Sync error', unconfigured: 'Local only' }[state];
  return <div className="flex items-center gap-2 px-3 text-xs text-muted md:px-3" title={error ?? ""}><span className={cn('h-2 w-2 rounded-full', color)} />{text}</div>;
}

export function Layout() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
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
            </div>
          </form>
          <div className="mx-auto max-w-6xl p-4 md:p-6"><Outlet /></div>
        </main>
      </div>
      <PlayerBar />
      <EditorHost />
      <nav className="flex border-t border-line bg-surface md:hidden">
        {NAV.filter((n) => !['/playlists', '/stats', '/queue', '/bios'].includes(n.to)).map(({ to, label, icon: Icon, ...rest }) => (
          <NavLink key={to} to={to} end={'end' in rest} className={({ isActive }) => cn('flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] text-muted', isActive && 'text-accent')}>
            <Icon size={20} />{label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
