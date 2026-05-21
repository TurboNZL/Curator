"use client";

import React from 'react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Track } from '@/types/music';
import { useMusicStore } from '@/store/useMusicStore';
import { toast } from 'sonner';
import { ListMusic, Plus, Info, Edit2, Play, Trash2, Heart, X, Minus } from 'lucide-react';
import { CreatePlaylistAddModal } from '../modals/CreatePlaylistAddModal';
import { StatsForNerdsModal } from '../modals/StatsForNerdsModal';
import { EditTrackModal } from '../modals/EditTrackModal';

interface TrackRightClickMenuProps {
  track: Track;
  children: React.ReactNode;
}

export const TrackRightClickMenu: React.FC<TrackRightClickMenuProps> = ({ track, children }) => {
  const { setCurrentTrack, addToUserQueue, incrementMemories, decrementMemories, deleteTrack, fetchData } = useMusicStore();
  const [isCreatePlaylistAddModalOpen, setIsCreatePlaylistAddModalOpen] = React.useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = React.useState(false);
  const [isEditTrackModalOpen, setIsEditTrackModalOpen] = React.useState(false);

  const handlePlayNext = () => {
    addToUserQueue(track.id);
    toast.success(`'${track.title}' added to queue`);
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete '${track.title}'? This action cannot be undone.`)) {
      await deleteTrack(track.id);
      toast.success(`'${track.title}' deleted`);
      fetchData(); // Refresh data after deletion
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-64 bg-zinc-950 border-zinc-800 text-white">
          <ContextMenuLabel className="text-sm font-bold text-white truncate max-w-[calc(100%-1rem)]">{track.title}</ContextMenuLabel>
          <ContextMenuSeparator className="bg-zinc-800" />
          <ContextMenuItem onClick={() => setCurrentTrack(track.id)} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <Play size={14} /> Play Now
          </ContextMenuItem>
          <ContextMenuItem onClick={handlePlayNext} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <ListMusic size={14} /> Play Next
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setIsCreatePlaylistAddModalOpen(true)} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <Plus size={14} /> Add to Playlist
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-zinc-800" />
          <ContextMenuItem onClick={() => incrementMemories(track.id)} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <Heart size={14} /> Add to Memories ({track.memories})
          </ContextMenuItem>
          <ContextMenuItem onClick={() => decrementMemories(track.id)} disabled={track.memories === 0} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <Minus size={14} /> Remove from Memories ({track.memories})
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-zinc-800" />
          <ContextMenuItem onClick={() => setIsStatsModalOpen(true)} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <Info size={14} /> Stats for Nerds
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setIsEditTrackModalOpen(true)} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <Edit2 size={14} /> Edit Metadata
          </ContextMenuItem>
          <ContextMenuItem onClick={handleDelete} className="flex items-center gap-2 text-xs font-medium text-red-500 cursor-pointer">
            <Trash2 size={14} /> Delete Track
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <CreatePlaylistAddModal trackToAdd={track} albumToAdd={undefined} open={isCreatePlaylistAddModalOpen} onOpenChange={setIsCreatePlaylistAddModalOpen} />
      <StatsForNerdsModal track={track} open={isStatsModalOpen} onOpenChange={setIsStatsModalOpen} />
      <EditTrackModal track={track} open={isEditTrackModalOpen} onOpenChange={setIsEditTrackModalOpen} />
    </>
  );
};