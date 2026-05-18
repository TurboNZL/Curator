"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Disc, Music, User, ListMusic, Loader2 } from 'lucide-react';
import { useMusicStore } from '@/store/useMusicStore';
import { Link, useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useDebounce } from 'use-debounce';

export const SearchInput = () => {
  const { artists, albums, tracks, playlists } = useMusicStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const allEntities = useMemo(() => ([
    ...artists.map(e => ({ ...e, type: 'artist', display: e.name, image: e.image, link: `/artists/${e.id}` })),
    ...albums.map(e => ({ ...e, type: 'album', display: e.title, image: e.covers[0], link: `/albums/${e.id}` })),
    ...tracks.map(e => ({ ...e, type: 'track', display: e.title, image: albums.find(a => e.albumIds.includes(a.id))?.covers[0], link: `/tracks` })), // Tracks don't have individual pages
    ...playlists.map(e => ({ ...e, type: 'playlist', display: e.name, image: e.coverImage, link: `/playlists` })), // Playlists don't have individual pages, but can edit from list
  ]), [artists, albums, tracks, playlists]);

  const filteredResults = useMemo(() => {
    if (!debouncedSearchTerm) return [];
    const lowerSearch = debouncedSearchTerm.toLowerCase();
    
    // Prioritize exact matches and starts-with
    const exactMatches = allEntities.filter(e => e.display.toLowerCase() === lowerSearch);
    const startsWithMatches = allEntities.filter(e => e.display.toLowerCase().startsWith(lowerSearch) && !exactMatches.includes(e));
    const containsMatches = allEntities.filter(e => e.display.toLowerCase().includes(lowerSearch) && !exactMatches.includes(e) && !startsWithMatches.includes(e));

    return [...exactMatches, ...startsWithMatches, ...containsMatches].slice(0, 10);
  }, [allEntities, debouncedSearchTerm]);

  const handleSelectResult = useCallback((entity: any) => {
    setSearchTerm('');
    setIsOpen(false);
    navigate(entity.link);
  }, [navigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (filteredResults.length > 0) {
        handleSelectResult(filteredResults[0]);
      } else if (searchTerm) {
        // If no results in dropdown but there's a search term, go to general search results
        setIsOpen(false);
        navigate(`/search?query=${encodeURIComponent(searchTerm)}`);
      }
    }
  }, [filteredResults, handleSelectResult, searchTerm, navigate]);

  const handleSearchSubmit = useCallback(() => {
    if (searchTerm) {
      setIsOpen(false);
      navigate(`/search?query=${encodeURIComponent(searchTerm)}`);
    }
  }, [searchTerm, navigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsOpen(debouncedSearchTerm.length > 0);
  }, [debouncedSearchTerm]);

  return (
    <div className="relative w-80" ref={searchRef}>
      <Search 
        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 cursor-pointer" 
        size={16} 
        onClick={handleSearchSubmit}
      />
      <Input
        className="bg-zinc-900/50 border-none rounded-full pl-10 pr-4 text-sm focus-visible:ring-1 focus-visible:ring-blue-500 text-white h-9"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => debouncedSearchTerm.length > 0 && setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-zinc-950 border border-zinc-800 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {filteredResults.length > 0 ? (
            <ScrollArea className="h-full">
              {filteredResults.map(entity => (
                <Link
                  key={`${entity.type}-${entity.id}`}
                  to={entity.link}
                  onClick={() => handleSelectResult(entity)}
                  className="flex items-center gap-3 p-3 hover:bg-zinc-900 transition-colors"
                >
                  <img
                    src={entity.image || '/placeholder.svg'}
                    alt={entity.display}
                    className="w-8 h-8 object-cover rounded-md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{entity.display}</p>
                    <p className="text-xs text-zinc-500 capitalize">{entity.type}</p>
                  </div>
                  {entity.type === 'artist' && <User size={14} className="text-zinc-600" />}
                  {entity.type === 'album' && <Disc size={14} className="text-zinc-600" />}
                  {entity.type === 'track' && <Music size={14} className="text-zinc-600" />}
                  {entity.type === 'playlist' && <ListMusic size={14} className="text-zinc-600" />}
                </Link>
              ))}
            </ScrollArea>
          ) : (
            <div className="p-4 text-center text-zinc-500 text-sm">
              No results for "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};