"use client";

import React, { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useMusicStore } from "@/store/useMusicStore";
import { toast } from "sonner";
import { Track } from "@/types/music";
import { Edit2, List, Plus, Minus, Info, Trash2, Link as LinkIcon } from "lucide-react"; // Added LinkIcon

interface TrackContextMenuProps {
  children: ReactNode;
  track: Track;
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({ children, track }) => {
  const { 
    setCurrentTrack, 
    addToUserQueue, 
    incrementMemories, 
    decrementMemories, 
    deleteTrack 
  } = useMusicStore();

  const handlePlay = () => {
    setCurrentTrack(track.id);
    toast.success(`Playing "${track.title}"`);
  };

  const handleCopyLink = () => {
    let urlToCopy = '';
    let linkType = '';

    if (track.spotifyUrl) {
      urlToCopy = track.spotifyUrl;
      linkType = 'Spotify';
    } else if (track.youtubeMusicUrl) {
      urlToCopy = track.youtubeMusicUrl;
      linkType = 'YouTube Music';
    } else if (track.geniusUrl) {
      urlToCopy = track.geniusUrl;
      linkType = 'Genius';
    }

    if (urlToCopy) {
      navigator.clipboard.writeText(urlToCopy);
      toast.success(`${linkType} link copied!`);
    } else {
      toast.error("No link available for this track.");
    }
  };

  // Helper to determine the label for the copy link action
  const getCopyLinkLabel = () => {
    if (track.spotifyUrl) return "Copy Spotify Link";
    if (track.youtubeMusicUrl) return "Copy YouTube Music Link";
    if (track.geniusUrl) return "Copy Genius Link";
    return "No Link Available";
  };

  const hasCopyLink = track.spotifyUrl || track.youtubeMusicUrl || track.geniusUrl;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64 bg-zinc-950 border-zinc-800 text-white">
        <ContextMenuItem onClick={handlePlay} className="text-xs font-medium">
          <List className="mr-2 h-4 w-4" /> Play Now
        </ContextMenuItem>
        <ContextMenuItem onClick={() => addToUserQueue(track.id)} className="text-xs font-medium">
          <Plus className="mr-2 h-4 w-4" /> Add to Queue
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-zinc-800" />
        <ContextMenuItem onClick={() => incrementMemories(track.id)} className="text-xs font-medium">
          <Plus className="mr-2 h-4 w-4" /> Add Memory
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={() => decrementMemories(track.id)} 
          disabled={track.memories === 0} 
          className="text-xs font-medium"
        >
          <Minus className="mr-2 h-4 w-4" /> Remove Memory
        </ContextMenuItem>
        {hasCopyLink && (
          <ContextMenuItem onClick={handleCopyLink} className="text-xs font-medium">
            <LinkIcon className="mr-2 h-4 w-4" /> {getCopyLinkLabel()}
          </ContextMenuItem>
        )}
        <ContextMenuSeparator className="bg-zinc-800" />
        <ContextMenuItem 
          onClick={() => { if (confirm(`Are you sure you want to delete "${track.title}"?`)) deleteTrack(track.id); }} 
          className="text-xs font-medium text-red-500"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete Track
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};