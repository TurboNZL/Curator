"use client";

import { NavLink } from 'react-router-dom';
import { Disc, FileAudio, ListMusic, Mic2, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SpeedDial } from '../ui/SpeedDial';

const navItems = [
  { icon: LayoutDashboard, label: 'Journal', href: '/' },
  { icon: Mic2, label: 'Artists', href: '/artists' },
  { icon: Disc, label: 'Albums', href: '/albums' },
  { icon: ListMusic, label: 'Tracks', href: '/tracks' },
  { icon: ListMusic, label: 'Playlists', href: '/playlists' },
];

export const Sidebar = () => {
  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-[calc(100vh-6rem)] relative z-40">
      <div className="p-6">
        <h1 className="text-xl font-black tracking-tighter text-white uppercase">Curator</h1>
      </div>
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs font-black uppercase tracking-widest",
              isActive
                ? "bg-zinc-900 text-blue-500 shadow-lg shadow-blue-500/5"
                : "text-zinc-500 hover:text-white hover:bg-zinc-900/50"
            )}
          >
            <item.icon size={16} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-6 border-t border-zinc-900">
        <SpeedDial />
      </div>
    </aside>
  );
};