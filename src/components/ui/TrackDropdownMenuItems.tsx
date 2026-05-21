"use client";

import React from 'react';
import { ContextMenuItem } from "@/components/ui/context-menu";
import { Track } from '@/types/music';
import { useMusicStore } from '@/store/useMusicStore';
import { toast } from 'sonner';
import { ListMusic, Plus, Info, Edit2, Play, Trash2, Heart, Minus } from 'lucide-react';

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
  const { setCurrentTrack, addToUserQueue, incrementMemories, decrementMemories, deleteTrack, fetchData } = useMusicStore();

  const handlePlayNow = () => {
    setCurrentTrack(track.id);
  };

  const handlePlayNext = () => {
    addToUserQueue(track.id);
    toast.success(`'${track.title}' added to queue`);
  };

  const handleAddToPlaylist = () => {
    setSelectedTrackForPlaylistAdd(track);
    setIsCreatePlaylistAddModalOpen(true);
  };

  const handleIncrementMemories = async () => {
    await incrementMemories(track.id);
    toast.success(`Added '${track.title}' to memories!`);
    fetchData(); // Refresh data to update memory count
  };

  const handleDecrementMemories = async () => {
    await decrementMemories(track.id);
    toast.info(`Removed '${track.title}' from memories.`);
    fetchData(); // Refresh data to update memory count
  };

  const handleShowStats = () => {
    setSelectedTrackForStats(track);
    setIsStatsModalOpen(true);
  };

  const handleEditMetadata = () => {
    setSelectedTrackForEdit(track);
    setIsEditTrackModalOpen(true);
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete '${track.title}'? This action cannot be undone.`)) {
      await deleteTrack(track.id);
      toast.success(`'${track.title}' deleted`);
      fetchData(); // Refresh data after deletion
    }
  };

  return (
    <>
      <ContextMenuItem onClick={handlePlayNow} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
        <Play size={14} /> Play Now
      </ContextMenuItem>
      <ContextMenuItem onClick={handlePlayNext} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
        <ListMusic size={14} /> Play Next
      </ContextMenuItem>
      <ContextMenuItem onClick={handleAddToPlaylist} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
        <Plus size={14} /> Add to Playlist
      </ContextMenuItem>
      <ContextMenuItem onClick={handleIncrementMemories} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
        <Heart size={14} /> Add to Memories ({track.memories})
      </ContextMenuItem>
      <ContextMenuItem onClick={handleDecrementMemories} disabled={track.memories === 0} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
        <Minus size={14} /> Remove from Memories ({track.memories})
      </ContextMenuItem>
      <ContextMenuItem onClick={handleShowStats} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
        <Info size={14} /> Stats for Nerds
      </ContextMenuItem>
      <ContextMenuItem onClick={handleEditMetadata} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
        <Edit2 size={14} /> Edit Metadata
      </ContextMenuItem>
      <ContextMenuItem onClick={handleDelete} className="flex items-center gap-2 text-xs font-medium text-red-500 cursor-pointer">
        <Trash2 size={14} /> Delete Track
      </ContextMenuItem>
    </>
  );
};