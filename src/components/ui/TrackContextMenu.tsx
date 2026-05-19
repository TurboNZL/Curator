"use client";

import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMusicStore } from '@/store/useMusicStore';
import { Track } from '@/types/music';
import { toast } from 'sonner';
import { Play, ListMusic, Brain, Info, Plus } from 'lucide-react';
import { CreatePlaylistAddModal } from '../modals/CreatePlaylistAddModal';
import { StatsForNerdsModal } from '../modals/StatsForNerdsModal';

interface TrackContextMenuProps {
  track: Track;
  children: React.ReactNode;
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({ track, children }) => {
  const { setCurrentTrack, addToUserQueue, incrementMemories, decrementMemories, artists, albums } = useMusicStore();
  const [isPlaylistAddModalOpen, setIsPlaylistAddModalOpen] = useState(false);
  const [isStatsForNerdsModalOpen, setIsStatsForNerdsModalOpen] = useState(false);

  const artist = artists.find(a => a.id === track.artistId);
  const album = albums.find(al => track.albumIds?.some(aId => aId.albumId === al.id));

  const handlePlayNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentTrack(track.id);
  };

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToUserQueue(track.id);
    toast.success(`"${track.title}" added to queue.`);
  };

  const handleOpenStatsForNerds = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsStatsForNerdsModalOpen(true);
  };

  const handleIncrementMemory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await incrementMemories(track.id);
    toast.success(`Memory count for "${track.title}" increased!`);
  };

  const handleDecrementMemory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await decrementMemories(track.id);
    toast.info(`Memory count for "${track.title}" decreased.`);
  };


  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div onContextMenu={(e) => { e.preventDefault(); }}>{children}</div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-zinc-950 border-zinc-800 text-white">
          <DropdownMenuLabel className="text-sm font-bold truncate">{track.title}</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem onClick={handlePlayNow} className="flex items-center gap-2">
            <Play size={14} className="text-blue-400" /> Play Now
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAddToQueue} className="flex items-center gap-2">
            <ListMusic size={14} className="text-blue-400" /> Add to Queue
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => {e.stopPropagation(); setIsPlaylistAddModalOpen(true);}} className="flex items-center gap-2">
            <Plus size={14} className="text-emerald-400" /> Add to Playlist
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem onClick={handleIncrementMemory} className="flex items-center gap-2">
            <Brain size={14} className="text-purple-400" /> Increase Memory ({track.memories || 0})
          </DropdownMenuItem>
          {track.memories && track.memories > 0 && (
            <DropdownMenuItem onClick={handleDecrementMemory} className="flex items-center gap-2">
              <Brain size={14} className="text-purple-600" /> Decrease Memory ({track.memories || 0})
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem onClick={handleOpenStatsForNerds} className="flex items-center gap-2">
            <Info size={14} className="text-blue-400" /> Stats for Nerds
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreatePlaylistAddModal
        trackToAdd={track}
        open={isPlaylistAddModalOpen}
        onOpenChange={setIsPlaylistAddModalOpen}
      />
      <StatsForNerdsModal 
        track={track} 
        artist={artist} 
        album={album} 
        open={isStatsForNerdsModalOpen} 
        onOpenChange={setIsStatsForNerdsModalOpen}
      >
        {/* Children prop for StatsForNerdsModal is handled internally by its dialog trigger */}
        <></> 
      </StatsForNerdsModal>
    </>
  );
};