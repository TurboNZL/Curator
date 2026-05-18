"use client";

import { useMusicStore } from '@/store/useMusicStore';
import { Settings as SettingsIcon, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export const TopToolbar = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const navItems = [
    { label: 'Journal', href: '/' },
    { label: 'Cleanup', href: '/cleanup' },
    { label: 'Stats', href: '/stats' },
    { label: 'Queue', href: '/queue' },
  ];

  return (
    <header className="flex items-center justify-between px-8 py-4 bg-zinc-950 border-b border-zinc-800 shrink-0">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "text-xs font-black uppercase tracking-widest transition-colors",
                location.pathname === item.href 
                  ? "text-white" 
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <form onSubmit={handleSearch} className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search catalog..."
            className="pl-10 bg-zinc-900 border-zinc-800 text-white h-9 rounded-full focus-visible:ring-blue-500"
          />
        </form>
        <Button asChild variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-white">
          <Link to="/settings">
            <SettingsIcon size={18} />
          </Link>
        </Button>
      </div>
    </header>
  );
};