"use client";

import { NavLink } from 'react-router-dom';
import { Disc, FileAudio, ListMusic, Mic2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Mic2, label: 'Artists', href: '/artists' },
  { icon: Disc, label: 'Albums', href: '/albums' },
  { icon: ListMusic, label: 'Tracks', href: '/tracks' },
  { icon: ListMusic, label: 'Playlists', href: '/playlists' },
];

export const Sidebar = () => {
  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tighter text-white">CURATOR</h1>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
              isActive 
                ? "bg-zinc-900 text-white" 
                : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
            )}
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};