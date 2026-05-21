"use client";

import React, { useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Track } from '@/types/music';
import { useMusicStore } from '@/store/useMusicStore';
import { toast } from 'sonner';
import { Edit2, List, Plus, Minus, Info, Trash2, Link as LinkIcon } from 'lucide-react';
import { CreatePlaylistAddModal } from '../modals/CreatePlaylistAddModal';
import { StatsForNerdsModal } from '../modals/StatsForNerdsModal';
import { EditTrackModal } from '../modals/EditTrackModal';

interface TrackContextMenuProps {
  children: React.ReactNode;
  track: Track;
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({ children, track }) => {
  const { deleteTrack, addToUserQueue, incrementMemories, decrementMemories } = useMusicStore();
  const [isCreatePlaylistAddModalOpen, setIsCreatePlaylistAddModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isEditTrackModalOpen, setIsEditTrackModalOpen] = useState(false);

  const handleCopyLink = (targetTrack: Track) => {
    let urlToCopy = '';
    if (targetTrack.spotifyUrl) urlToCopy = targetTrack.spotifyUrl;
    else if (targetTrack.youtubeMusicUrl) urlToCopy = targetTrack.youtubeMusicUrl;
    else if (targetTrack.geniusUrl) urlToCopy = targetTrack.geniusUrl;

    if (urlToCopy) {
      navigator.clipboard.writeText(urlToCopy);
      toast.success("Link copied to clipboard!");
    } else {
      toast.error("No link available for this track.");
    }
  };

  const copyLabel = track.spotifyUrl
    ? 'Copy Spotify Link'
    : track.youtubeMusicUrl
    ? 'Copy YouTube Music Link'
    : track.geniusUrl
    ? 'Copy Genius Link'
    : 'Copy Link';

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-64 bg-zinc-950 border-zinc-800 text-white">
          <ContextMenuItem onClick={() => { setIsEditTrackModalOpen(true); }} className="text-xs font-medium">
            <Edit2 size={14} className="mr-2" /> Edit Track
          </ContextMenuItem>
          <ContextMenuItem onClick={() => { addToUserQueue(track.id); toast.success(`"${track.title}" added to queue.`); }} className="text-xs font-medium">
            <List size={14} className="mr-2" /> Add to Queue
          </ContextMenuItem>
          <ContextMenuItem onClick={() => { incrementMemories(track.id); toast.success(`Memory added for "${track.title}".`); }} className="text-xs font-medium">
            <Plus size={14} className="mr-2" /> Add Memory
          </ContextMenuItem>
          <ContextMenuItem onClick={() => { decrementMemories(track.id); toast.success(`Memory removed for "${track.title}".`); }} disabled={track.memories === 0} className="text-xs font-medium">
            <Minus size={14} className="mr-2" /> Remove Memory
          </ContextMenuItem>
          <ContextMenuItem onClick={() => { setIsCreatePlaylistAddModalOpen(true); }} className="text-xs font-medium">
            <Plus size={14} className="mr-2" /> Add to Playlist
          </ContextMenuItem>
          <ContextMenuItem onClick={() => { setIsStatsModalOpen(true); }} className="text-xs font-medium">
            <Info size={14} className="mr-2" /> Stats for Nerds
          </ContextMenuItem>
          {(track.spotifyUrl || track.youtubeMusicUrl || track.geniusUrl) && (
            <ContextMenuItem onClick={() => handleCopyLink(track)} className="text-xs font-medium">
              <LinkIcon size={14} className="mr-2" /> {copyLabel}
            </ContextMenuItem>
          )}
          <ContextMenuSeparator className="bg-zinc-800" />
          <ContextMenuItem onClick={() => { if (confirm(`Are you sure you want to delete "${track.title}"?`)) { deleteTrack(track.id); } }} className="text-xs font-medium text-red-500">
            <Trash2 size={14} className="mr-2" /> Delete Track
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <CreatePlaylistAddModal trackToAdd={track} open={isCreatePlaylistAddModalOpen} onOpenChange={setIsCreatePlaylistAddModalOpen} />
      <StatsForNerdsModal track={track} open={isStatsModalOpen} onOpenChange={setIsStatsModalOpen} />
      <EditTrackModal track={track} open={isEditTrackModalOpen} onOpenChange={setIsEditTrackModalOpen} />
    </>
  );
};