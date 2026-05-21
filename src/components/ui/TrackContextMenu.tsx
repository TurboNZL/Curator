"use client";

import React, { useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import {
  MoreVertical,
  Edit2,
  List,
  Plus,
  Minus,
  Info,
  Link as LinkIcon,
  Trash2,
  Play
} from 'lucide-react';
import { Track } from '@/types/music';
import { useMusicStore } from '@/store/useMusicStore';
import { toast } from 'sonner';
import { CreatePlaylistAddModal } from '../modals/CreatePlaylistAddModal';
import { StatsForNerdsModal } from '../modals/StatsForNerdsModal';
import { EditTrackModal } from '../modals/EditTrackModal';

interface TrackContextMenuProps {
  track: Track;
  children: React.ReactNode;
  hidePlayButton?: boolean; // Optional prop to hide the direct play button if needed
}

export const TrackContextMenu = ({ track, children, hidePlayButton = false }: TrackContextMenuProps) => {
  const { 
    setCurrentTrack, 
    addToUserQueue, 
    incrementMemories, 
    decrementMemories, 
    deleteTrack 
  } = useMusicStore();

  const [isCreatePlaylistAddModalOpen, setIsCreatePlaylistAddModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isEditTrackModalOpen, setIsEditTrackModalOpen] = useState(false);

  const handleCopyLink = (url?: string) => {
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } else {
      toast.error("No link available for this item.");
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56 bg-zinc-950 border-zinc-800 text-white p-1">
        <DropdownMenuItem
          onClick={(e) => { e.stopPropagation(); setCurrentTrack(track.id); }}
          className="text-xs font-medium cursor-pointer"
        >
          <Play size={14} className="mr-2" /> Play Now
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            addToUserQueue(track.id);
            toast.success(`"${track.title}" added to queue.`);
          }}
          className="text-xs font-medium cursor-pointer"
        >
          <List size={14} className="mr-2" /> Add to Queue
        </DropdownMenuItem>
        <ContextMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            setIsEditTrackModalOpen(true);
          }}
          className="text-xs font-medium cursor-pointer"
        >
          <Edit2 size={14} className="mr-2" /> Edit Track
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            incrementMemories(track.id);
            toast.success(`Memory added for "${track.title}".`);
          }}
          className="text-xs font-medium cursor-pointer"
        >
          <Plus size={14} className="mr-2" /> Add Memory
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            decrementMemories(track.id);
            toast.success(`Memory removed for "${track.title}".`);
          }}
          disabled={track.memories === 0}
          className="text-xs font-medium cursor-pointer"
        >
          <Minus size={14} className="mr-2" /> Remove Memory
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            setIsCreatePlaylistAddModalOpen(true);
          }}
          className="text-xs font-medium cursor-pointer"
        >
          <Plus size={14} className="mr-2" /> Add to Playlist
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            setIsStatsModalOpen(true);
          }}
          className="text-xs font-medium cursor-pointer"
        >
          <Info size={14} className="mr-2" /> Stats for Nerds
        </DropdownMenuItem>
        {track.spotifyUrl && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyLink(track.spotifyUrl); }} className="text-xs font-medium cursor-pointer">
            <LinkIcon size={14} className="mr-2" /> Copy Spotify Link
          </DropdownMenuItem>
        )}
        {track.geniusUrl && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyLink(track.geniusUrl); }} className="text-xs font-medium cursor-pointer">
            <LinkIcon size={14} className="mr-2" /> Copy Genius Link
          </DropdownMenuItem>
        )}
        {track.youtubeMusicUrl && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyLink(track.youtubeMusicUrl); }} className="text-xs font-medium cursor-pointer">
            <LinkIcon size={14} className="mr-2" /> Copy YouTube Music Link
          </DropdownMenuItem>
        )}
        <ContextMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete "${track.title}"? This cannot be undone.`)) {
              deleteTrack(track.id);
            }
          }}
          className="text-xs font-medium text-red-500 cursor-pointer"
        >
          <Trash2 size={14} className="mr-2" /> Delete Track
        </DropdownMenuItem>
      </ContextMenuContent>

      <CreatePlaylistAddModal trackToAdd={track} albumToAdd={undefined} open={isCreatePlaylistAddModalOpen} onOpenChange={setIsCreatePlaylistAddModalOpen} />
      <StatsForNerdsModal track={track} open={isStatsModalOpen} onOpenChange={setIsStatsModalOpen} />
      <EditTrackModal track={track} open={isEditTrackModalOpen} onOpenChange={setIsEditTrackModalOpen} />
    </ContextMenu>
  );
};