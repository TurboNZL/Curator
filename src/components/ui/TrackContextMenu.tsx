"use client";

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Play, ListMusic, Brain, Info, Link as LinkIcon, Edit2, Trash2, Plus, Minus, MoreVertical } from "lucide-react";
import { Button } from "./button";
import { Track } from "@/types/music";
import { useMusicStore } from "@/store/useMusicStore";
import { toast } from "sonner";
import { CreatePlaylistAddModal } from '../modals/CreatePlaylistAddModal';
import { EditTrackModal } from '../modals/EditTrackModal';
import { StatsForNerdsModal } from '../modals/StatsForNerdsModal';
import { useState } from 'react';

interface TrackContextMenuProps {
  track: Track;
  children: React.ReactNode;
}

export const TrackContextMenu = ({ track, children }: TrackContextMenuProps) => {
  const { setCurrentTrack, incrementMemories, decrementMemories, deleteTrack } = useMusicStore();
  const [isCreatePlaylistAddModalOpen, setIsCreatePlaylistAddModalOpen] = useState(false);
  const [isEditTrackModalOpen, setIsEditTrackModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  const handleCopyLink = (url?: string) => {
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } else {
      toast.error("No link available for this item.");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-zinc-950 border-zinc-800 text-white p-2">
        <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => setCurrentTrack(track.id)}>
          <Play size={14} /> Play Track
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => setIsCreatePlaylistAddModalOpen(true)}>
          <ListMusic size={14} /> Add to Playlist
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => setIsStatsModalOpen(true)}>
          <Info size={14} /> Stats for Nerds
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => incrementMemories(track.id)}>
          <Plus size={14} /> Add Memory {track.memories > 0 && <span className="text-[10px] text-zinc-500">({track.memories})</span>}
        </DropdownMenuItem>
        {track.memories && track.memories > 0 && (
          <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => decrementMemories(track.id)}>
            <Minus size={14} /> Remove Memory {track.memories > 0 && <span className="text-[10px] text-zinc-500">({track.memories})</span>}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-zinc-800" />
        {track.spotifyUrl && (
          <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => handleCopyLink(track.spotifyUrl)}>
            <LinkIcon size={14} /> Copy Spotify Link
          </DropdownMenuItem>
        )}
        {track.geniusUrl && (
          <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => handleCopyLink(track.geniusUrl)}>
            <LinkIcon size={14} /> Copy Genius Link
          </DropdownMenuItem>
        )}
        {track.youtubeMusicUrl && (
          <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => handleCopyLink(track.youtubeMusicUrl)}>
            <LinkIcon size={14} /> Copy YouTube Music Link
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => setIsEditTrackModalOpen(true)}>
          <Edit2 size={14} /> Edit Track
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-red-500 hover:bg-red-900/20 cursor-pointer" onSelect={async () => {
          if (confirm(`Are you sure you want to delete "${track.title}"? This action cannot be undone.`)) {
            await deleteTrack(track.id);
            toast.success("Track deleted.");
          }
        }}>
          <Trash2 size={14} /> Delete Track
        </DropdownMenuItem>
      </DropdownMenuContent>

      <CreatePlaylistAddModal trackToAdd={track} open={isCreatePlaylistAddModalOpen} onOpenChange={setIsCreatePlaylistAddModalOpen} />
      <EditTrackModal track={track} open={isEditTrackModalOpen} onOpenChange={setIsEditTrackModalOpen} />
      <StatsForNerdsModal track={track} open={isStatsModalOpen} onOpenChange={setIsStatsModalOpen} />
    </DropdownMenu>
  );
};