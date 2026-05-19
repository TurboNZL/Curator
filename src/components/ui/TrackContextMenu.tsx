"use client";

import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ListMusic,
  Plus,
  Info,
  Edit2,
  Trash2,
  Heart,
  Ban,
  Share2,
  BookOpen,
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
    deleteTrack,
    updateTrack,
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

  const handleIncrementMemories = async () => {
    await incrementMemories(track.id);
    toast.success(`Memory added for "${track.title}"`);
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

  const handleToggleFavorite = async () => {
    await updateTrack(track.id, { isFavorite: !track.isFavorite });
    toast.success(
      `"${track.title}" ${track.isFavorite ? "removed from" : "added to"} favorites`,
    );
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-zinc-950 border-zinc-800 text-white p-2">
          <DropdownMenuItem onClick={handleAddToQueue} className="text-xs">
            <Plus size={14} className="mr-2" /> Add to Queue
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setIsPlaylistAddModalOpen(true)}
            className="text-xs"
          >
            <ListMusic size={14} className="mr-2" /> Add to Playlist
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem onClick={handleIncrementMemories} className="text-xs">
            <BookOpen size={14} className="mr-2" /> Log a Memory
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggleFavorite} className="text-xs">
            <Heart size={14} className="mr-2" />{" "}
            {track.isFavorite ? "Unfavorite" : "Favorite"}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem onClick={() => setIsEditModalOpen(true)} className="text-xs">
            <Edit2 size={14} className="mr-2" /> Edit Track Metadata
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsStatsModalOpen(true)} className="text-xs">
            <Info size={14} className="mr-2" /> Stats for Nerds
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem onClick={handleShareTrack} className="text-xs">
            <Share2 size={14} className="mr-2" /> Share
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDeleteTrack}
            className="text-xs text-red-500"
          >
            <Trash2 size={14} className="mr-2" /> Delete Track
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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