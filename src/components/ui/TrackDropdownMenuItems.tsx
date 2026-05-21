"use client";

import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Play, ListMusic, Brain, Info, Plus, Minus, Edit2, Trash2 } from 'lucide-react';
import { Track } from '@/types/music';
import { useMusicStore } from '@/store/useMusicStore';
import { toast } from 'sonner';
import React from 'react';

interface TrackDropdownMenuItemsProps {
  track: Track;
  onOpenPlaylistAddModal: () => void;
  onOpenEditTrackModal: () => void;
  onOpenStatsModal: () => void;
}

export const TrackDropdownMenuItems: React.FC<TrackDropdownMenuItemsProps> = ({
  track,
  onOpenPlaylistAddModal,
  onOpenEditTrackModal,
  onOpenStatsModal,
}) => {
  const { setCurrentTrack, addToUserQueue, incrementMemories, decrementMemories, deleteTrack } = useMusicStore();

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentTrack(track.id);
  };

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToUserQueue(track.id);
    toast.success(`${track.title} added to queue.`);
  };

  const handleIncrementMemory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await incrementMemories(track.id);
    toast.success(`Memory for ${track.title} increased!`);
  };

  const handleDecrementMemory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await decrementMemories(track.id);
    toast.success(`Memory for ${track.title} decreased!`);
  };

  const handleDeleteTrack = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${track.title}"? This action cannot be undone.`)) {
      await deleteTrack(track.id);
      toast.success(`"${track.title}" deleted.`);
    }
  };

  return (
    <>
      <DropdownMenuItem onClick={handlePlay}>
        <Play size={14} className="mr-2" /> Play Now
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleAddToQueue}>
        <ListMusic size={14} className="mr-2" /> Add to Queue
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onOpenPlaylistAddModal}>
        <Plus size={14} className="mr-2" /> Add to Playlist
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={onOpenEditTrackModal}>
        <Edit2 size={14} className="mr-2" /> Edit Track
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onOpenStatsModal}>
        <Info size={14} className="mr-2" /> Stats for Nerds
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleIncrementMemory}>
        <Plus size={14} className="mr-2" /> Increment Memory ({track.memories})
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleDecrementMemory}>
        <Minus size={14} className="mr-2" /> Decrement Memory ({track.memories})
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleDeleteTrack} className="text-red-500">
        <Trash2 size={14} className="mr-2" /> Delete Track
      </DropdownMenuItem>
    </>
  );
};