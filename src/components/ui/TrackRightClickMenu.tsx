"use client";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Track } from "@/types/music";
import React from "react";
import { TrackDropdownMenuItems } from "./TrackDropdownMenuItems";
import { CreatePlaylistAddModal } from '../modals/CreatePlaylistAddModal';
import { EditTrackModal } from '../modals/EditTrackModal';
import { StatsForNerdsModal } from '../modals/StatsForNerdsModal';

interface TrackRightClickMenuProps {
  track: Track;
  children: React.ReactNode;
}

export const TrackRightClickMenu: React.FC<TrackRightClickMenuProps> = ({
  track,
  children,
}) => {
  const [isPlaylistAddModalOpen, setIsPlaylistAddModalOpen] =
    React.useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);

  const [selectedTrackForPlaylistAdd, setSelectedTrackForPlaylistAdd] =
    React.useState<Track | null>(null);
  const [selectedTrackForEdit, setSelectedTrackForEdit] =
    React.useState<Track | null>(null);
  const [selectedTrackForStats, setSelectedTrackForStats] =
    React.useState<Track | null>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-zinc-950 border-zinc-800 text-white"
        >
          <TrackDropdownMenuItems
            track={track}
            setSelectedTrackForPlaylistAdd={setSelectedTrackForPlaylistAdd}
            setIsCreatePlaylistAddModalOpen={setIsPlaylistAddModalOpen}
            setSelectedTrackForEdit={setSelectedTrackForEdit}
            setIsEditTrackModalOpen={setIsEditModalOpen}
            setSelectedTrackForStats={setSelectedTrackForStats}
            setIsStatsModalOpen={setIsStatsModalOpen}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      {selectedTrackForPlaylistAdd && (
        <CreatePlaylistAddModal
          trackToAdd={selectedTrackForPlaylistAdd}
          open={isPlaylistAddModalOpen}
          onOpenChange={setIsPlaylistAddModalOpen}
        />
      )}
      {selectedTrackForEdit && (
        <EditTrackModal
          track={selectedTrackForEdit}
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
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