"use client";

import React, { useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuPortal,
} from "@/components/ui/context-menu";
import {
  ListMusic,
  Plus,
  Info,
  Edit2,
  Trash2,
  Share2,
  BookOpen,
  Minus,
} from "lucide-react";
import { useMusicStore } from "@/store/useMusicStore";
import { toast } from "sonner";
import { CreatePlaylistAddModal } from "../modals/CreatePlaylistAddModal";
import { Track } from "@/types/music";
import { EditTrackModal } from "../modals/EditTrackModal";
import { StatsForNerdsModal } from "../modals/StatsForNerdsModal";

interface TrackContextMenuProps {
  children: React.ReactNode;
  track: Track;
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({
  children,
  track,
}) => {
  const {
    artists,
    albums,
    addToUserQueue,
    incrementMemories,
    decrementMemories,
    deleteTrack,
  } = useMusicStore();
  const artist = artists.find((a) => a.id === track.artistId);
  const album = albums.find((al) =>
    track.albumIds?.some((aId) => aId.albumId === al.id),
  );

  const [isPlaylistAddModalOpen, setIsPlaylistAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false); // State for StatsForNerdsModal

  const handleAddToQueue = () => {
    addToUserQueue(track.id);
    toast.success(`"${track.title}" added to queue`);
  };

  const handleUpdateMemories = async (amount: number) => {
    if (amount > 0) {
      await incrementMemories(track.id);
      toast.success(`Memory added for "${track.title}"`);
    } else {
      await decrementMemories(track.id);
      toast.success(`Memory removed for "${track.title}"`);
    }
  };

  const handleDeleteTrack = async () => {
    if (
      confirm(
        `Are you sure you want to delete "${track.title}"? This cannot be undone.`,
      )
    ) {
      await deleteTrack(track.id);
      toast.success(`"${track.title}" deleted`);
    }
  };


  const handleShareTrack = () => {
    const shareUrl = track.spotifyUrl || track.youtubeMusicUrl;
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Track link copied to clipboard!");
    } else {
      toast.error("No shareable link available for this track.");
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-56 bg-zinc-950 border-zinc-800 text-white p-2">
          <ContextMenuItem onClick={handleAddToQueue} className="text-xs">
            <Plus size={14} className="mr-2" /> Add to Queue
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => setIsPlaylistAddModalOpen(true)}
            className="text-xs"
          >
            <ListMusic size={14} className="mr-2" /> Add to Playlist
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-zinc-800" />
          <ContextMenuSub>
            <ContextMenuSubTrigger className="text-xs">
              <BookOpen size={14} className="mr-2" /> Log a Memory ({track.memories || 0})
            </ContextMenuSubTrigger>
            <ContextMenuPortal>
              <ContextMenuSubContent className="w-48 bg-zinc-950 border-zinc-800 text-white p-2">
                <ContextMenuItem onClick={() => handleUpdateMemories(1)} className="text-xs">
                  <Plus size={14} className="mr-2" /> Add Memory
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleUpdateMemories(-1)} className="text-xs">
                  <Minus size={14} className="mr-2" /> Remove Memory
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuPortal>
          </ContextMenuSub>
          <ContextMenuSeparator className="bg-zinc-800" />
          <ContextMenuItem onClick={() => setIsEditModalOpen(true)} className="text-xs">
            <Edit2 size={14} className="mr-2" /> Edit Track Metadata
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setIsStatsModalOpen(true)} className="text-xs">
            <Info size={14} className="mr-2" /> Stats for Nerds
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-zinc-800" />
          <ContextMenuItem onClick={handleShareTrack} className="text-xs">
            <Share2 size={14} className="mr-2" /> Share
          </ContextMenuItem>
          <ContextMenuItem
            onClick={handleDeleteTrack}
            className="text-xs text-red-500"
          >
            <Trash2 size={14} className="mr-2" /> Delete Track
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <EditTrackModal
        track={track}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
      />
      <StatsForNerdsModal
        track={track}
        artist={artist}
        album={album}
        open={isStatsModalOpen}
        onOpenChange={setIsStatsModalOpen}
      >
        {/* Empty div as children for StatsForNerdsModal as it's not strictly a trigger here */}
        <div /> 
      </StatsForNerdsModal>
      <CreatePlaylistAddModal
        trackToAdd={track}
        open={isPlaylistAddModalOpen}
        onOpenChange={setIsPlaylistAddModalOpen}
      />
    </>
  );
};