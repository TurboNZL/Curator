"use client";

import React, { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { useMusicStore } from '@/store/useMusicStore';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { ListMusic, Plus, Play, Trash2, Edit2, Info, Share, Repeat, Brain, Heart, Star } from 'lucide-react';
import { Track, Playlist } from '@/types/music';
import { EditTrackModal } from '../modals/EditTrackModal';
import { CreatePlaylistAddModal } from '../modals/CreatePlaylistAddModal';
import { StatsForNerdsModal } from '../modals/StatsForNerdsModal';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface TrackContextMenuProps {
  track: Track;
  children: React.ReactNode;
  className?: string; // Added className prop
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({ track, children, className }) => {
  const { 
    setCurrentTrack, 
    addToUserQueue, 
    deleteTrack, 
    incrementMemories, 
    decrementMemories,
    updateTrack,
    playlists,
    artists,
    albums
  } = useMusicStore();
  const navigate = useNavigate();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreatePlaylistAddModalOpen, setIsCreatePlaylistAddModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  const artist = artists.find(a => a.id === track.artistId);
  const album = albums.find(al => track.albumIds.some(alb => alb.albumId === al.id));

  const handleToggleFavorite = async () => {
    try {
      await updateTrack(track.id, { isFavorite: !track.isFavorite });
      toast.success(track.isFavorite ? "Removed from favorites" : "Added to favorites");
    } catch (error) {
      toast.error("Failed to update favorite status");
    }
  };

  const handleShareTrack = () => {
    const url = track.spotifyUrl || track.youtubeMusicUrl || '';
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success("Track URL copied to clipboard!");
    } else {
      toast.error("No shareable URL available for this track.");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className={cn("relative", className)}>
            {children}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-zinc-950 border-zinc-800 text-white p-2">
          <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            {track.title}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem 
            className="flex items-center gap-2 text-xs font-medium cursor-pointer"
            onSelect={() => setCurrentTrack(track.id)}
          >
            <Play size={14} /> Play Now
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="flex items-center gap-2 text-xs font-medium cursor-pointer"
            onSelect={() => addToUserQueue(track.id)}
          >
            <ListMusic size={14} /> Add to Queue
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="flex items-center gap-2 text-xs font-medium cursor-pointer"
            onSelect={() => setIsCreatePlaylistAddModalOpen(true)}
          >
            <Plus size={14} /> Add to Playlist
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem 
            className="flex items-center gap-2 text-xs font-medium cursor-pointer"
            onSelect={() => handleToggleFavorite()}
          >
            <Heart size={14} className={track.isFavorite ? "fill-red-500 text-red-500" : "text-zinc-400"} /> 
            {track.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="flex items-center gap-2 text-xs font-medium cursor-pointer"
            onSelect={() => incrementMemories(track.id)}
          >
            <Brain size={14} /> Mark as Memory ({track.memories})
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="flex items-center gap-2 text-xs font-medium cursor-pointer"
            onSelect={() => decrementMemories(track.id)}
            disabled={track.memories === 0}
          >
            <Brain size={14} /> Remove Memory
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem 
            className="flex items-center gap-2 text-xs font-medium cursor-pointer"
            onSelect={() => setIsEditModalOpen(true)}
          >
            <Edit2 size={14} /> Edit Metadata
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="flex items-center gap-2 text-xs font-medium cursor-pointer"
            onSelect={() => setIsStatsModalOpen(true)}
          >
            <Info size={14} /> Stats for Nerds
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="flex items-center gap-2 text-xs font-medium cursor-pointer"
            onSelect={handleShareTrack}
            disabled={!track.spotifyUrl && !track.youtubeMusicUrl}
          >
            <Share size={14} /> Share Link
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem 
            className="flex items-center gap-2 text-xs font-medium text-red-500 cursor-pointer"
            onSelect={() => { if (confirm('Are you sure you want to delete this track?')) deleteTrack(track.id); }}
          >
            <Trash2 size={14} /> Delete Track
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditTrackModal 
        track={track} 
        open={isEditModalOpen} 
        onOpenChange={setIsEditModalOpen} 
      />
      <CreatePlaylistAddModal 
        trackToAdd={track} 
        open={isCreatePlaylistAddModalOpen} 
        onOpenChange={setIsCreatePlaylistAddModalOpen} 
      />
      <StatsForNerdsModal
        track={track}
        artist={artist}
        album={album}
        open={isStatsModalOpen}
        onOpenChange={setIsStatsModalOpen}
      >
        <span /> {/* Changed from <></> to <span /> to satisfy ReactElement type */}
      </StatsForNerdsModal>
    </>
  );
};