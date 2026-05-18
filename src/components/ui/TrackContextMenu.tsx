"use client";

import React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Plus, Info, Play, ListMusic, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Track } from '@/types/music';
import { useMusicStore } from '@/store/useMusicStore';
import { StatsForNerdsModal } from '@/components/modals/StatsForNerdsModal';
import { EditTrackModal } from '@/components/modals/EditTrackModal';
import { CreatePlaylistAddModal } from '@/components/modals/CreatePlaylistAddModal';

interface TrackContextMenuProps {
  track: Track;
  children: React.ReactNode;
}

export const TrackContextMenu = ({ track, children }: TrackContextMenuProps) => {
  const { setCurrentTrack, incrementMemories, artists, albums, playlists } = useMusicStore();
  const artist = artists.find(a => a.id === track.artistId);
  const album = albums.find(al => track.albumIds.includes(al.id));

  const handlePlayNext = () => {
    useMusicStore.getState().addToUserQueue(track.id);
    incrementMemories(track.id);
  };

  const handlePlayNow = () => {
    setCurrentTrack(track.id, { type: 'track', id: track.id });
    incrementMemories(track.id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white">
            <MoreVertical size={14} />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-white">
        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{track.title}</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem onClick={handlePlayNow} className="text-xs font-medium">
          <Play size={14} className="mr-2 text-emerald-500" /> Play Now
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePlayNext} className="text-xs font-medium">
          <ListMusic size={14} className="mr-2 text-blue-500" /> Play Next
        </DropdownMenuItem>
        <CreatePlaylistAddModal trackToAdd={track}>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-xs font-medium cursor-pointer">
            <Plus size={14} className="mr-2 text-emerald-500" /> Add to Playlist
          </DropdownMenuItem>
        </CreatePlaylistAddModal>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem onClick={() => incrementMemories(track.id)} className="text-xs font-medium">
          <Brain size={14} className="mr-2 text-purple-500" /> Add to Memories
        </DropdownMenuItem>
        <EditTrackModal track={track}>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-xs font-medium cursor-pointer">
            <Edit2 size={14} className="mr-2 text-blue-500" /> Edit Track
          </DropdownMenuItem>
        </EditTrackModal>
        <StatsForNerdsModal track={track} artist={artist} album={album}>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-xs font-medium cursor-pointer">
            <Info size={14} className="mr-2 text-zinc-500" /> Stats for Nerds
          </DropdownMenuItem>
        </StatsForNerdsModal>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};