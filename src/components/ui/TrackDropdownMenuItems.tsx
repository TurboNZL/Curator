"use client";

import React from 'react';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Play, ListMusic, Plus, Minus, Edit2, Info, Trash2, Brain } from 'lucide-react';
import { Track } from '@/types/music';
import { useMusicStore } from '@/store/useMusicStore';
import { toast } from 'sonner';

interface TrackDropdownMenuItemsProps {
  track: Track;
  setSelectedTrackForPlaylistAdd: (track: Track | null) => void;
  setIsCreatePlaylistAddModalOpen: (isOpen: boolean) => void;
  setSelectedTrackForEdit: (track: Track | null) => void;
  setIsEditTrackModalOpen: (isOpen: boolean) => void;
  setSelectedTrackForStats: (track: Track | null) => void;
  setIsStatsModalOpen: (isOpen: boolean) => void;
  onCloseParentDropdown?: () => void; // Optional: to close the parent dropdown after an action
}

export const TrackDropdownMenuItems: React.FC<TrackDropdownMenuItemsProps> = ({
  track,
  setSelectedTrackForPlaylistAdd,
  setIsCreatePlaylistAddModalOpen,
  setSelectedTrackForEdit,
  setIsEditTrackModalOpen,
  setSelectedTrackForStats,
  setIsStatsModalOpen,
  onCloseParentDropdown
}) => {
  const { setCurrentTrack, addToUserQueue, incrementMemories, decrementMemories, deleteTrack } = useMusicStore();

  const handleAction = (action: () => void) => {
    action();
    if (onCloseParentDropdown) {
      onCloseParentDropdown();
    }
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${track.title}"? This action cannot be undone.`)) {
      await deleteTrack(track.id);
    }
  };

  return (
    <>
      <DropdownMenuItem onClick={() => handleAction(() => setCurrentTrack(track.id))} className="text-xs font-medium">
        <Play size={14} className="mr-2" /> <span>Play Now</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleAction(() => addToUserQueue(track.id))} className="text-xs font-medium">
        <ListMusic size={14} className="mr-2" /> <span>Add to Queue</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleAction(() => { setSelectedTrackForPlaylistAdd(track); setIsCreatePlaylistAddModalOpen(true); })} className="text-xs font-medium">
        <ListMusic size={14} className="mr-2" /> <span>Add to Playlist</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator className="bg-zinc-800" />
      <DropdownMenuItem onClick={() => handleAction(() => incrementMemories(track.id))} className="text-xs font-medium">
        <Plus size={14} className="mr-2" /> <span>Increment Memory ({track.memories})</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleAction(() => decrementMemories(track.id))} className="text-xs font-medium" disabled={(track.memories || 0) === 0}>
        <Minus size={14} className="mr-2" /> <span>Decrement Memory ({track.memories})</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator className="bg-zinc-800" />
      <DropdownMenuItem onClick={() => handleAction(() => { setSelectedTrackForEdit(track); setIsEditTrackModalOpen(true); })} className="text-xs font-medium">
        <Edit2 size={14} className="mr-2" /> <span>Edit Track</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleAction(() => { setSelectedTrackForStats(track); setIsStatsModalOpen(true); })} className="text-xs font-font-medium">
        <Info size={14} className="mr-2" /> <span>Stats for Nerds</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator className="bg-zinc-800" />
      <DropdownMenuItem onClick={() => handleAction(handleDelete)} className="text-xs font-medium text-red-500">
        <Trash2 size={14} className="mr-2" /> <span>Delete Track</span>
      </DropdownMenuItem>
    </>
  );
};