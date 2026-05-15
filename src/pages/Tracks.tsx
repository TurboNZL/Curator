"use client";

import { useEffect, useState, useMemo } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ListMusic, ArrowUpDown, Brain, Calendar, SortAsc, SortDesc } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { EditTrackModal } from '@/components/modals/EditTrackModal';
import { Rating } from '@/components/ui/Rating';
import { TrackContextMenu } from '@/components/ui/TrackContextMenu';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const Tracks = () => {
  const { tracks, artists, albums, setCurrentTrack, fetchData } = useMusicStore();
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ field: 'title', direction: 'asc' as 'asc' | 'desc' });

  useEffect(() => {
    fetchData();
  }, []);

  const filteredTracks = useMemo(() => {
    return tracks.filter(t => 
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      artists.find(a => a.id === t.artistId)?.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [tracks, search, artists]);

  const sortedTracks = useMemo(() => {
    return [...filteredTracks].sort((a, b) => {
      let comparison = 0;
      if (sortConfig.field === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortConfig.field === 'memories') {
        comparison = (a.memories || 0) - (b.memories || 0);
      } else if (sortConfig.field === 'rating') {
        comparison = (a.rating || 0) - (b.rating || 0);
      }
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredTracks, sortConfig]);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Global Tracks</h1>
          <p className="text-zinc-500 text-sm mt-1">Every indexed file in your local curation database.</p>
        </div>
      </div>

      <div className="flex items-center gap-4 py-4 border-y border-zinc-900">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
          <Input 
            className="bg-zinc-900/50 border-none rounded-lg pl-10 text-sm focus-visible:ring-1 focus-visible:ring-blue-500 text-white" 
            placeholder="Search by title, artist, or genre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-zinc-800 bg-zinc-900/50 text-xs font-bold gap-2">
              <ArrowUpDown size={14} /> Sort: {sortConfig.field}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-white">
            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Sort By</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setSortConfig({ ...sortConfig, field: 'title' })} className="text-xs font-bold gap-2">
              <ListMusic size={14} /> Title
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortConfig({ ...sortConfig, field: 'memories' })} className="text-xs font-bold gap-2">
              <Brain size={14} /> Memories
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortConfig({ ...sortConfig, field: 'rating' })} className="text-xs font-bold gap-2">
              <Calendar size={14} /> Rating
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem onClick={() => setSortConfig({ ...sortConfig, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })} className="text-xs font-bold gap-2">
              {sortConfig.direction === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />}
              {sortConfig.direction === 'asc' ? 'Ascending' : 'Descending'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {sortedTracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-900 rounded-3xl">
          <ListMusic size={48} className="text-zinc-800 mb-4" />
          <h3 className="text-zinc-400 font-bold">No tracks found</h3>
          <p className="text-zinc-600 text-sm mt-1">Try adjusting your search or add tracks to an album.</p>
        </div>
      ) : (
        <Table>
          <TableHeader className="hover:bg-transparent border-zinc-900">
            <TableRow className="border-zinc-900 hover:bg-transparent">
              <TableHead className="text-zinc-600 text-[10px] font-black uppercase">Title</TableHead>
              <TableHead className="text-zinc-600 text-[10px] font-black uppercase">Artist</TableHead>
              <TableHead className="text-zinc-600 text-[10px] font-black uppercase">Album</TableHead>
              <TableHead className="text-zinc-600 text-[10px] font-black uppercase">Memories</TableHead>
              <TableHead className="text-zinc-600 text-[10px] font-black uppercase">Rating</TableHead>
              <TableHead className="text-zinc-600 text-[10px] font-black uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTracks.map((track) => {
              const artist = artists.find(a => a.id === track.artistId);
              const album = albums.find(al => track.albumIds.includes(al.id));
              return (
                <TableRow 
                  key={track.id} 
                  className="border-zinc-900/50 hover:bg-zinc-900/30 transition-colors group"
                >
                  <TableCell onClick={() => setCurrentTrack(track.id)} className="cursor-pointer">
                    <span className="text-sm font-bold text-white group-hover:text-blue-400">{track.title}</span>
                  </TableCell>
                  <TableCell className="text-zinc-400 text-xs font-medium">{artist?.name}</TableCell>
                  <TableCell className="text-zinc-500 text-xs">{album?.title || 'Single'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Brain size={12} className="text-purple-500" />
                      <span className="text-xs font-bold text-zinc-300">{track.memories || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Rating
                      trackId={track.id}
                      balanced={track.rating}
                      unbalanced={track.initialRating}
                      comparisons={track.comparisons}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <TrackContextMenu track={track} />
                      <EditTrackModal track={track} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default Tracks;
