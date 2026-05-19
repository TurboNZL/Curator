"use client";

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { useMusicStore } from '@/store/useMusicStore';
import { Plus, ListMusic, Brain, Play, Link, Share } from 'lucide-react';
import { CreatePlaylistAddModal } from '../modals/CreatePlaylistAddModal';
import { useState } from 'react';
import { Slot } from '@radix-ui/react-slot'; // Import Slot from Radix UI

interface TrackContextMenuProps {
  track: any; // Assuming 'any' for now, should be 'Track' type
  children: React.ReactNode;
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({ track, children }) => {
  const { setCurrentTrack, incrementMemories, decrementMemories, addToUserQueue } = useMusicStore();
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

  const handlePlayNext = () => {
    addToUserQueue(track.id);
    toast.success(`${track.title} added to queue.`);
  };

  const handleCopyLink = (url: string | undefined, type: string) => {
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success(`${type} link copied to clipboard!`);
    } else {
      toast.error(`No ${type} link available.`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Use Slot to pass props to its child, effectively making it a wrapper for grid layout */}
        <Slot className="contents">
          {children}
        </Slot>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-zinc-950 border-zinc-800 text-white p-2">
        <DropdownMenuItem onClick={() => setCurrentTrack(track.id)} className="flex items-center gap-3 text-xs font-medium">
          <Play size={14} className="text-blue-400" /> Play Now
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePlayNext} className="flex items-center gap-3 text-xs font-medium">
          <ListMusic size={14} className="text-blue-400" /> Add to Queue
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setIsPlaylistModalOpen(true)} className="flex items-center gap-3 text-xs font-medium">
          <Plus size={14} className="text-emerald-400" /> Add to Playlist
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem onClick={() => incrementMemories(track.id)} className="flex items-center gap-3 text-xs font-medium">
          <Brain size={14} className="text-purple-400" /> Add Memory
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => decrementMemories(track.id)} className="flex items-center gap-3 text-xs font-medium">
          <Brain size={14} className="text-purple-400" /> Remove Memory
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem onClick={() => handleCopyLink(track.spotifyUrl, 'Spotify')} className="flex items-center gap-3 text-xs font-medium">
          <Link size={14} className="text-green-500" /> Copy Spotify Link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleCopyLink(track.geniusUrl, 'Genius')} className="flex items-center gap-3 text-xs font-medium">
          <Link size={14} className="text-yellow-500" /> Copy Genius Link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleCopyLink(track.youtubeMusicUrl, 'YouTube Music')} className="flex items-center gap-3 text-xs font-medium">
          <Link size={14} className="text-red-500" /> Copy YouTube Music Link
        </DropdownMenuItem>
      </DropdownMenuContent>
      <CreatePlaylistAddModal 
        trackToAdd={track} 
        open={isPlaylistModalOpen} 
        onOpenChange={setIsPlaylistModalOpen} 
      />
    </DropdownMenu>
  );
};