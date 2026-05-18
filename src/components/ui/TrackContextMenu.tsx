"use client";

import React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ListMusic, Play, Heart, Plus, Share, Edit2, Trash2 } from 'lucide-react';
import { Track } from '@/types/music';
import { useMusicStore } from '@/store/useMusicStore';
import { EditTrackModal } from '@/components/modals/EditTrackModal';
import { CreatePlaylistAddModal } from '@/components/modals/CreatePlaylistAddModal';
import { toast } from 'sonner';

interface TrackContextMenuProps {
  track: Track;
  children?: React.ReactElement; // Expects a single React element for the trigger
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({ track, children }) => {
  const { setCurrentTrack, addToUserQueue, deleteTrack } = useMusicStore();

  const handlePlayNext = () => {
    addToUserQueue(track.id);
    toast.success(`'${track.title}' added to queue.`);
  };

  const handleShare = () => {
    const url = track.spotifyUrl || track.youtubeMusicUrl || `Track: ${track.title} by ${track.artistId}`; // Fallback text
    navigator.clipboard.writeText(url);
    toast.success("Track link copied to clipboard!");
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete '${track.title}'? This cannot be undone.`)) {
      await deleteTrack(track.id);
      toast.success("Track deleted.");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children || ( // Render children if provided, otherwise render the default button
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white">
            <ListMusic size={14} />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-zinc-950 border-zinc-800 text-white">
        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{track.title}</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem onClick={() => setCurrentTrack(track.id)} className="text-xs font-medium">
          <Play size={14} className="mr-2" /> Play Now
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePlayNext} className="text-xs font-medium">
          <Plus size={14} className="mr-2" /> Play Next
        </DropdownMenuItem>
        <CreatePlaylistAddModal trackToAdd={track}>
          <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-xs font-medium">
             {/* The actual trigger will be inside the modal */}
            <Plus size={14} className="mr-2" /> Add to Playlist
          </DropdownMenuItem>
        </CreatePlaylistAddModal>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem onClick={handleShare} className="text-xs font-medium">
          <Share size={14} className="mr-2" /> Share
        </DropdownMenuItem>
        <EditTrackModal track={track}>
          <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-xs font-medium">
            <Edit2 size={14} className="mr-2" /> Edit Track
          </DropdownMenuItem>
        </EditTrackModal>
        <DropdownMenuItem onClick={handleDelete} className="text-xs font-medium text-red-500">
          <Trash2 size={14} className="mr-2" /> Delete Track
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};