"use client";

import React, { useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator, // Added this import
} from "@/components/ui/context-menu";
import { Track } from '@/types/music';
import { useMusicStore } from '@/store/useMusicStore';
import { Play, ListMusic, Brain, Trash2, Edit2, Info, Link as LinkIcon, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { CreatePlaylistAddModal } from '../modals/CreatePlaylistAddModal';
import { EditTrackModal } from '../modals/EditTrackModal';
import { StatsForNerdsModal } from '../modals/StatsForNerdsModal';

interface TrackContextMenuProps {
  track: Track;
  children: React.ReactNode;
  trigger?: React.ReactElement; // Optional trigger for custom button
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({ track, children, trigger }) => {
  const { setCurrentTrack, addToUserQueue, incrementMemories, decrementMemories, deleteTrack } = useMusicStore();
  const [isPlaylistAddModalOpen, setIsPlaylistAddModalOpen] = useState(false);
  const [isEditTrackModalOpen, setIsEditTrackModalOpen] = useState(false);
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
    if (confirm(`Are you sure you want to delete "${track.title}"? This action cannot be undone.`)) {
      try {
        await deleteTrack(track.id);
        toast.success("Track deleted.");
      } catch (error) {
        toast.error("Failed to delete track.");
      }
    }
  };

  const contextMenuContent = (
    <ContextMenuContent className="w-64 bg-zinc-950 border-zinc-800 text-white p-2">
      <ContextMenuItem onSelect={() => setCurrentTrack(track.id)} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
        <Play size={14} /> Play Track
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => addToUserQueue(track.id)} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
        <ListMusic size={14} /> Add to Queue
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => setIsPlaylistAddModalOpen(true)} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
        <Plus size={14} /> Add to Playlist
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => setIsStatsModalOpen(true)} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
        <Info size={14} /> Stats for Nerds
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => incrementMemories(track.id)} className="flex items-center justify-between gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
        <div className="flex items-center gap-3">
          <Brain size={14} /> Add Memory
        </div>
        {track.memories > 0 && <span className="text-[10px] font-mono text-zinc-500">({track.memories})</span>}
      </ContextMenuItem>
      {track.memories > 0 && (
        <ContextMenuItem onSelect={() => decrementMemories(track.id)} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
          <Minus size={14} /> Remove Memory
        </ContextMenuItem>
      )}
      <ContextMenuSeparator className="bg-zinc-800" />
      {track.spotifyUrl && (
        <ContextMenuItem onSelect={() => handleCopyLink(track.spotifyUrl)} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
          <LinkIcon size={14} /> Copy Spotify Link
        </ContextMenuItem>
      )}
      {track.geniusUrl && (
        <ContextMenuItem onSelect={() => handleCopyLink(track.geniusUrl)} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
          <LinkIcon size={14} /> Copy Genius Link
        </ContextMenuItem>
      )}
      {track.youtubeMusicUrl && (
        <ContextMenuItem onSelect={() => handleCopyLink(track.youtubeMusicUrl)} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
          <LinkIcon size={14} /> Copy YouTube Music Link
        </ContextMenuItem>
      )}
      <ContextMenuSeparator className="bg-zinc-800" />
      <ContextMenuItem onSelect={() => setIsEditTrackModalOpen(true)} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
        <Edit2 size={14} /> Edit Track
      </ContextMenuItem>
      <ContextMenuItem onSelect={handleDeleteTrack} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-red-500 hover:bg-red-900/20 cursor-pointer">
        <Trash2 size={14} /> Delete Track
      </ContextMenuItem>
    </ContextMenuContent>
  );

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {/* Allow wrapping children to be the default trigger */}
          {children}
        </ContextMenuTrigger>
        {trigger && (
          <ContextMenuTrigger asChild>
            {/* Provide an additional trigger if specified */}
            {trigger}
          </ContextMenuTrigger>
        )}
        {contextMenuContent}
      </ContextMenu>
      <CreatePlaylistAddModal trackToAdd={track} open={isPlaylistAddModalOpen} onOpenChange={setIsPlaylistAddModalOpen} />
      <EditTrackModal track={track} open={isEditTrackModalOpen} onOpenChange={setIsEditTrackModalOpen} />
      <StatsForNerdsModal track={track} open={isStatsModalOpen} onOpenChange={setIsStatsModalOpen} />
    </>
  );
};