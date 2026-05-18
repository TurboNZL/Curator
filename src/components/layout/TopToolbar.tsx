"use client";

import { Search, BookOpen, Trash2, BarChart3, ListOrdered, Settings, User, Download, Music, Disc, UserCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useMusicStore } from '@/store/useMusicStore';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useRef } from 'react';
import { ImportAlbumModal } from '@/components/modals/ImportAlbumModal';

export const TopToolbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeProfile, updateSettings, tracks, artists, albums, playlists } = useMusicStore();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = searchQuery.length > 1 ? {
    tracks: tracks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3),
    artists: artists.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3),
    albums: albums.filter(al => al.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3),
    playlists: playlists.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3),
  } : null;

  const hasResults = searchResults && (
    searchResults.tracks.length > 0 ||
    searchResults.artists.length > 0 ||
    searchResults.albums.length > 0 ||
    searchResults.playlists.length > 0
  );

  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950 flex items-center px-6 justify-between gap-4 z-50">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 border-r border-zinc-800 pr-6">
          <ToolbarTab
            icon={BookOpen}
            label="Journal"
            active={location.pathname === '/'}
            onClick={() => navigate('/')}
          />
          <ToolbarTab
            icon={Trash2}
            label="Cleanup"
            active={location.pathname === '/cleanup'}
            onClick={() => navigate('/cleanup')}
          />
          <ToolbarTab
            icon={BarChart3}
            label="Stats"
            active={location.pathname === '/stats'}
            onClick={() => navigate('/stats')}
          />
          <ToolbarTab
            icon={ListOrdered}
            label="Queue"
            active={location.pathname === '/queue'}
            onClick={() => navigate('/queue')}
          />
          <ToolbarTab
            icon={Download}
            label="Import"
            onClick={() => setIsImportModalOpen(true)}
          />
        </div>
        
        <div className="relative w-96" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <Input
            placeholder="Search catalog..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            onFocus={() => setShowSearchDropdown(true)}
            className="pl-10 bg-zinc-900 border-zinc-800 text-zinc-200 h-9 rounded-full focus-visible:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setShowSearchDropdown(false);
                navigate(`/search?q=${searchQuery}`);
              }
            }}
          />

          {showSearchDropdown && hasResults && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[400px] overflow-y-auto">
              {searchResults.artists.length > 0 && (
                <div className="p-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-3 py-1">Artists</p>
                  {searchResults.artists.map(artist => (
                    <button
                      key={artist.id}
                      onClick={() => {
                        navigate(`/artists/${artist.id}`);
                        setShowSearchDropdown(false);
                      }}
                      className="w-full flex items-center gap-3 p-2 hover:bg-zinc-900 rounded-xl transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center">
                        {artist.image ? <img src={artist.image} className="w-full h-full object-cover" /> : <UserCircle size={16} className="text-zinc-600" />}
                      </div>
                      <span className="text-xs font-bold text-white">{artist.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchResults.albums.length > 0 && (
                <div className="p-2 border-t border-zinc-900">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-3 py-1">Albums</p>
                  {searchResults.albums.map(album => (
                    <button
                      key={album.id}
                      onClick={() => {
                        navigate(`/albums/${album.id}`);
                        setShowSearchDropdown(false);
                      }}
                      className="w-full flex items-center gap-3 p-2 hover:bg-zinc-900 rounded-xl transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded bg-zinc-800 overflow-hidden flex items-center justify-center">
                        {album.covers?.[0] ? <img src={album.covers[0]} className="w-full h-full object-cover" /> : <Disc size={16} className="text-zinc-600" />}
                      </div>
                      <span className="text-xs font-bold text-white">{album.title}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchResults.tracks.length > 0 && (
                <div className="p-2 border-t border-zinc-900">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-3 py-1">Tracks</p>
                  {searchResults.tracks.map(track => (
                    <button
                      key={track.id}
                      onClick={() => {
                        navigate(`/tracks?search=${track.title}`);
                        setShowSearchDropdown(false);
                      }}
                      className="w-full flex items-center gap-3 p-2 hover:bg-zinc-900 rounded-xl transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded bg-zinc-900 flex items-center justify-center">
                        <Music size={14} className="text-zinc-600" />
                      </div>
                      <span className="text-xs font-bold text-white">{track.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border border-zinc-700 hover:ring-2 ring-blue-500/50 transition-all" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-zinc-950 border-zinc-800 text-white">
            <DropdownMenuLabel className="flex items-center gap-2">
              <User size={14} />
              <span className="uppercase tracking-widest text-[10px] font-black">{activeProfile.name}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold">Unbalanced First</Label>
                  <p className="text-[10px] text-zinc-500">Show yellow stars as primary</p>
                </div>
                <Switch
                  checked={activeProfile.settings?.showUnbalancedFirst}
                  onCheckedChange={(val) => updateSettings({ showUnbalancedFirst: val })}
                />
              </div>
            </div>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem
              onClick={() => navigate('/settings')}
              className="text-xs font-bold uppercase tracking-widest focus:bg-zinc-900 focus:text-blue-400 cursor-pointer"
            >
              <Settings size={14} className="mr-2" /> Profile Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ImportAlbumModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
      />
    </header>
  );
};

const ToolbarTab = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-1 group"
  >
    <Icon 
      size={18} 
      className={cn(
        "transition-colors",
        active ? "text-white" : "text-zinc-500 group-hover:text-white"
      )} 
    />
    <span className={cn(
      "text-[10px] uppercase tracking-wider font-bold transition-colors",
      active ? "text-blue-500" : "text-zinc-600 group-hover:text-zinc-400"
    )}>
      {label}
    </span>
  </button>
);