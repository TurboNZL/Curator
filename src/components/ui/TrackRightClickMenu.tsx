"use client";

import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Play, Music, Plus, Trash2, Info, Edit2, Zap, Bookmark, Minus } from "lucide-react";
import { useMusicStore } from "@/store/useMusicStore";
import { Track } from '../../server/types/music'; // Corrected import path
import { CreatePlaylistAddModal } from '../modals/CreatePlaylistAddModal';
import { StatsForNerdsModal } from "../modals/StatsForNerdsModal";
import { EditTrackModal } from "../modals/EditTrackModal";
import { TrackDropdownMenuItems } from "./TrackDropdownMenuItems"; // Import the new component

interface TrackRightClickMenuProps {
  children: React.ReactNode;
  track: Track;
}

export const TrackRightClickMenu: React.FC<TrackRightClickMenuProps> = ({ children, track }) => {
  const [isCreatePlaylistAddModalOpen, setIsCreatePlaylistAddModalOpen] = useState(false);
  const [selectedTrackForPlaylistAdd, setSelectedTrackForPlaylistAdd] = useState<Track | null>(null);
  const [isEditTrackModalOpen, setIsEditTrackModalOpen] = useState(false);
  const [selectedTrackForEdit, setSelectedTrackForEdit] = useState<Track | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [selectedTrackForStats, setSelectedTrackForStats] = useState<Track | null>(null);

  const handleOpenChange = (open: boolean) => {
    // This function handles the visibility of the context menu.
    // It's not directly responsible for opening modals, but the modals
    // will be rendered conditionally and controlled by their own state.
    if (!open) {
      setSelectedTrackForPlaylistAdd(null);
      setSelectedTrackForEdit(null);
      setSelectedTrackForStats(null);
    }
  };

  return (
    <>
      <DropdownMenu onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-zinc-950 border-zinc-800 text-white" align="end">
          <TrackDropdownMenuItems
            track={track}
            setSelectedTrackForPlaylistAdd={setSelectedTrackForPlaylistAdd}
            setIsCreatePlaylistAddModalOpen={setIsCreatePlaylistAddModalOpen}
            setSelectedTrackForEdit={setSelectedTrackForEdit}
            setIsEditTrackModalOpen={setIsEditTrackModalOpen}
            setSelectedTrackForStats={setSelectedTrackForStats}
            setIsStatsModalOpen={setIsStatsModalOpen}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <CreatePlaylistAddModal
        trackToAdd={selectedTrackForPlaylistAdd || undefined}
        albumToAdd={undefined}
        open={isCreatePlaylistAddModalOpen}
        onOpenChange={setIsCreatePlaylistAddModalOpen}
      />
      {selectedTrackForEdit && (
        <EditTrackModal
          track={selectedTrackForEdit}
          open={isEditTrackModalOpen}
          onOpenChange={setIsEditTrackModalOpen}
        />
      )}
      {selectedTrackForStats && (
        <StatsForNerdsModal
          track={selectedTrackForStats}
          open={isStatsModalOpen}
          onOpenChange={setIsStatsModalOpen}
        />
      )}
    </>
  );
};