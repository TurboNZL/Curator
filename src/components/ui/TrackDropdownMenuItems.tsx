"use client";

import React from 'react';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Music, Plus, Trash2, Info, Edit2, Zap, Bookmark, Play, Minus } from 'lucide-react'; // Added Play and Minus
import { useMusicStore } from "@/store/useMusicStore";
import { Track } from '../../server/types/music'; // Corrected import path

interface TrackDropdownMenuItemsProps {
  track: Track;
  setSelectedTrackForPlaylistAdd: (track: Track) => void;
  setIsCreatePlaylistAddModalOpen: (open: boolean) => void;
  setSelectedTrackForEdit: (track: Track) => void;
  setIsEditTrackModalOpen: (open: boolean) => void;
  setSelectedTrackForStats: (track: Track) => void;
  setIsStatsModalOpen: (open: boolean) => void;
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
  const { setCurrentTrack, addToUserQueue, deleteTrack, incrementMemories, decrementMemories } = useMusicStore();

  const handlePlayNow = () => {
    setCurrentTrack(track.id);
  };

  const handleAddToQueue = () => {
    addToUserQueue(track.id);
  };

  const handleAddTrackToPlaylist = () => {
    setSelectedTrackForPlaylistAdd(track);
    setIsCreatePlaylistAddModalOpen(true);
  };

  const handleEditTrack = () => {
    setSelectedTrackForEdit(track);
    setIsEditTrackModalOpen(true);
  };

  const handleDeleteTrack = async () => {
    if (window.confirm(`Are you sure you want to delete "${track.title}"? This action cannot be undone.`)) {
      await deleteTrack(track.id);
    }
  };

  const handleShowStats = () => {
    setSelectedTrackForStats(track);
    setIsStatsModalOpen(true);
  };

  const handleIncrementMemories = () => {
    incrementMemories(track.id);
  };

  const handleDecrementMemories = () => {
    decrementMemories(track.id);
  };

  return (
    <>
      <DropdownMenuItem onClick={handlePlayNow} className="text-xs font-bold gap-2">
        <Play size={14} /> Play Now
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleAddToQueue} className="text-xs font-bold gap-2">
        <Music size={14} /> Add to Queue
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleAddTrackToPlaylist} className="text-xs font-bold gap-2">
        <Plus size={14} /> Add to Playlist
      </DropdownMenuItem>
      <DropdownMenuSeparator className="bg-zinc-800" />
      <DropdownMenuItem onClick={handleEditTrack} className="text-xs font-bold gap-2">
        <Edit2 size={14} /> Edit Track
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleDeleteTrack} className="text-xs font-bold text-red-500 hover:bg-red-900/20 hover:text-red-400 focus:text-red-400 focus:bg-red-900/20 gap-2">
        <Trash2 size={14} /> Delete Track
      </DropdownMenuItem>
      <DropdownMenuSeparator className="bg-zinc-800" />
      <DropdownMenuItem onClick={handleIncrementMemories} className="text-xs font-bold gap-2">
        <Bookmark size={14} /> +1 Memory
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleDecrementMemories} className="text-xs font-bold gap-2">
        <Minus size={14} /> -1 Memory
      </DropdownMenuItem>
      <DropdownMenuSeparator className="bg-zinc-800" />
      <DropdownMenuItem onClick={handleShowStats} className="text-xs font-bold gap-2">
        <Info size={14} /> Stats for Nerds
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => {}} className="text-xs font-bold gap-2">
        <Zap size={14} /> Improve Quality
      </DropdownMenuItem>
    </>
  );
};