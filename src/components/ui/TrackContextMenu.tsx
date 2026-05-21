"use client";

import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Copy, Plus, Edit2, Trash2, Link, Play, Info, Heart, Minus, Brain } from 'lucide-react';
import { useMusicStore } from '@/store/useMusicStore';
import { toast } from 'sonner';
import { Track } from '@/types/music';
import { EditTrackModal } from '../modals/EditTrackModal';
import { StatsForNerdsModal } from '../modals/StatsForNerdsModal';
import { CreatePlaylistAddModal } from '../modals/CreatePlaylistAddModal';

// DO NOT CHANGE THE STYLE OF THE RATING CARD
interface TrackContextMenuProps {
  children: React.ReactNode;
  track: Track;
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({ children, track }) => {
  const { setCurrentTrack, addToUserQueue, incrementMemories, decrementMemories, deleteTrack, fetchData } = useMusicStore();
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = React.useState(false);
  const [isAddToPlaylistModalOpen, setIsAddToPlaylistModalOpen] = React.useState(false);

  const handleCopyLink = (url?: string) => {
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } else {
      toast.error("No link available for this track.");
    }
  };

  const handleDeleteTrack = async () => {
    if (confirm(`Are you sure you want to delete "${track.title}"? This action cannot be undone.`)) {
      await deleteTrack(track.id);
      toast.success(`"${track.title}" deleted.`);
      fetchData(); // Re-fetch data to update UI
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-64 bg-zinc-950 border-zinc-800 text-white p-2">
          <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => setCurrentTrack(track.id)}>
            <Play size={14} /> Play Now
          </ContextMenuItem>

          <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => setIsAddToPlaylistModalOpen(true)}>
            <Plus size={14} /> Add to Playlist
          </ContextMenuItem>
          
          <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => addToUserQueue(track.id)}>
            <Plus size={14} /> Add to Queue
          </ContextMenuItem>

          <ContextMenuSeparator className="bg-zinc-800" />

          {track.memories > 0 && (
            <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => decrementMemories(track.id)}>
              <Minus size={14} /> Remove Memory {track.memories > 0 && <span className="text-[10px] text-zinc-500">({track.memories})</span>}
            </ContextMenuItem>
          )}
          <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => incrementMemories(track.id)}>
            <Brain size={14} /> Add Memory {track.memories > 0 && <span className="text-[10px] text-zinc-500">({track.memories})</span>}
          </ContextMenuItem>
          
          <ContextMenuSeparator className="bg-zinc-800" />

          <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => setIsEditModalOpen(true)}>
            <Edit2 size={14} /> Edit Track
          </ContextMenuItem>
          <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => setIsStatsModalOpen(true)}>
            <Info size={14} /> Stats for Nerds
          </ContextMenuItem>
          <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => handleCopyLink(track.spotifyUrl)}>
            <Link size={14} /> Copy Spotify Link
          </ContextMenuItem>

          <ContextMenuSeparator className="bg-zinc-800" />

          <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-red-500 hover:bg-red-900/20 cursor-pointer" onSelect={handleDeleteTrack}>
            <Trash2 size={14} /> Delete Track
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {isAddToPlaylistModalOpen && (
        <CreatePlaylistAddModal trackToAdd={track} open={isAddToPlaylistModalOpen} onOpenChange={setIsAddToPlaylistModalOpen} />
      )}
      {isEditModalOpen && (
        <EditTrackModal
          track={track}
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
        />
      )}
      {isStatsModalOpen && (
        <StatsForNerdsModal
          track={track}
          open={isStatsModalOpen}
          onOpenChange={setIsStatsModalOpen}
        />
      )}
    </>
  );
};