"use client";

import React, { useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "@/components/ui/context-menu";
import { useMusicStore } from "@/store/useMusicStore";
import { Track } from "@/types/music";
import { toast } from "sonner";
import {
  Play,
  List,
  Plus,
  Minus,
  Info,
  Edit2,
  Link as LinkIcon,
  ExternalLink,
  Brain,
  User,
  Disc,
} from "lucide-react";
import { CreatePlaylistAddModal } from "@/components/modals/CreatePlaylistAddModal";
import { StatsForNerdsModal } from "@/components/modals/StatsForNerdsModal";
import { EditTrackModal } from "@/components/modals/EditTrackModal";
import { Link } from "react-router-dom"; // Import Link for navigation

interface TrackContextMenuProps {
  children: React.ReactNode;
  track: Track;
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({
  children,
  track,
}) => {
  const {
    setCurrentTrack,
    addToUserQueue,
    incrementMemories,
    decrementMemories,
    artists,
    albums,
  } = useMusicStore();

  const [isCreatePlaylistAddModalOpen, setIsCreatePlaylistAddModalOpen] =
    useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isEditTrackModalOpen, setIsEditTrackModalOpen] = useState(false);

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const handleOpenLink = (url: string) => {
    window.open(url, "_blank");
  };

  const trackAlbum = albums.find((al) =>
    track.albumIds?.some((aId) => aId.albumId === al.id),
  );
  const trackArtist = artists.find((a) => a.id === track.artistId);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-64 bg-zinc-950 border-zinc-800 text-white">
          <ContextMenuItem onClick={() => setCurrentTrack(track.id)} className="text-xs font-medium">
            <Play size={14} className="mr-2" /> Play
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              addToUserQueue(track.id);
              toast.success(`"${track.title}" added to queue.`);
            }}
            className="text-xs font-medium"
          >
            <List size={14} className="mr-2" /> Add to Queue
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => setIsCreatePlaylistAddModalOpen(true)}
            className="text-xs font-medium"
          >
            <Plus size={14} className="mr-2" /> Add to Playlist
          </ContextMenuItem>

          <ContextMenuSeparator className="bg-zinc-800" />
          
          <ContextMenuItem
            onClick={() => setIsEditTrackModalOpen(true)}
            className="text-xs font-medium"
          >
            <Edit2 size={14} className="mr-2" /> Edit Track
          </ContextMenuItem>

          <ContextMenuItem disabled className="text-xs font-medium opacity-100 !cursor-default text-zinc-300">
            <Brain size={14} className="mr-2" /> Memories: {track.memories}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              incrementMemories(track.id);
              toast.success(`Memory added for "${track.title}".`);
            }}
            className="text-xs font-medium"
          >
            <Plus size={14} className="mr-2" /> Add Memory
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              decrementMemories(track.id);
              toast.success(`Memory removed for "${track.title}".`);
            }}
            disabled={track.memories === 0}
            className="text-xs font-medium"
          >
            <Minus size={14} className="mr-2" /> Remove Memory
          </ContextMenuItem>

          {(track.spotifyUrl || track.geniusUrl || track.youtubeMusicUrl) && (
            <>
              <ContextMenuSeparator className="bg-zinc-800" />
              <ContextMenuSub>
                <ContextMenuSubTrigger className="text-xs font-medium">
                  <LinkIcon size={14} className="mr-2" /> Copy Link
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-48 bg-zinc-950 border-zinc-800 text-white">
                  {track.spotifyUrl && (
                    <ContextMenuItem
                      onClick={() => handleCopyLink(track.spotifyUrl!)}
                      className="text-xs font-medium"
                    >
                      Spotify
                    </ContextMenuItem>
                  )}
                  {track.geniusUrl && (
                    <ContextMenuItem
                      onClick={() => handleCopyLink(track.geniusUrl!)}
                      className="text-xs font-medium"
                    >
                      Genius
                    </ContextMenuItem>
                  )}
                  {track.youtubeMusicUrl && (
                    <ContextMenuItem
                      onClick={() => handleCopyLink(track.youtubeMusicUrl!)}
                      className="text-xs font-medium"
                    >
                      YouTube Music
                    </ContextMenuItem>
                  )}
                </ContextMenuSubContent>
              </ContextMenuSub>

              <ContextMenuSub>
                <ContextMenuSubTrigger className="text-xs font-medium">
                  <ExternalLink size={14} className="mr-2" /> Open With
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-48 bg-zinc-950 border-zinc-800 text-white">
                  {track.spotifyUrl && (
                    <ContextMenuItem
                      onClick={() => handleOpenLink(track.spotifyUrl!)}
                      className="text-xs font-medium"
                    >
                      Spotify
                    </ContextMenuItem>
                  )}
                  {track.geniusUrl && (
                    <ContextMenuItem
                      onClick={() => handleOpenLink(track.geniusUrl!)}
                      className="text-xs font-medium"
                    >
                      Genius
                    </ContextMenuItem>
                  )}
                  {track.youtubeMusicUrl && (
                    <ContextMenuItem
                      onClick={() => handleOpenLink(track.youtubeMusicUrl!)}
                      className="text-xs font-medium"
                    >
                      YouTube Music
                    </ContextMenuItem>
                  )}
                </ContextMenuSubContent>
              </ContextMenuSub>
            </>
          )}

          {(trackArtist || trackAlbum) && (
            <>
              <ContextMenuSeparator className="bg-zinc-800" />
              <ContextMenuSub>
                <ContextMenuSubTrigger className="text-xs font-medium">
                  Go To
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-48 bg-zinc-950 border-zinc-800 text-white">
                  {trackArtist && (
                    <Link to={`/artists/${trackArtist.id}`} className="block">
                      <ContextMenuItem className="text-xs font-medium">
                        <User size={14} className="mr-2" /> Artist Page
                      </ContextMenuItem>
                    </Link>
                  )}
                  {trackAlbum && (
                    <Link to={`/albums/${trackAlbum.id}`} className="block">
                      <ContextMenuItem className="text-xs font-medium">
                        <Disc size={14} className="mr-2" /> Album Page
                      </ContextMenuItem>
                    </Link>
                  )}
                </ContextMenuSubContent>
              </ContextMenuSub>
            </>
          )}

          <ContextMenuSeparator className="bg-zinc-800" />

          <ContextMenuItem
            onClick={() => setIsStatsModalOpen(true)}
            className="text-xs font-medium"
          >
            <Info size={14} className="mr-2" /> Stats for Nerds
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <CreatePlaylistAddModal
        trackToAdd={track}
        albumToAdd={undefined}
        open={isCreatePlaylistAddModalOpen}
        onOpenChange={setIsCreatePlaylistAddModalOpen}
      />
      <StatsForNerdsModal
        track={track}
        open={isStatsModalOpen}
        onOpenChange={setIsStatsModalOpen}
      />
      <EditTrackModal
        track={track}
        open={isEditTrackModalOpen}
        onOpenChange={setIsEditTrackModalOpen}
      />
    </>
  );
};