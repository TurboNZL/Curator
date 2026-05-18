"use client";

import React from 'react';
import {
  MoreHorizontal,
  ListPlus,
  User,
  Disc,
  Plus,
  Minus,
  Link as LinkIcon
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Track } from '@/types/music';
import { toast } from 'sonner';
import { useMusicStore } from '@/store/useMusicStore';
import { useNavigate } from 'react-router-dom';
import { RelationalBioModal } from '../modals/RelationalBioModal';

interface TrackContextMenuProps {
  track: Track;
  children?: React.ReactNode;
}

export const TrackContextMenu = ({ track, children }: TrackContextMenuProps) => {
  const { addToUserQueue, incrementMemories, decrementMemories, albums, groups } = useMusicStore();
  const navigate = useNavigate();

  const album = albums.find(al => track.albumIds.includes(al.id));
  const trackGroups = groups.filter(g => g.members?.some(m => m.entityId === track.id && m.entityType === 'track'));

  const MenuItems = ({ isContext = false }: { isContext?: boolean }) => {
    const Item = isContext ? ContextMenuItem : DropdownMenuItem;
    const Label = isContext ? ContextMenuLabel : DropdownMenuLabel;
    const Separator = isContext ? ContextMenuSeparator : DropdownMenuSeparator;

    return (
      <>
        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Track Actions
        </Label>
        
        <Item
          className="text-xs font-bold gap-2 focus:bg-zinc-900 focus:text-blue-400 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            addToUserQueue(track.id);
            toast.success("Added to queue");
          }}
        >
          <ListPlus size={14} /> Add to Queue
        </Item>

        <Separator className="bg-zinc-800" />

        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Navigation
        </Label>

        <Item
          className="text-xs font-bold gap-2 focus:bg-zinc-900 focus:text-blue-400 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/artists/${track.artistId}`);
          }}
        >
          <User size={14} /> Go to Artist
        </Item>

        {album && (
          <Item
            className="text-xs font-bold gap-2 focus:bg-zinc-900 focus:text-blue-400 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/albums/${album.id}`);
            }}
          >
            <Disc size={14} /> Go to Album
          </Item>
        )}

        <Separator className="bg-zinc-800" />

        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Relational Bios ({trackGroups.length})
        </Label>

        {trackGroups.map(group => (
          <RelationalBioModal key={group.id} groupId={group.id}>
            <Item
              className="text-xs font-bold gap-2 focus:bg-zinc-900 focus:text-purple-400 cursor-pointer"
              onSelect={(e) => e.preventDefault()}
            >
              <LinkIcon size={14} /> {group.name}
            </Item>
          </RelationalBioModal>
        ))}

        <RelationalBioModal initialEntity={{ type: 'track', id: track.id, label: track.title }}>
          <Item
            className="text-xs font-bold gap-2 focus:bg-zinc-900 focus:text-emerald-400 cursor-pointer"
            onSelect={(e) => e.preventDefault()}
          >
            <Plus size={14} /> New Bio
          </Item>
        </RelationalBioModal>

        <Separator className="bg-zinc-800" />

        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Memories ({track.memories || 0})
        </Label>

        <Item
          className="text-xs font-bold gap-2 focus:bg-zinc-900 focus:text-purple-400 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            incrementMemories(track.id);
          }}
        >
          <Plus size={14} /> Add Memory
        </Item>

        <Item
          className="text-xs font-bold gap-2 focus:bg-zinc-900 focus:text-red-400 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            decrementMemories(track.id);
          }}
        >
          <Minus size={14} /> Remove Memory
        </Item>
      </>
    );
  };

  // If children are provided, we are wrapping a row for right-click only
  if (children) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56 bg-zinc-950 border-zinc-800 text-white">
          <MenuItems isContext />
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  // Otherwise, we are the three-dots button (left-click dropdown + right-click context)
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-zinc-950 border-zinc-800 text-white">
            <MenuItems />
          </DropdownMenuContent>
        </DropdownMenu>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56 bg-zinc-950 border-zinc-800 text-white">
        <MenuItems isContext />
      </ContextMenuContent>
    </ContextMenu>
  );
};