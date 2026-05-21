"use client";

import React from 'react';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Play, Edit2, List, Plus, Minus, Info, Link as LinkIcon, Trash2 } from 'lucide-react';
import { useMusicStore } from '@/store/useMusicStore';
import { Track } from '@/types/music';
import { toast } from 'sonner';

interface TrackDropdownMenuItemsProps {
  track: Track;
  setSelectedTrackForPlaylistAdd: (track: Track | null) => void;
  setIsCreatePlaylistAddModalOpen: (isOpen: boolean) => void;
  setSelectedTrackForEdit: (track: Track | null) => void;
  setIsEditTrackModalOpen: (isOpen: boolean) => void;
  setSelectedTrackForStats: (track: Track | null) => void;
  setIsStatsModalOpen: (isOpen: boolean) => void;
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
  const { setCurrentTrack, addToUserQueue, incrementMemories, decrementMemories, deleteTrack } = useMusicStore();

  const handleCopyLink = (url?: string) => {
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } else {
      toast.error("No link available for this item.");
    }
  };

  return (
    <>
      <DropdownMenuItem
        onClick={(e) => { e.stopPropagation(); setCurrentTrack(track.id); }}
        className="text-xs font-medium"
      >
        <Play size={14} className="mr-2" /> Play
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={(e) => { e.stopPropagation(); setSelectedTrackForEdit(track); setIsEditTrackModalOpen(true); }}
        className="text-xs font-medium"
      >
        <Edit2 size={14} className="mr-2" /> Edit Track
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={(e) => { e.stopPropagation(); addToUserQueue(track.id); toast.success(`"${track.title}" added to queue.`); }}
        className="text-xs font-medium"
      >
        <List size={14} className="mr-2" /> Add to Queue
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={(e) => { e.stopPropagation(); incrementMemories(track.id); toast.success(`Memory added for "${track.title}".`); }}
        className="text-xs font-medium"
      >
        <Plus size={14} className="mr-2" /> Add Memory
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={(e) => { e.stopPropagation(); decrementMemories(track.id); toast.success(`Memory removed for "${track.title}".`); }}
        disabled={track.memories === 0}
        className="text-xs font-medium"
      >
        <Minus size={14} className="mr-2" /> Remove Memory
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={(e) => { e.stopPropagation(); setSelectedTrackForPlaylistAdd(track); setIsCreatePlaylistAddModalOpen(true); }}
        className="text-xs font-medium"
      >
        <Plus size={14} className="mr-2" /> Add to Playlist
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={(e) => { e.stopPropagation(); setSelectedTrackForStats(track); setIsStatsModalOpen(true); }}
        className="text-xs font-medium"
      >
        <Info size={14} className="mr-2" /> Stats for Nerds
      </DropdownMenuItem>
      {track.spotifyUrl && (
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyLink(track.spotifyUrl); }} className="text-xs font-medium">
          <LinkIcon size={14} className="mr-2" /> Copy Spotify Link
        </DropdownMenuItem>
      )}
      {track.geniusUrl && (
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyLink(track.geniusUrl); }} className="text-xs font-medium">
          <LinkIcon size={14} className="mr-2" /> Copy Genius Link
        </DropdownMenuItem>
      )}
      {track.youtubeMusicUrl && (
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyLink(track.youtubeMusicUrl); }} className="text-xs font-medium">
          <LinkIcon size={14} className="mr-2" /> Copy YouTube Music Link
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator className="bg-zinc-800" />
      <DropdownMenuItem
        onClick={(e) => { e.stopPropagation(); if (confirm(`Are you sure you want to delete "${track.title}"?`)) { deleteTrack(track.id); } }}
        className="text-xs font-medium text-red-500"
      >
        <Trash2 size={14} className="mr-2" /> Delete Track
      </DropdownMenuItem>
    </>
  );
};