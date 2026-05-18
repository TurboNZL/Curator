"use client";

import React from 'react';
import {
  MoreHorizontal,
  Music2,
  Youtube,
  Cloud,
  ListPlus,
  ExternalLink,
  Heart,
  User,
  Disc,
  Brain,
  Plus,
  Minus,
  Link as LinkIcon
} from 'lucide-react';
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
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  const openLink = (url?: string) => {
    if (!url) return toast.error("Link not available for this track");
    window.open(url, '_blank');
  };

  const album = albums.find(al => track.albumIds.includes(al.id));
  const trackGroups = groups.filter(g => g.members?.some(m => m.entityId === track.id && m.entityType === 'track'));

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setOpen(true);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <div onContextMenu={handleContextMenu} className="contents">
        <DropdownMenuTrigger asChild>
          {children || (
            <button className="h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
              <MoreHorizontal size={16} />
            </button>
          )}
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent
        align="start"
        className="w-56 bg-zinc-950 border-zinc-800 text-white"
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
        }}
      >
        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Track Actions
        </DropdownMenuLabel>
        
        <DropdownMenuItem
          className="text-xs font-bold gap-2 focus:bg-zinc-900 focus:text-blue-400 cursor-pointer"
          onClick={() => {
            addToUserQueue(track.id);
            toast.success("Added to queue");
          }}
        >
          <ListPlus size={14} /> Add to Queue
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-zinc-800" />

        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Navigation
        </DropdownMenuLabel>

        <DropdownMenuItem
          className="text-xs font-bold gap-2 focus:bg-zinc-900 focus:text-blue-400 cursor-pointer"
          onClick={() => navigate(`/artists/${track.artistId}`)}
        >
          <User size={14} /> Go to Artist
        </DropdownMenuItem>

        {album && (
          <DropdownMenuItem
            className="text-xs font-bold gap-2 focus:bg-zinc-900 focus:text-blue-400 cursor-pointer"
            onClick={() => navigate(`/albums/${album.id}`)}
          >
            <Disc size={14} /> Go to Album
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="bg-zinc-800" />

        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Relational Bios ({trackGroups.length})
        </DropdownMenuLabel>

        {trackGroups.map(group => (
          <RelationalBioModal key={group.id} groupId={group.id}>
            <DropdownMenuItem
              className="text-xs font-bold gap-2 focus:bg-zinc-900 focus:text-purple-400 cursor-pointer"
              onSelect={(e) => e.preventDefault()}
            >
              <LinkIcon size={14} /> {group.name}
            </DropdownMenuItem>
          </RelationalBioModal>
        ))}

        <RelationalBioModal initialEntity={{ type: 'track', id: track.id, label: track.title }}>
          <DropdownMenuItem
            className="text-xs font-bold gap-2 focus:bg-zinc-900 focus:text-emerald-400 cursor-pointer"
            onSelect={(e) => e.preventDefault()}
          >
            <Plus size={14} /> New Bio
          </DropdownMenuItem>
        </RelationalBioModal>

        <DropdownMenuSeparator className="bg-zinc-800" />

        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Memories ({track.memories || 0})
        </DropdownMenuLabel>

        <DropdownMenuItem
          className="text-xs font-bold gap-2 focus:bg-zinc-900 focus:text-purple-400 cursor-pointer"
          onClick={() => incrementMemories(track.id)}
        >
          <Plus size={14} /> Add Memory
        </DropdownMenuItem>

        <DropdownMenuItem
          className="text-xs font-bold gap-2 focus:bg-zinc-900 focus:text-red-400 cursor-pointer"
          onClick={() => decrementMemories(track.id)}
        >
          <Minus size={14} /> Remove Memory
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-zinc-800" />
        
        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          External Platforms
        </DropdownMenuLabel>
        
        <DropdownMenuItem
          className="text-xs font-bold gap-2 focus:bg-zinc-900 focus:text-green-400 cursor-pointer"
          onClick={() => openLink(track.spotifyUrl)}
        >
          <Music2 size={14} /> Play with Spotify
        </DropdownMenuItem>
        
        <DropdownMenuItem
          className="text-xs font-bold gap-2 focus:bg-zinc-900 focus:text-red-400 cursor-pointer"
          onClick={() => openLink(track.youtubeMusicUrl)}
        >
          <Youtube size={14} /> Play with YT Music
        </DropdownMenuItem>
        
        <DropdownMenuItem
          className="text-xs font-bold gap-2 focus:bg-zinc-900 focus:text-orange-400 cursor-pointer"
          onClick={() => openLink(track.soundcloudUrl)}
        >
          <Cloud size={14} /> Play with SoundCloud
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-zinc-800" />
        
        <DropdownMenuItem
          className="text-xs font-bold gap-2 focus:bg-zinc-900 focus:text-yellow-400 cursor-pointer"
          onClick={() => openLink(track.geniusUrl)}
        >
          <ExternalLink size={14} /> View on Genius
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
