"use client";

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, Edit2, Play, Plus, Trash2, Info, Brain, Link as LinkIcon, ListMusic, Minus } from "lucide-react";
import { toast } from "sonner";
import { Track } from '@/types/music';
import { useMusicStore } from '@/store/useMusicStore';
import { CreatePlaylistAddModal } from '../modals/CreatePlaylistAddModal';
import { EditTrackModal } from '../modals/EditTrackModal';
import { StatsForNerdsModal } from './StatsForNerdsModal';

interface TrackContextMenuProps {
  track: Track;
  children: React.ReactNode;
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({ track, children }) => {
  const { setCurrentTrack, addToUserQueue, incrementMemories, decrementMemories, deleteTrack } = useMusicStore();
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = React.useState(false);

  const handleCopyLink = (url?: string) => {
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } else {
      toast.error("No link available for this item.");
    }
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${track.title}"? This action cannot be undone.`)) {
      await deleteTrack(track.id);
      toast.success("Track deleted.");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-zinc-950 border-zinc-800 text-white p-2">
        <DropdownMenuItem onSelect={() => setCurrentTrack(track.id)} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
          <Play size={14} /> Play Track
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => addToUserQueue(track.id)} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
          <ListMusic size={14} /> Add to Queue
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setIsPlaylistModalOpen(true)} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
          <ListMusic size={14} /> Add to Playlist
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem onSelect={() => setIsStatsModalOpen(true)} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
          <Info size={14} /> Stats for Nerds
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem onSelect={() => incrementMemories(track.id)} className="flex items-center justify-between px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
          <div className="flex items-center gap-3">
            <Brain size={14} /> Add Memory
          </div>
          {track.memories > 0 && <span className="text-[10px] font-mono text-zinc-500">+{track.memories}</span>}
        </DropdownMenuItem>
        {track.memories > 0 && (
          <DropdownMenuItem onSelect={() => decrementMemories(track.id)} className="flex items-center justify-between px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
            <div className="flex items-center gap-3">
              <Minus size={14} /> Remove Memory
            </div>
            <span className="text-[10px] font-mono text-zinc-500">-{track.memories}</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-zinc-800" />
        {track.spotifyUrl && (
          <DropdownMenuItem onSelect={() => handleCopyLink(track.spotifyUrl)} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
            <LinkIcon size={14} /> Copy Spotify Link
          </DropdownMenuItem>
        )}
        {track.geniusUrl && (
          <DropdownMenuItem onSelect={() => handleCopyLink(track.geniusUrl)} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
            <LinkIcon size={14} /> Copy Genius Link
          </DropdownMenuItem>
        )}
        {track.youtubeMusicUrl && (
          <DropdownMenuItem onSelect={() => handleCopyLink(track.youtubeMusicUrl)} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
            <LinkIcon size={14} /> Copy YouTube Music Link
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem onSelect={() => setIsEditModalOpen(true)} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
          <Edit2 size={14} /> Edit Track
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleDelete} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-red-500 hover:bg-red-900/20 cursor-pointer">
          <Trash2 size={14} /> Delete Track
        </DropdownMenuItem>
      </DropdownMenuContent>

      <CreatePlaylistAddModal trackToAdd={track} open={isPlaylistModalOpen} onOpenChange={setIsPlaylistModalOpen} />
      <EditTrackModal track={track} open={isEditModalOpen} onOpenChange={setIsEditModalOpen} />
      <StatsForNerdsModal track={track} open={isStatsModalOpen} onOpenChange={setIsStatsModalOpen} />
    </DropdownMenu>
  );
};