"use client";

import { useEffect, useState, useMemo, useCallback } from 'react'; // Added useCallback
import { useMusicStore } from '@/store/useMusicStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ListMusic, ArrowUpDown, Brain, SortAsc, SortDesc, Play, Music, Star, Loader2, Plus, MoreVertical } from 'lucide-react'; 
import { Input } from '@/components/ui/input';
import { EditTrackModal } from '@/components/modals/EditTrackModal';
import { Rating } from '@/components/ui/Rating'; // DO NOT CHANGE THE STYLE OF THE RATING CARD
import { TrackRightClickMenu } from '@/components/ui/TrackRightClickMenu';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { trackHasAlbum, getAlbumDisplayCover } from '@/lib/utils'; // Import getAlbumDisplayCover
import { cn } from '@/lib/utils';
import { CreatePlaylistAddModal } from '@/components/modals/CreatePlaylistAddModal'; // Import CreatePlaylistAddModal
import { StatsForNerdsModal } from '@/components/modals/StatsForNerdsModal'; // Import StatsForNerdsModal
import { CreateTrackModal } from '@/components/modals/CreateTrackModal'; // Import CreateTrackModal


const Tracks = () => {
  const { tracks = [], artists = [], albums = [], releases = [], setCurrentTrack, fetchData, isLoading, activeProfile } = useMusicStore();
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ field: 'title', direction: 'asc' as 'asc' | 'desc' });
  const [isEditTrackModalOpen, setIsEditTrackModalOpen] = useState(false);
  const [selectedTrackForEdit, setSelectedTrackForEdit] = useState<any>(null);
  const [isCreatePlaylistAddModalOpen, setIsCreatePlaylistAddModalOpen] = useState(false);
  const [selectedTrackForPlaylistAdd, setSelectedTrackForPlaylistAdd] = useState<any>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [selectedTrackForStats, setSelectedTrackForStats] = useState<any>(null);
  const [isCreateTrackModalOpen, setIsCreateTrackModalOpen] = useState(false);


  useEffect(() => {
    fetchData();
  }, []);

  const getTrackDisplayArtists = useCallback((track: any) => {
    if (!track || !track.artistCredits) {
      const primaryArtist = artists.find(a => a.id === track.artistId);
      return primaryArtist?.name || "Unknown Artist";
    }

    const leadArtists = track.artistCredits
      .filter((credit: any) => credit.role === 'Lead artist')
      .map((credit: any) => artists.find(a => a.id === credit.artistId)?.name)
      .filter(Boolean);

    if (leadArtists.length > 0) {
      return leadArtists.join(', ');
    }
    const primaryArtist = artists.find(a => a.id === track.artistId);
    return primaryArtist?.name || "Unknown Artist";
  }, [artists]);


  const filteredTracks = useMemo(() => {
    if (!Array.isArray(tracks)) return [];
    return tracks.filter(t => {
      if (!t) return false;
      const artistName = getTrackDisplayArtists(t); // Use helper for search
      const album = albums?.find(al => trackHasAlbum(t, al.id));
      const searchLower = search.toLowerCase();
      return (
        (t.title || '').toLowerCase().includes(searchLower) ||
        (artistName || '').toLowerCase().includes(searchLower) ||
        (album?.title || '').toLowerCase().includes(searchLower)
      );
    });
  }, [tracks, search, albums, getTrackDisplayArtists]);

  const sortedTracks = useMemo(() => {
    const sorted = [...filteredTracks].sort((a, b) => {
      let comparison = 0;
      if (sortConfig.field === 'title') {
        comparison = (a.title || '').localeCompare(b.title || '');
      } else if (sortConfig.field === 'memories') {
        comparison = (a.memories || 0) - (b.memories || 0);
      } else if (sortConfig.field === 'rating') {
        const getEffectiveRating = (track: any) => {
          if (track.comparisons >= 3 && track.rating !== undefined && track.rating !== null && track.rating > 0.001) {
            return track.rating;
          }
          if (track.initialRating !== undefined && track.initialRating !== null && track.initialRating > 0.001) {
            return track.initialRating;
          }
          return -1;
        };

        const ratingA = getEffectiveRating(a);
        const ratingB = getEffectiveRating(b);
        comparison = ratingA - ratingB;
      }
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    if (sortConfig.field === 'rating' && sortConfig.direction === 'desc') {
      const tenStarTracks = sorted.filter(t => {
        const effectiveRating = (t.comparisons >= 3 && t.rating !== undefined && t.rating !== null)
            ? t.rating
            : (t.initialRating !== undefined && t.initialRating !== null)
                ? t.initialRating
                : null;
        return effectiveRating >= 9.9999 && t.comparisons > 0;
      }); 
      const otherTracks = sorted.filter(t => {
        const effectiveRating = (t.comparisons >= 3 && t.rating !== undefined && t.rating !== null)
            ? t.rating
            : (t.initialRating !== undefined && t.initialRating !== null)
                ? t.initialRating
                : null;
        return !(effectiveRating >= 9.9999 && t.comparisons > 0);
      });

      tenStarTracks.sort((a, b) => (b.eloScore || 0) - (a.eloScore || 0));

      return [...tenStarTracks, ...otherTracks];
    }

    return sorted;
  }, [filteredTracks, sortConfig]);

  if (isLoading && tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Loading Catalog...</p>
      </div>
    );
  }
  const defaultAlbumImage = activeProfile.settings?.defaultAlbumImage || '/placeholder.svg';

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Global Tracks</h1>
          <p className="text-zinc-500 text-sm mt-1">Every indexed file in your local curation database.</p>
        </div>
        <Button onClick={() => setIsCreateTrackModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-[10px] font-black uppercase tracking-widest h-10 px-8 gap-2">
          <Plus size={16} /> New Track
        </Button>
      </div>

      <div className="flex items-center gap-4 py-4 border-y border-zinc-900">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
          <Input 
            className="bg-zinc-900/50 border-none rounded-lg pl-10 text-sm focus-visible:ring-1 focus-visible:ring-blue-500 text-white" 
            placeholder="Search by title, artist, or album..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-zinc-800 bg-zinc-900/50 text-xs font-bold gap-2">
              <ArrowUpDown size={14} /> <span>Sort: {sortConfig.field}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-white">
            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Sort By</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setSortConfig({ ...sortConfig, field: 'title' })} className="text-xs font-bold gap-2">
              <Music size={14} /> <span>Title</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortConfig({ ...sortConfig, field: 'memories' })} className="text-xs font-bold gap-2">
              <Brain size={14} /> <span>Memories</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortConfig({ ...sortConfig, field: 'rating' })} className="text-xs font-bold gap-2">
              <Star size={14} /> <span>Rating</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem onClick={() => setSortConfig({ ...sortConfig, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })} className="text-xs font-bold gap-2">
              {sortConfig.direction === 'asc' ? 'Ascending' : 'Descending'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {sortedTracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-900 rounded-3xl">
          <ListMusic size={48} className="text-zinc-800 mb-4" />
          <h3 className="text-zinc-400 font-bold">No tracks found</h3>
          <p className="text-zinc-600 text-sm mt-1 mb-6">Try adjusting your search or add tracks to an album.</p>
        </div>
      ) : (
        <div className="bg-zinc-900/20 rounded-2xl border border-zinc-900 overflow-hidden">
          <Table>
            <TableHeader className="hover:bg-transparent border-zinc-900">
              <TableRow className="border-zinc-900 hover:bg-transparent">
                <TableHead className="text-zinc-600 text-[10px] font-black uppercase w-12">#</TableHead>
                <TableHead className="text-zinc-600 text-[10px] font-black uppercase">Title</TableHead>
                <TableHead className="text-zinc-600 text-[10px] font-black uppercase">Artist</TableHead>
                <TableHead className="text-zinc-600 text-[10px] font-black uppercase">Album</TableHead>
                <TableHead className="text-zinc-600 text-[10px] font-black uppercase">Rating</TableHead>
                <TableHead className="text-zinc-600 text-[10px] font-black uppercase text-right w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTracks.map((track, i) => {
                if (!track) return null;
                const artistName = getTrackDisplayArtists(track);
                const album = albums?.find(al => trackHasAlbum(track, al.id));
                const cover = getAlbumDisplayCover(album, releases, defaultAlbumImage);
                
                return (
                  <TrackRightClickMenu key={track.id} track={track}>
                    <TableRow
                      className="border-zinc-900/50 hover:bg-zinc-900/30 transition-colors group"
                    >
                      <TableCell className="text-xs text-zinc-600 font-mono">{i + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative w-8 h-8 rounded overflow-hidden bg-zinc-900 border border-zinc-800 group/play">
                            <img src={cover} className="w-full h-full object-cover opacity-40 group-hover/play:opacity-20 transition-opacity" alt="" />
                            <button
                              onClick={(e) => { e.stopPropagation(); setCurrentTrack(track.id); }}
                              className="absolute inset-0 flex items-center justify-center text-zinc-500 hover:text-blue-400 transition-all"
                            >
                              <Play size={14} fill="currentColor" />
                            </button>
                          </div>
                          <span className="text-sm font-bold text-white group-hover:text-blue-400">{track.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-400 text-xs font-medium">{artistName || 'Unknown'}</TableCell>
                      <TableCell className="text-zinc-500 text-xs">{album?.title || 'Single'}</TableCell>
                      <TableCell>
                        {/* DO NOT CHANGE THE STYLE OF THE RATING CARD */}
                        <Rating
                          track={track}
                          showEditor={true} 
                          size="sm"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 p-0 text-zinc-500 hover:text-white">
                              <MoreVertical size={14} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-white">
                            <TrackDropdownMenuItems
                                track={track}
                                setSelectedTrackForPlaylistAdd={setSelectedTrackForPlaylistAdd}
                                setIsCreatePlaylistAddModalOpen={setIsCreatePlaylistAddModalOpen}
                                setSelectedTrackForEdit={setSelectedTrackForEdit}
                                setIsEditTrackModalOpen={setIsEditTrackModalOpen}
                                setSelectedTrackForStats={setSelectedTrackForStats}
                                setIsStatsModalOpen={setIsStatsModalOpen}
                            />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  </TrackRightClickMenu>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {selectedTrackForEdit && (
        <EditTrackModal
          track={selectedTrackForEdit}
          open={isEditTrackModalOpen}
          onOpenChange={setIsEditTrackModalOpen}
        />
      )}
      <CreatePlaylistAddModal trackToAdd={selectedTrackForPlaylistAdd} albumToAdd={undefined} open={isCreatePlaylistAddModalOpen} onOpenChange={setIsCreatePlaylistAddModalOpen} />
      {selectedTrackForStats && (
        <StatsForNerdsModal
          track={selectedTrackForStats}
          open={isStatsModalOpen}
          onOpenChange={setIsStatsModalOpen}
        />
      )}
      <CreateTrackModal
        open={isCreateTrackModalOpen}
        onOpenChange={setIsCreateTrackModalOpen}
      />
    </div>
  );
};

export default Tracks;