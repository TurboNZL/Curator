"use client";

import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, ListMusic, Brain, Plus, Minus, Info, Edit2, Trash2, Link } from "lucide-react";
import { useMusicStore } from '@/store/useMusicStore';
import { Track } from '@/types/music';
import { toast } from 'sonner';
import { CreatePlaylistAddModal } from '../modals/CreatePlaylistAddModal';
import { StatsForNerdsModal } from '../modals/StatsForNerdsModal';
import { EditTrackModal } from '../modals/EditTrackModal'; // Import EditTrackModal

interface TrackContextMenuProps {
  track: Track;
  children: React.ReactNode;
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({ track, children }) => {
  const { addToUserQueue, incrementMemories, decrementMemories, deleteTrack } = useMusicStore();
  const [isCreatePlaylistAddModalOpen, setIsCreatePlaylistAddModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isEditTrackModalOpen, setIsEditTrackModalOpen] = useState(false);

  const handleAddToQueue = () => {
    addToUserQueue(track.id);
    toast.success(`"${track.title}" added to queue.`);
  };

  const handleIncrementMemory = async () => {
    await incrementMemories(track.id);
    toast.success(`Memory for "${track.title}" incremented.`);
  };

  const handleDecrementMemory = async () => {
    await decrementMemories(track.id);
    toast.success(`Memory for "${track.title}" decremented.`);
  };

  const handleDeleteTrack = async () => {
    if (confirm(`Are you sure you want to delete "${track.title}"? This action cannot be undone.`)) {
      await deleteTrack(track.id);
      toast.success(`"${track.title}" deleted.`);
    }
  };

  const handleCopySpotifyLink = () => {
    if (track.spotifyUrl) {
      navigator.clipboard.writeText(track.spotifyUrl);
      toast.success("Spotify link copied to clipboard!");
    } else {
      toast.error("No Spotify link available for this track.");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-zinc-950 border-zinc-800 text-white">
          <DropdownMenuItem onClick={handleAddToQueue} className="text-xs font-medium">
            <ListMusic size={14} className="mr-2" /> Add to Queue
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem onClick={handleIncrementMemory} className="text-xs font-medium">
            <Plus size={14} className="mr-2" /> Add Memory
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDecrementMemory} className="text-xs font-medium" disabled={track.memories === 0}>
            <Minus size={14} className="mr-2" /> Remove Memory
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem onClick={() => setIsEditTrackModalOpen(true)} className="text-xs font-medium">
            <Edit2 size={14} className="mr-2" /> Edit Track
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsCreatePlaylistAddModalOpen(true)} className="text-xs font-medium">
            <ListMusic size={14} className="mr-2" /> Add to Playlist
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsStatsModalOpen(true)} className="text-xs font-medium">
            <Info size={14} className="mr-2" /> Stats for Nerds
          </DropdownMenuItem>
          {track.spotifyUrl && (
            <DropdownMenuItem onClick={handleCopySpotifyLink} className="text-xs font-medium">
              <Link size={14} className="mr-2" /> Copy Spotify Link
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem onClick={handleDeleteTrack} className="text-xs font-medium text-red-500">
            <Trash2 size={14} className="mr-2" /> Delete Track
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreatePlaylistAddModal trackToAdd={track} albumToAdd={undefined} open={isCreatePlaylistAddModalOpen} onOpenChange={setIsCreatePlaylistAddModalOpen} />
      <StatsForNerdsModal track={track} open={isStatsModalOpen} onOpenChange={setIsStatsModalOpen} />
      <EditTrackModal track={track} open={isEditTrackModalOpen} onOpenChange={setIsEditTrackModalOpen} />
    </>
  );
};