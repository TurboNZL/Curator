"use client";

import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, Plus, Share2, Info, Edit2, Trash2, ListMusic, Brain, Minus } from "lucide-react";
import { toast } from "sonner";
import { Track } from '@/types/music';
import { useMusicStore } from '@/store/useMusicStore';
import { EditTrackModal } from '../modals/EditTrackModal'; // Import EditTrackModal
import { StatsForNerdsModal } from '../modals/StatsForNerdsModal';

interface TrackContextMenuProps {
  track: Track;
  children: React.ReactElement; // Enforce single child for DropdownMenuTrigger asChild
}

export const TrackContextMenu = ({ track, children }: TrackContextMenuProps) => {
  const { incrementMemories, decrementMemories, deleteTrack, addToUserQueue } = useMusicStore();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  const handleCopyLink = (url?: string) => {
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } else {
      toast.error("No link available for this track.");
    }
  };

  const handleDeleteTrack = async () => {
    if (confirm("Are you sure you want to delete this track? This action cannot be undone.")) {
      await deleteTrack(track.id);
      toast.success("Track deleted.");
    }
  };

  // Inline comment: This DropdownMenuTrigger is configured to open the context menu
  // on both left-click and right-click on its child element.
  // The default browser context menu is prevented with e.preventDefault().
  // This allows the wrapped element (e.g., TableRow, Card) to serve as the main trigger.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onContextMenu={(e) => e.preventDefault()}>
        {children}
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56 bg-zinc-950 border-zinc-800 text-white p-2">
        <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => addToUserQueue(track.id)}>
          <ListMusic size={14} className="mr-2" /> Add to Queue
        </DropdownMenuItem>

        <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => handleCopyLink(track.spotifyUrl || track.youtubeMusicUrl || track.geniusUrl)}>
          <Copy size={14} className="mr-2" /> Copy Link
        </DropdownMenuItem>
        
        <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => setIsEditModalOpen(true)}>
          <Edit2 size={14} className="mr-2" /> Edit Track
        </DropdownMenuItem>

        <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => setIsStatsModalOpen(true)}>
          <Info size={14} className="mr-2" /> Stats for Nerds
        </DropdownMenuItem>

        <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => incrementMemories(track.id)}>
          <Brain size={14} className="mr-2" /> Add Memory {track.memories > 0 && <span className="text-[10px] text-zinc-500">({track.memories})</span>}
        </DropdownMenuItem>

        {/* Fix for the '0' issue: strictly check for > 0 */}
        {track.memories > 0 && (
          <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => decrementMemories(track.id)}>
            <Minus size={14} className="mr-2" /> Remove Memory {track.memories > 0 && <span className="text-[10px] text-zinc-500">({track.memories})</span>}
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-red-500 hover:bg-red-900/50 cursor-pointer" onSelect={handleDeleteTrack}>
          <Trash2 size={14} className="mr-2" /> Delete Track
        </DropdownMenuItem>
      </DropdownMenuContent>

      {/* Render modals outside the DropdownMenuContent */}
      <EditTrackModal
        track={track}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
      />
      <StatsForNerdsModal
        track={track}
        open={isStatsModalOpen}
        onOpenChange={setIsStatsModalOpen}
      />
    </DropdownMenu>
  );
};