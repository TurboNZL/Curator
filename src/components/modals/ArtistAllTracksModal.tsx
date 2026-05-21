"use client";

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Music, Star, Play, List, Plus, Minus, Info, Trash2, Edit2, MoreVertical, Link as LinkIcon } from 'lucide-react';
import { useMusicStore } from '@/store/useMusicStore';
import { Rating } from '@/components/ui/Rating';
import { Track } from '@/types/music';
import { TrackContextMenu } from '@/components/ui/TrackContextMenu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { CreatePlaylistAddModal } from './CreatePlaylistAddModal';
import { StatsForNerdsModal } from './StatsForNerdsModal';
import { EditTrackModal } from './EditTrackModal';
import { toast } from 'sonner';
import { cn, trackHasAlbum, getAlbumDisplayCover } from '@/lib/utils'; // Import getAlbumDisplayCover

interface ArtistAllTracksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistId: string;
  artistName: string;
}

export const ArtistAllTracksModal: React.FC<ArtistAllTracksModalProps> = ({ open, onOpenChange, artistId, artistName }) => {
  const { tracks, artists, albums, releases, setCurrentTrack, deleteTrack, addToUserQueue, incrementMemories, decrementMemories, activeProfile } = useMusicStore(); // Added releases, activeProfile
  const [selectedTrackForPlaylistAdd, setSelectedTrackForPlaylistAdd] = useState<Track | null>(null);
  const [isCreatePlaylistAddModalOpen, setIsCreatePlaylistAddModalOpen] = useState(false);
  const [selectedTrackForEdit, setSelectedTrackForEdit] = useState<Track | null>(null);
  const [isEditTrackModalOpen, setIsEditTrackModalOpen] = useState(false);
  const [selectedTrackForStats, setSelectedTrackForStats] = useState<Track | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);


  const getEffectiveRating = (track: Track) => {
    if ((track.comparisons >= 3 || track.memories > 0) && track.rating !== undefined && track.rating !== null && track.rating > 0.001) {
      return track.rating;
    }
    if (track.initialRating !== undefined && track.initialRating !== null && track.initialRating > 0.001) {
      return track.initialRating;
    }
    return -1; // Indicate unrated
  };

  const allRatedArtistTracks = useMemo(() => {
    const allArtistTracks = tracks.filter(t => t.artistId === artistId);
    
    return allArtistTracks
      .map(t => ({ ...t, effectiveRating: getEffectiveRating(t) }))
      .filter(t => t.effectiveRating > 0) // Exclude unrated
      .sort((a, b) => {
        // Sort by effective rating (descending)
        if (b.effectiveRating !== a.effectiveRating) return b.effectiveRating - a.effectiveRating;
        // Then by ELO score for ties (descending)
        return (b.eloScore ?? 0) - (a.eloScore ?? 0);
      });
  }, [tracks, artistId]);

  const defaultAlbumImage = activeProfile.settings?.defaultAlbumImage || '/placeholder.svg';

  const getAlbumArt = (track: Track) => {
    const album = albums.find(a => trackHasAlbum(track, a.id));
    // Use the new helper here
    return getAlbumDisplayCover(album, releases, defaultAlbumImage);
  };

  const handleCopyLink = (url?: string) => {
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } else {
      toast.error("No link available for this item.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Star size={20} className="text-blue-500" />
            {artistName}'s Rated Tracks
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 flex-1 overflow-hidden">
          {allRatedArtistTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-900 rounded-2xl h-full">
              <Music size={48} className="text-zinc-800 mb-4" />
              <h3 className="text-zinc-400 font-bold">No rated tracks yet.</h3>
              <p className="text-zinc-600 text-sm mt-1">Start rating tracks to see them here!</p>
            </div>
          ) : (
            <ScrollArea className="flex-1 pr-4"> {/* Adjusted ScrollArea to take available height */}
              <div className="space-y-3">
                {allRatedArtistTracks.map((track, i) => (
                  <TrackContextMenu key={track.id} track={track}>
                    <div className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg group">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs font-mono text-zinc-600 w-4 shrink-0">{i + 1}</span>
                        <div className="w-10 h-10 rounded-md overflow-hidden bg-zinc-800 shrink-0">
                          <img src={getAlbumArt(track)} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-white truncate">{track.title}</p>
                          <p className="text-[10px] text-zinc-500 truncate">{artistName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-4 shrink-0">
                        <Rating track={track} size="sm" showEditor={false} />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white" onClick={(e) => { e.stopPropagation(); setCurrentTrack(track.id); }}>
                          <Play size={14} fill="currentColor" />
                        </Button>
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
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
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
    </Dialog>
  );
};