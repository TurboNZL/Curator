"use client";

import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Music, Play, List, Plus, Minus, Info, Trash2, Edit2, Link as LinkIcon, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useMusicStore } from '@/store/useMusicStore';
import { Track } from '@/types/music';
import { CreatePlaylistAddModal } from '../modals/CreatePlaylistAddModal';
import { StatsForNerdsModal } from '../modals/StatsForNerdsModal';
import { EditTrackModal } from '../modals/EditTrackModal';

interface TrackContextMenuProps {
  track: Track;
  children: React.ReactNode;
}

export const TrackContextMenu = ({ track, children }: TrackContextMenuProps) => {
  const { setCurrentTrack, addToUserQueue, incrementMemories, decrementMemories, deleteTrack } = useMusicStore();
  const [isCreatePlaylistAddModalOpen, setIsCreatePlaylistAddModalOpen] = useState(false);
  const [isEditTrackModalOpen, setIsEditTrackModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  const handleCopyLink = (url?: string, type?: string) => {
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success(`${type || 'Link'} copied to clipboard!`);
    } else {
      toast.error("No link available for this item.");
    }
  };

  const availableLinks = [
    { type: 'Spotify', url: track.spotifyUrl },
    { type: 'Genius', url: track.geniusUrl },
    { type: 'YouTube Music', url: track.youtubeMusicUrl },
  ].filter(link => link.url);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-white">
          <DropdownMenuItem onClick={() => setCurrentTrack(track.id)} className="text-xs font-medium">
            <Play size={14} className="mr-2" /> Play Track
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setIsEditTrackModalOpen(true); }} className="text-xs font-medium">
            <Edit2 size={14} className="mr-2" /> Edit Track
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { addToUserQueue(track.id); toast.success(`"${track.title}" added to queue.`); }} className="text-xs font-medium">
            <List size={14} className="mr-2" /> Add to Queue
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { incrementMemories(track.id); toast.success(`Memory added for "${track.title}".`); }} className="text-xs font-medium">
            <Plus size={14} className="mr-2" /> Add Memory
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { decrementMemories(track.id); toast.success(`Memory removed for "${track.title}".`); }} disabled={track.memories === 0} className="text-xs font-medium">
            <Minus size={14} className="mr-2" /> Remove Memory
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setIsCreatePlaylistAddModalOpen(true); }} className="text-xs font-medium">
            <Plus size={14} className="mr-2" /> Add to Playlist
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setIsStatsModalOpen(true); }} className="text-xs font-medium">
            <Info size={14} className="mr-2" /> Stats for Nerds
          </DropdownMenuItem>
          
          {availableLinks.length > 0 && <DropdownMenuSeparator className="bg-zinc-800" />}
          {availableLinks.map((link, index) => (
            <DropdownMenuItem key={index} onClick={() => handleCopyLink(link.url, `${link.type} Link`)} className="text-xs font-medium">
              <LinkIcon size={14} className="mr-2" /> Copy {link.type} Link
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem onClick={() => { if (confirm(`Are you sure you want to delete "${track.title}"?`)) { deleteTrack(track.id); } }} className="text-xs font-medium text-red-500">
            <Trash2 size={14} className="mr-2" /> Delete Track
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreatePlaylistAddModal trackToAdd={track} albumToAdd={undefined} open={isCreatePlaylistAddModalOpen} onOpenChange={setIsCreatePlaylistAddModalOpen} />
      {isEditTrackModalOpen && <EditTrackModal track={track} open={isEditTrackModalOpen} onOpenChange={setIsEditTrackModalOpen} />}
      {isStatsModalOpen && <StatsForNerdsModal track={track} open={isStatsModalOpen} onOpenChange={setIsStatsModalOpen} />}
    </>
  );
};