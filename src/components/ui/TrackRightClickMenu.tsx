"use client";

import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Trash2 } from 'lucide-react';
import { Track } from '@/types/music';
import { useMusicStore } from '@/store/useMusicStore';
import { toast } from 'sonner';

interface TrackRightClickMenuProps {
  track: Track;
  children: React.ReactNode;
}

export const TrackRightClickMenu: React.FC<TrackRightClickMenuProps> = ({ track, children }) => {
  const { deleteTrack } = useMusicStore();

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${track.title}"? This action cannot be undone.`)) {
      await deleteTrack(track.id);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48 bg-zinc-950 border-zinc-800 text-white">
        <ContextMenuItem onClick={handleDelete} className="text-xs font-medium text-red-500 cursor-pointer">
          <Trash2 size={14} className="mr-2" /> <span>Delete Track</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};