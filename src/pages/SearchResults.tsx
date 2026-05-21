"use client";

import React, { useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { Music, Disc, User, Search, Play, MoreVertical, Link as LinkIcon, Edit2, List, Plus, Minus, Info, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Rating } from '@/components/ui/Rating'; // DO NOT CHANGE THE STYLE OF THE RATING CARD
import { TrackContextMenu } from '@/components/ui/TrackContextMenu';
import { trackHasAlbum, getAlbumDisplayCover } from '@/lib/utils'; // Import getAlbumDisplayCover
import { DropdownMenuTrigger, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { CreatePlaylistAddModal } from '@/components/modals/CreatePlaylistAddModal';
import { StatsForNerdsModal } from '@/components/modals/StatsForNerdsModal';
import { EditTrackModal } from '@/components/modals/EditTrackModal';
import { toast } from 'sonner';
import { useState } from 'react';


const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q')?.toLowerCase() || '';
  const { tracks, albums, artists, releases, setCurrentTrack, activeProfile, deleteTrack, addToUserQueue, incrementMemories, decrementMemories } = useMusicStore(); // Added releases, activeProfile

  const [selectedTrackForPlaylistAdd, setSelectedTrackForPlaylistAdd] = useState<any>(null); 
  const [isCreatePlaylistAddModalOpen, setIsCreatePlaylistAddModalOpen] = useState(false);
  const [selectedTrackForEdit, setSelectedTrackForEdit] = useState<any>(null);
  const [isEditTrackModalOpen, setIsEditTrackModalOpen] = useState(false);
  const [selectedTrackForStats, setSelectedTrackForStats] = useState<any>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  const results = useMemo(() => {
    if (!query) return { tracks: [], albums: [], artists: [] };

    return {
      tracks: tracks.filter(t => 
        t.title.toLowerCase().includes(query) || 
        artists.find(a => a.id === t.artistId)?.name.toLowerCase().includes(query) || 
        albums.find(al => trackHasAlbum(t, al.id))?.title.toLowerCase().includes(query)
      ),
      albums: albums.filter(a => a.title.toLowerCase().includes(query) || artists.find(art => art.id === a.artistId)?.name.toLowerCase().includes(query)),
      artists: artists.filter(a => a.name.toLowerCase().includes(query))
    };
  }, [query, tracks, albums, artists]);

  const handleCopyLink = (url?: string) => {
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } else {
      toast.error("No link available for this item.");
    }
  };

  const hasResults = results.tracks.length > 0 || results.albums.length > 0 || results.artists.length > 0;
  const defaultAlbumImage = activeProfile.settings?.defaultAlbumImage || '/placeholder.svg';

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white uppercase flex items-center gap-3">
          <Search className="text-zinc-500" />
          Search Results
        </h1>
        <p className="text-zinc-500 text-sm mt-1 font-medium">
          Showing results for "{query}"
        </p>
      </div>

      {!hasResults ? (
        <div className="py-20 text-center border-2 border-dashed border-zinc-900 rounded-3xl">
          <Search size={48} className="text-zinc-800 mx-auto mb-4" />
          <h3 className="text-zinc-400 font-bold">No results found</h3>
          <p className="text-zinc-600 text-sm mt-1">Try a different search term.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {results.artists.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Artists</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {results.artists.map(artist => (
                  <Link key={artist.id} to={`/artists/${artist.id}`}>
                    <Card className="bg-zinc-900/40 border-zinc-800 p-3 hover:bg-zinc-900/60 transition-all group">
                      <div className="aspect-square rounded-full overflow-hidden mb-3">
                        <img src={artist.image || '/placeholder.svg'} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="" />
                      </div>
                      <h3 className="text-sm font-bold text-white text-center truncate">{artist.name}</h3>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.albums.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Albums</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {results.albums.map(album => (
                  <Link key={album.id} to={`/albums/${album.id}`}>
                    <Card className="bg-zinc-900/40 border-zinc-800 p-3 hover:bg-zinc-900/60 transition-all group">
                      <div className="aspect-square rounded-lg overflow-hidden mb-3">
                        <img src={getAlbumDisplayCover(album, releases, defaultAlbumImage)} className="w-full h-full object-cover" alt="" /> {/* Use the new helper */}
                      </div>
                      <h3 className="text-sm font-bold text-white truncate">{album.title}</h3>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.tracks.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Tracks</h2>
              <div className="space-y-2">
                {results.tracks.map(track => {
                  const artist = artists.find(a => a.id === track.artistId);
                  const album = albums.find(al => trackHasAlbum(track, al.id));
                  return (
                    <TrackContextMenu key={track.id} track={track}>
                      <div 
                        className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/30 border border-zinc-900/50 hover:bg-zinc-900/50 transition-colors group"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 rounded bg-zinc-800 overflow-hidden relative group/play">
                            <img src={getAlbumDisplayCover(album, releases, defaultAlbumImage)} className="w-full h-full object-cover opacity-60" alt="" /> {/* Use the new helper */}
                            <button 
                              onClick={(e) => { e.stopPropagation(); setCurrentTrack(track.id); }}
                              className="absolute inset-0 flex items-center justify-center text-white opacity-0 group-hover/play:opacity-100 transition-opacity"
                            >
                              <Play size={16} fill="currentColor" />
                            </button>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{track.title}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{artist?.name} {album?.title && `— ${album.title}`}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {/* DO NOT CHANGE THE STYLE OF THE RATING CARD */}
                          <Rating
                            track={track}
                            size="sm"
                          />
                           <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 p-0 text-zinc-500 hover:text-white">
                                <MoreVertical size={14} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-white">
                              <DropdownMenuItem 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setSelectedTrackForEdit(track); 
                                  setIsEditTrackModalOpen(true); 
                                }}
                                className="text-xs font-medium"
                              >
                                <Edit2 size={14} className="mr-2" /> Edit Track
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  addToUserQueue(track.id);
                                  toast.success(`"${track.title}" added to queue.`);
                                }}
                                className="text-xs font-medium"
                              >
                                <List size={14} className="mr-2" /> Add to Queue
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  incrementMemories(track.id);
                                  toast.success(`Memory added for "${track.title}".`);
                                }}
                                className="text-xs font-medium"
                              >
                                <Plus size={14} className="mr-2" /> Add Memory
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  decrementMemories(track.id);
                                  toast.success(`Memory removed for "${track.title}".`);
                                }}
                                disabled={track.memories === 0}
                                className="text-xs font-medium"
                              >
                                <Minus size={14} className="mr-2" /> Remove Memory
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setSelectedTrackForPlaylistAdd(track); 
                                  setIsCreatePlaylistAddModalOpen(true); 
                                }}
                                className="text-xs font-medium"
                              >
                                <Plus size={14} className="mr-2" /> Add to Playlist
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setSelectedTrackForStats(track); 
                                  setIsStatsModalOpen(true); 
                                }}
                                className="text-xs font-medium"
                              >
                                <Info size={14} className="mr-2" /> Stats for Nerds
                              </DropdownMenuItem>
                              {track.spotifyUrl && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyLink(track.spotifyUrl); }} className="text-xs font-medium">
                                  <LinkIcon size={14} className="mr-2" /> Copy Spotify Link
                                </DropdownMenuItem>
                              )}
                              {track.geniusUrl && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyLink(track.geniusUrl); }} className="text-xs font-medium">
                                  <LinkIcon size={14} className="mr-2" /> Copy Genius Link
                                </DropdownMenuItem>
                              )}
                              {track.youtubeMusicUrl && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyLink(track.youtubeMusicUrl); }} className="text-xs font-medium">
                                  <LinkIcon size={14} className="mr-2" /> Copy YouTube Music Link
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator className="bg-zinc-800" />
                              <DropdownMenuItem 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if (confirm(`Are you sure you want to delete "${track.title}"?`)) {
                                    deleteTrack(track.id);
                                  }
                                }}
                                className="text-xs font-medium text-red-500"
                              >
                                <Trash2 size={14} className="mr-2" /> Delete Track
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </TrackContextMenu>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
      <CreatePlaylistAddModal trackToAdd={selectedTrackForPlaylistAdd} albumToAdd={undefined} open={isCreatePlaylistAddModalOpen} onOpenChange={setIsCreatePlaylistAddModalOpen} />
      {selectedTrackForEdit && (
        <EditTrackModal
          track={selectedTrackForEdit}
          open={isEditTrackModalOpen}
          onOpenChange={setIsEditTrackModalOpen}
        />
      )}
      {selectedTrackForStats && (
        <StatsForNerdsModal
          track={selectedTrackForStats}
          open={isStatsModalOpen}
          onOpenChange={setIsStatsModalOpen}
        />
      )}
    </div>
  );
};

export default SearchResults;