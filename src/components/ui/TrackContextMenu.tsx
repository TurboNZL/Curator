"use client";

import React, { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Play, ListMusic, Info, Edit2, Trash2, Link as LinkIcon, Brain, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { Track } from '@/types/music';
import { useMusicStore } from '@/store/useMusicStore';
import { EditTrackModal } from '../modals/EditTrackModal';
import { CreatePlaylistAddModal } from '../modals/CreatePlaylistAddModal';
import { StatsForNerdsModal } from '../modals/StatsForNerdsModal';


interface TrackContextMenuProps {
  children: React.ReactNode;
  track: Track;
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({ children, track }) => {
  const { setCurrentTrack, incrementMemories, decrementMemories, deleteTrack } = useMusicStore();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreatePlaylistAddModalOpen, setIsCreatePlaylistAddModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  const handleCopyLink = (url?: string) => {
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } else {
      toast.error("No link available for this item.");
    }
  };

  const handlePlayTrack = (e: Event) => {
    e.stopPropagation();
    setCurrentTrack(track.id);
  }

  const handleDeleteTrack = async (e: Event) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${track.title}"? This action cannot be undone.`)) {
      await deleteTrack(track.id);
      toast.success("Track deleted.");
    }
  }


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-zinc-950 border-zinc-800 text-white p-2">
        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500 truncate">{track.title}</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem onSelect={handlePlayTrack} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
          <Play size={14} /> Play Track
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setIsCreatePlaylistAddModalOpen(true)} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
          <ListMusic size={14} /> Add to Playlist
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem onSelect={() => setIsStatsModalOpen(true)} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
          <Info size={14} /> Stats for Nerds
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); incrementMemories(track.id); }} className="flex items-center justify-between px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
          <div className="flex items-center gap-3">
            <Brain size={14} /> Add Memory
          </div>
          <Plus size={14} />
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); decrementMemories(track.id); }} disabled={(track.memories || 0) === 0} className="flex items-center justify-between px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
          <div className="flex items-center gap-3">
            <Brain size={14} /> Remove Memory
          </div>
          <Minus size={14} />
        </DropdownMenuItem>
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
        <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
          <Edit2 size={14} /> Edit Track
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleDeleteTrack} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-red-500 hover:bg-red-900/20 cursor-pointer">
          <Trash2 size={14} /> Delete Track
        </DropdownMenuItem>
      </DropdownMenuContent>

      <EditTrackModal track={track} open={isEditModalOpen} onOpenChange={setIsEditModalOpen} />
      <CreatePlaylistAddModal trackToAdd={track} open={isCreatePlaylistAddModalOpen} onOpenChange={setIsCreatePlaylistAddModalOpen} />
      <StatsForNerdsModal track={track} open={isStatsModalOpen} onOpenChange={setIsStatsModalOpen} />
    </DropdownMenu>
  );
};