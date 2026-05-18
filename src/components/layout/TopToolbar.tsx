"use client";

import { useMusicStore } from '@/store/useMusicStore';
import { Settings as SettingsIcon, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { SearchInput } from '../ui/SearchInput'; // New component import

export const TopToolbar = () => {
  const { activeProfile } = useMusicStore();

  return (
    <header className="flex items-center justify-between px-8 py-4 bg-zinc-950 border-b border-zinc-800 shrink-0">
      <div className="flex items-center gap-4">
        {/* Placeholder for future menu toggle */}
        {/* <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-white">
          <Menu size={18} />
        </Button> */}
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wide">
          <Link to="/">Journal</Link>
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <SearchInput /> {/* Integrated SearchInput */}
        <Button asChild variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-white">
          <Link to="/settings">
            <SettingsIcon size={18} />
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: activeProfile.accentColor }}
          >
            {activeProfile.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};