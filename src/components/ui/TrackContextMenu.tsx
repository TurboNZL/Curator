"use client";

import React from "react";
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
  Trash2,
  Edit2,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";

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
    deleteTrack,
  } = useMusicStore();

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const handleOpenLink = (url: string) => {
    window.open(url, "_blank");
  };

  return (
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

        <ContextMenuSeparator className="bg-zinc-800" />
        <ContextMenuItem
          onClick={() => {
            if (confirm(`Are you sure you want to delete "${track.title}"?`)) {
              deleteTrack(track.id);
            }
          }}
          className="text-xs font-medium text-red-500"
        >
          <Trash2 size={14} className="mr-2" /> Delete Track
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};