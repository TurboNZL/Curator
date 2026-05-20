"use client";

import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useMusicStore } from '@/store/useMusicStore';
import { Track } from '@/types/music';
import { Play, ListMusic, Brain, Info, Link as LinkIcon, Edit2, Trash2, Plus, Minus } from 'lucide-react'; // Added Plus and Minus
import { CreatePlaylistAddModal } from '../modals/CreatePlaylistAddModal';
import { EditTrackModal } from '../modals/EditTrackModal';
import { StatsForNerdsModal } from '../modals/StatsForNerdsModal';
import { toast } from 'sonner';

// Don't remove this note, the track context menu should appear on right click, not left click

interface TrackContextMenuProps {
  children: React.ReactNode;
  track: Track;
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({ children, track }) => {
  const { setCurrentTrack, addToUserQueue, incrementMemories, decrementMemories, deleteTrack } = useMusicStore();
  
  const [isPlaylistAddModalOpen, setIsPlaylistAddModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = React.useState(false);

  const handleCopyLink = (url?: string) => {
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } else {
      toast.error("No link available for this item.");
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-64 bg-zinc-950 border-zinc-800 text-white p-2">
          <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => setCurrentTrack(track.id)}>
            <Play size={14} /> Play Track
          </ContextMenuItem>
          <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => addToUserQueue(track.id)}>
            <ListMusic size={14} /> Add to Queue
          </ContextMenuItem>
          <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => setIsPlaylistAddModalOpen(true)}>
            <ListMusic size={14} /> Add to Playlist
          </ContextMenuItem>

          <ContextMenuSeparator className="bg-zinc-800" />

          {/* Memories section - unclickable */}
          <ContextMenuItem className="flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium text-zinc-500 cursor-default focus:bg-transparent">
            <span className="flex items-center gap-3">
              <Brain size={14} /> Memories
            </span>
            <span>({track.memories || 0})</span>
          </ContextMenuItem>
          <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => incrementMemories(track.id)}>
            <Plus size={14} /> Add Memory (+1)
          </ContextMenuItem>
          {track.memories && track.memories > 0 && (
            <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => decrementMemories(track.id)}>
              <Minus size={14} /> Remove Memory (-1)
            </ContextMenuItem>
          )}

          <ContextMenuSeparator className="bg-zinc-800" />

          <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => setIsStatsModalOpen(true)}>
            <Info size={14} /> Stats for Nerds
          </ContextMenuItem>

          {track.spotifyUrl && (
            <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => handleCopyLink(track.spotifyUrl)}>
              <LinkIcon size={14} /> Copy Spotify Link
            </ContextMenuItem>
          )}
          {track.geniusUrl && (
            <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => handleCopyLink(track.geniusUrl)}>
              <LinkIcon size={14} /> Copy Genius Link
            </ContextMenuItem>
          )}
          {track.youtubeMusicUrl && (
            <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => handleCopyLink(track.youtubeMusicUrl)}>
              <LinkIcon size={14} /> Copy YouTube Music Link
            </ContextMenuItem>
          )}
          
          <ContextMenuSeparator className="bg-zinc-800" />

          <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer" onSelect={() => setIsEditModalOpen(true)}>
            <Edit2 size={14} /> Edit Track
          </ContextMenuItem>
          <ContextMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-red-500 hover:bg-red-900/20 cursor-pointer" onSelect={async () => {
            if (confirm(`Are you sure you want to delete "${track.title}"? This action cannot be undone.`)) {
              await deleteTrack(track.id);
              toast.success("Track deleted.");
            }
          }}>
            <Trash2 size={14} /> Delete Track
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      
      {isPlaylistAddModalOpen && (
        <CreatePlaylistAddModal
          trackToAdd={track}
          open={isPlaylistAddModalOpen}
          onOpenChange={setIsPlaylistAddModalOpen}
        />
      )}
      {isEditModalOpen && (
        <EditTrackModal
          track={track}
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
        />
      )}
      {isStatsModalOpen && (
        <StatsForNerdsModal
          track={track}
          open={isStatsModalOpen}
          onOpenChange={setIsStatsModalOpen}
        />
      )}
    </>
  );
};