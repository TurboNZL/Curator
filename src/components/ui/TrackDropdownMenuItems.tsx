"use client";

import React from 'react';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Plus, Edit2, Info, Trash2, Heart, PlusCircle, MinusCircle, ListMusic } from 'lucide-react';
import { Track } from '@/types/music';
import { useMusicStore } from '@/store/useMusicStore';
import { toast } from 'sonner';

interface TrackDropdownMenuItemsProps {
  track: Track;
  setSelectedTrackForPlaylistAdd: (track: Track) => void;
  setIsCreatePlaylistAddModalOpen: (isOpen: boolean) => void;
  setSelectedTrackForEdit: (track: Track) => void;
  setIsEditTrackModalOpen: (isOpen: boolean) => void;
  setSelectedTrackForStats: (track: Track) => void;
  setIsStatsModalOpen: (isOpen: boolean) => void;
}

export const TrackDropdownMenuItems: React.FC<TrackDropdownMenuItemsProps> = ({
  track,
  setSelectedTrackForPlaylistAdd,
  setIsCreatePlaylistAddModalOpen,
  setSelectedTrackForEdit,
  setIsEditTrackModalOpen,
  setSelectedTrackForStats,
  setIsStatsModalOpen,
}) => {
  const { addToUserQueue, incrementMemories, decrementMemories, deleteTrack, updateTrack } = useMusicStore();

  const handleAddToQueue = () => {
    addToUserQueue(track.id);
    toast.success(`"${track.title}" added to queue.`);
  };

  const handleIncrementMemories = () => {
    incrementMemories(track.id);
    toast.success(`Memory count for "${track.title}" increased.`);
  };

  const handleDecrementMemories = () => {
    decrementMemories(track.id);
    toast.success(`Memory count for "${track.title}" decreased.`);
  };

  const handleDeleteTrack = async () => {
    if (confirm(`Are you sure you want to delete "${track.title}"? This action cannot be undone.`)) {
      await deleteTrack(track.id);
      toast.success(`"${track.title}" deleted.`);
    }
  };

  const handleToggleFavorite = async () => {
    await updateTrack(track.id, { isFavorite: !track.isFavorite });
    toast.success(`"${track.title}" ${track.isFavorite ? 'removed from' : 'added to'} favorites.`);
  };

  return (
    <>
      <DropdownMenuItem onClick={handleAddToQueue} className="text-xs font-medium">
        <Plus size={14} className="mr-2" /> Add to Queue
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleToggleFavorite} className="text-xs font-medium">
        <Heart size={14} className="mr-2" /> {track.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => { setSelectedTrackForPlaylistAdd(track); setIsCreatePlaylistAddModalOpen(true); }} className="text-xs font-medium">
        <ListMusic size={14} className="mr-2" /> Add to Playlist
      </DropdownMenuItem>
      <DropdownMenuSeparator className="bg-zinc-800" />
      <DropdownMenuItem onClick={handleIncrementMemories} className="text-xs font-medium">
        <PlusCircle size={14} className="mr-2" /> Add Memory
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleDecrementMemories} disabled={track.memories <= 0} className="text-xs font-medium">
        <MinusCircle size={14} className="mr-2" /> Remove Memory
      </DropdownMenuItem>
      <DropdownMenuSeparator className="bg-zinc-800" />
      <DropdownMenuItem onClick={() => { setSelectedTrackForEdit(track); setIsEditTrackModalOpen(true); }} className="text-xs font-medium">
        <Edit2 size={14} className="mr-2" /> Edit Track
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => { setSelectedTrackForStats(track); setIsStatsModalOpen(true); }} className="text-xs font-medium">
        <Info size={14} className="mr-2" /> Stats for Nerds
      </DropdownMenuItem>
      <DropdownMenuSeparator className="bg-zinc-800" />
      <DropdownMenuItem onClick={handleDeleteTrack} className="text-xs font-medium text-red-500">
        <Trash2 size={14} className="mr-2" /> Delete Track
      </DropdownMenuItem>
    </>
  );
};