"use client";

import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, Plus, Share2, Info, Edit2, Trash2, Heart, Brain, Minus, Play, Link as LinkIcon, Youtube } from "lucide-react";
import { toast } from "sonner";
import { useMusicStore } from "@/store/useMusicStore";
import { Track } from '../../server/types/music'; 
import { CreatePlaylistAddModal } from '../modals/CreatePlaylistAddModal';
import { EditTrackModal } from '../modals/EditTrackModal';
import { StatsForNerdsModal } from '../modals/StatsForNerdsModal';
import { GeniusLinkResolutionModal } from '../modals/GeniusLinkResolutionModal';
import { YoutubeMusicLinkResolutionModal } from '../modals/YoutubeMusicLinkResolutionModal';

interface TrackRightClickMenuProps {
  children: React.ReactNode;
  track: Track;
}

export const TrackRightClickMenu: React.FC<TrackRightClickMenuProps> = ({ children, track }) => {
  const { setCurrentTrack, addToUserQueue, deleteTrack, incrementMemories, decrementMemories, updateTrack } = useMusicStore();
  const [isCreatePlaylistAddModalOpen, setIsCreatePlaylistAddModalOpen] = useState(false);
  const [isEditTrackModalOpen, setIsEditTrackModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isGeniusModalOpen, setIsGeniusModalOpen] = useState(false);
  const [isYoutubeMusicModalOpen, setIsYoutubeMusicModalOpen] = useState(false);

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleDeleteTrack = async () => {
    if (confirm(`Are you sure you want to delete "${track.title}"? This cannot be undone.`)) {
      await deleteTrack(track.id);
      toast.success(`"${track.title}" deleted.`);
    }
  };

  const handleToggleFavorite = async () => {
    await updateTrack(track.id, { isFavorite: !track.isFavorite });
    toast.success(track.isFavorite ? `Removed "${track.title}" from favorites.` : `Added "${track.title}" to favorites.`);
  };

  const handleGeniusResolution = async (trackId: string, geniusUrl: string) => {
    await updateTrack(trackId, { geniusUrl });
    toast.success("Genius URL updated.");
  };

  const handleYoutubeMusicResolution = async (trackId: string, youtubeMusicUrl: string) => {
    await updateTrack(trackId, { youtubeMusicUrl });
    toast.success("YouTube Music URL updated.");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-zinc-950 border-zinc-800 text-white">
          <DropdownMenuItem onClick={() => setCurrentTrack(track.id)} className="text-sm font-medium">
            <Play size={14} className="mr-2" /> Play Now
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => addToUserQueue(track.id)} className="text-sm font-medium">
            <Plus size={14} className="mr-2" /> Add to Queue
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsCreatePlaylistAddModalOpen(true)} className="text-sm font-medium">
            <Plus size={14} className="mr-2" /> Add to Playlist...
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem onClick={() => handleCopyToClipboard(track.title, 'Title')} className="text-sm font-medium">
            <Copy size={14} className="mr-2" /> Copy Title
          </DropdownMenuItem>
          {track.spotifyUrl && (
            <DropdownMenuItem onClick={() => handleCopyToClipboard(track.spotifyUrl!, 'Spotify URL')} className="text-sm font-medium">
              <Share2 size={14} className="mr-2" /> Share Spotify Link
            </DropdownMenuItem>
          )}
          {track.geniusUrl && (
            <DropdownMenuItem onClick={() => handleCopyToClipboard(track.geniusUrl!, 'Genius URL')} className="text-sm font-medium">
              <Share2 size={14} className="mr-2" /> Share Genius Link
            </DropdownMenuItem>
          )}
          {track.youtubeMusicUrl && (
            <DropdownMenuItem onClick={() => handleCopyToClipboard(track.youtubeMusicUrl!, 'YouTube Music URL')} className="text-sm font-medium">
              <Share2 size={14} className="mr-2" /> Share YouTube Music Link
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem onClick={() => setIsEditTrackModalOpen(true)} className="text-sm font-medium">
            <Edit2 size={14} className="mr-2" /> Edit Track
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsStatsModalOpen(true)} className="text-sm font-medium">
            <Info size={14} className="mr-2" /> Stats for Nerds
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleToggleFavorite()} className="text-sm font-medium">
            <Heart size={14} className="mr-2" fill={track.isFavorite ? "currentColor" : "none"} /> {track.isFavorite ? 'Unfavorite' : 'Favorite'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => incrementMemories(track.id)} className="text-sm font-medium">
            <Plus size={14} className="mr-2" /> Add Memory ({track.memories})
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => decrementMemories(track.id)} className="text-sm font-medium">
            <Minus size={14} className="mr-2" /> Remove Memory ({track.memories})
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem onClick={() => handleDeleteTrack()} className="text-sm font-medium text-red-500">
            <Trash2 size={14} className="mr-2" /> Delete Track
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreatePlaylistAddModal trackToAdd={track} open={isCreatePlaylistAddModalOpen} onOpenChange={setIsCreatePlaylistAddModalOpen} />
      <EditTrackModal track={track} open={isEditTrackModalOpen} onOpenChange={setIsEditTrackModalOpen} />
      <StatsForNerdsModal track={track} open={isStatsModalOpen} onOpenChange={setIsStatsModalOpen} />
      <GeniusLinkResolutionModal track={track} isOpen={isGeniusModalOpen} onClose={() => setIsGeniusModalOpen(false)} onResolve={handleGeniusResolution} />
      <YoutubeMusicLinkResolutionModal track={track} isOpen={isYoutubeMusicModalOpen} onClose={() => setIsYoutubeMusicModalOpen(false)} onResolve={handleYoutubeMusicResolution} />
    </>
  );
};