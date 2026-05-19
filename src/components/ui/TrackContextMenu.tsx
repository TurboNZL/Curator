"use client";

import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, Plus, Share, Info, Trash2, Edit2, Play, Brain, ListMusic, ListPlus } from "lucide-react";
import { toast } from "sonner";
import { Track } from "@/types/music";
import { useMusicStore } from '@/store/useMusicStore';
import { EditTrackModal } from '../modals/EditTrackModal';
import { StatsForNerdsModal } from '../modals/StatsForNerdsModal';
import { CreatePlaylistAddModal } from '../modals/CreatePlaylistAddModal';

interface TrackContextMenuProps {
  track: Track;
  children: React.ReactNode;
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({ track, children }) => {
  const { setCurrentTrack, addToUserQueue, artists, albums, incrementMemories } = useMusicStore();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isPlaylistAddModalOpen, setIsPlaylistAddModalOpen] = useState(false);

  const artist = artists.find(a => a.id === track.artistId);
  const album = albums.find(al => track.albumIds?.some(aId => aId.albumId === al.id));

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handlePlayNext = () => {
    addToUserQueue(track.id);
    toast.success(`"${track.title}" added to queue.`);
  };

  const handlePlayNow = () => {
    setCurrentTrack(track.id);
    toast.success(`Playing "${track.title}" now.`);
  };

  const handleIncrementMemory = async () => {
    await incrementMemories(track.id);
    toast.success(`Memory for "${track.title}" updated!`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-zinc-950 border-zinc-800 text-white p-2">
          <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            {track.title}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem onClick={handlePlayNow} className="text-xs font-medium gap-2">
            <Play size={14} /> <span>Play Now</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePlayNext} className="text-xs font-medium gap-2">
            <ListPlus size={14} /> <span>Add to Queue</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsPlaylistAddModalOpen(true)} className="text-xs font-medium gap-2">
            <ListMusic size={14} /> <span>Add to Playlist</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem onClick={() => setIsEditModalOpen(true)} className="text-xs font-medium gap-2">
            <Edit2 size={14} /> <span>Edit Track</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleIncrementMemory} className="text-xs font-medium gap-2">
            <Brain size={14} /> <span>Memories: {track.memories || 0}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsStatsModalOpen(true)} className="text-xs font-medium gap-2">
            <Info size={14} /> <span>Stats for Nerds</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem onClick={() => handleCopyToClipboard(track.title, "Title")} className="text-xs font-medium gap-2">
            <Copy size={14} /> <span>Copy Title</span>
          </DropdownMenuItem>
          {artist?.name && (
            <DropdownMenuItem onClick={() => handleCopyToClipboard(artist.name, "Artist Name")} className="text-xs font-medium gap-2">
              <Copy size={14} /> <span>Copy Artist Name</span>
            </DropdownMenuItem>
          )}
          {album?.title && (
            <DropdownMenuItem onClick={() => handleCopyToClipboard(album.title, "Album Title")} className="text-xs font-medium gap-2">
              <Copy size={14} /> <span>Copy Album Title</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditTrackModal track={track} open={isEditModalOpen} onOpenChange={setIsEditModalOpen} />
      <StatsForNerdsModal track={track} artist={artist} album={album} open={isStatsModalOpen} onOpenChange={setIsStatsModalOpen} />
      <CreatePlaylistAddModal trackToAdd={track} open={isPlaylistAddModalOpen} onOpenChange={setIsPlaylistAddModalOpen} />
    </>
  );
};