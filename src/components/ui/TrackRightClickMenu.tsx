"use client";

import React, { useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Track } from '@/types/music';
import { TrackDropdownMenuItems } from './TrackDropdownMenuItems';
import { CreatePlaylistAddModal } from '../modals/CreatePlaylistAddModal';
import { StatsForNerdsModal } from '../modals/StatsForNerdsModal';
import { EditTrackModal } from '../modals/EditTrackModal';

interface TrackRightClickMenuProps {
  track: Track;
  children: React.ReactNode;
}

export const TrackRightClickMenu: React.FC<TrackRightClickMenuProps> = ({ track, children }) => {
  const [isCreatePlaylistAddModalOpen, setIsCreatePlaylistAddModalOpen] = useState(false);
  const [isEditTrackModalOpen, setIsEditTrackModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  const handleOpenPlaylistAddModal = () => setIsCreatePlaylistAddModalOpen(true);
  const handleOpenEditTrackModal = () => setIsEditTrackModalOpen(true);
  const handleOpenStatsModal = () => setIsStatsModalOpen(true);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-64 bg-zinc-950 border-zinc-800 text-white p-1 rounded-md shadow-lg">
          <TrackDropdownMenuItems
            track={track}
            onOpenPlaylistAddModal={handleOpenPlaylistAddModal}
            onOpenEditTrackModal={handleOpenEditTrackModal}
            onOpenStatsModal={handleOpenStatsModal}
          />
        </ContextMenuContent>
      </ContextMenu>

      <CreatePlaylistAddModal 
        trackToAdd={track} 
        albumToAdd={undefined} 
        open={isCreatePlaylistAddModalOpen} 
        onOpenChange={setIsCreatePlaylistAddModalOpen} 
      />
      <EditTrackModal 
        track={track} 
        open={isEditTrackModalOpen} 
        onOpenChange={setIsEditTrackModalOpen} 
      />
      <StatsForNerdsModal 
        track={track} 
        open={isStatsModalOpen} 
        onOpenChange={setIsStatsModalOpen} 
      />
    </>
  );
};