"use client";

import React, { useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { Play, ListMusic, Brain, Info, Link as LinkIcon, Edit2, Trash2 } from 'lucide-react';
import { Track } from '@/types/music';
import { StatsForNerdsModal } from '@/components/modals/StatsForNerdsModal';
import { CreatePlaylistAddModal } from '../modals/CreatePlaylistAddModal';
import { EditTrackModal } from '../modals/EditTrackModal';
import { useMusicStore } from '@/store/useMusicStore';
import { toast } from 'sonner';

interface TrackContextMenuProps {
  track: Track;
  children: React.ReactNode;
}

export const TrackContextMenu = ({ track, children }: TrackContextMenuProps) => {
  const { incrementMemories, decrementMemories, deleteTrack, setCurrentTrack } = useMusicStore();
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isPlaylistAddModalOpen, setIsPlaylistAddModalOpen] = useState(false);
  const [isEditTrackModalOpen, setIsEditTrackModalOpen] = useState(false);

  // Determine if track has specific URLs to show copy options
  const hasSpotify = !!track.spotifyUrl;
  const hasGenius = !!track.geniusUrl;
  const hasYoutubeMusic = !!track.youtubeMusicUrl;

  const handleCopyLink = (url?: string) => {
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } else {
      toast.error("No link available for this item.");
    }
  };

  const handleEditTrack = () => {
    setIsEditTrackModalOpen(true);
  };

  const handleDeleteTrack = async () => {
    if (confirm(`Are you sure you want to delete "${track.title}"? This action cannot be undone.`)) {
      await deleteTrack(track.id);
      toast.success("Track deleted.");
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-56 bg-zinc-950 border-zinc-800 text-white p-2">
          <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => setCurrentTrack(track.id)}>
            <Play size={14} /> Play Track
          </ContextMenuItem>
          <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => setIsPlaylistAddModalOpen(true)}>
            <ListMusic size={14} /> Add to Playlist
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-zinc-800" />
          <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => incrementMemories(track.id)}>
            <Brain size={14} /> Add Memory (+1) ({track.memories || 0})
          </ContextMenuItem>
          {track.memories && track.memories > 0 && (
            <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => decrementMemories(track.id)}>
              <Brain size={14} /> Remove Memory (-1) ({track.memories || 0})
            </ContextMenuItem>
          )}
          <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => setIsStatsModalOpen(true)}>
            <Info size={14} /> Stats for Nerds
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-zinc-800" />
          {hasSpotify && (
            <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => handleCopyLink(track.spotifyUrl)}>
              <LinkIcon size={14} /> Copy Spotify Link
            </ContextMenuItem>
          )}
          {hasGenius && (
            <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => handleCopyLink(track.geniusUrl)}>
              <LinkIcon size={14} /> Copy Genius Link
            </ContextMenuItem>
          )}
          {hasYoutubeMusic && (
            <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => handleCopyLink(track.youtubeMusicUrl)}>
              <LinkIcon size={14} /> Copy YouTube Music Link
            </ContextMenuItem>
          )}
          <ContextMenuSeparator className="bg-zinc-800" />
          <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={handleEditTrack}>
            <Edit2 size={14} /> Edit Track
          </ContextMenuItem>
          <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-red-500 hover:bg-red-900/20 cursor-pointer" onSelect={handleDeleteTrack}>
            <Trash2 size={14} /> Delete Track
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <StatsForNerdsModal track={track} open={isStatsModalOpen} onOpenChange={setIsStatsModalOpen} />
      <CreatePlaylistAddModal trackToAdd={track} open={isPlaylistAddModalOpen} onOpenChange={setIsPlaylistAddModalOpen} />
      <EditTrackModal track={track} open={isEditTrackModalOpen} onOpenChange={setIsEditTrackModalOpen} />
    </>
  );
};