"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Play, ListMusic, Star, BookOpen, Brain, Trash2, Edit2 } from "lucide-react";
import { useMusicStore } from '@/store/useMusicStore';
import { toast } from 'sonner';
import { Track } from '@/types/music';
import { StatsForNerdsModal } from '../modals/StatsForNerdsModal';
import { EditTrackModal } from '../modals/EditTrackModal';
import { CreatePlaylistAddModal } from '../modals/CreatePlaylistAddModal';


interface TrackContextMenuProps {
  track: Track;
  children?: React.ReactNode;
}

export const TrackContextMenu = ({ track, children }: TrackContextMenuProps) => {
  const { setCurrentTrack, addToUserQueue, incrementMemories, updateTrack } = useMusicStore();

  const handleAddToQueue = (trackId: string) => {
    addToUserQueue(trackId);
    toast.info(`"${track.title}" added to queue.`);
  };

  const handleToggleFavorite = async () => {
    await updateTrack(track.id, { isFavorite: !track.isFavorite });
    toast.success(`"${track.title}" ${track.isFavorite ? 'removed from' : 'added to'} favorites.`);
  };

  const handleIncrementMemory = async () => {
    await incrementMemories(track.id);
    toast.success(`Memory count for "${track.title}" increased!`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white">
            <MoreHorizontal size={16} />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-zinc-950 border-zinc-800 text-white">
        <DropdownMenuLabel className="text-xs font-bold uppercase tracking-widest text-zinc-500 truncate max-w-[200px]">{track.title}</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem onClick={() => setCurrentTrack(track.id)} className="text-xs font-medium">
          <Play size={14} className="mr-2" /> Play Next
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAddToQueue(track.id)} className="text-xs font-medium">
          <ListMusic size={14} className="mr-2" /> Add to Queue
        </DropdownMenuItem>
        <CreatePlaylistAddModal trackToAdd={track}>
          <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-xs font-medium">
            <Plus size={14} className="mr-2" /> Add to Playlist
          </DropdownMenuItem>
        </CreatePlaylistAddModal>
        <DropdownMenuItem onClick={handleToggleFavorite} className="text-xs font-medium">
          <Star size={14} className="mr-2" /> {track.isFavorite ? 'Unfavorite' : 'Favorite'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleIncrementMemory} className="text-xs font-medium">
          <Brain size={14} className="mr-2" /> Add Memory
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <StatsForNerdsModal track={track}>
          <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-xs font-medium">
            <BookOpen size={14} className="mr-2" /> Stats for Nerds
          </DropdownMenuItem>
        </StatsForNerdsModal>
        <EditTrackModal track={track}>
          <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-xs font-medium">
            <Edit2 size={14} className="mr-2" /> Edit Metadata
          </DropdownMenuItem>
        </EditTrackModal>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem onClick={() => useMusicStore.getState().deleteTrack(track.id)} className="text-xs font-medium text-red-500">
          <Trash2 size={14} className="mr-2" /> Delete Track
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};