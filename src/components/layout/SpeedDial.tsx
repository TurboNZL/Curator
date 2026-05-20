"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Disc, Mic2, ListMusic, Brain, FileAudio, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateArtistModal } from '../modals/CreateArtistModal';
import { CreateAlbumModal } from '../modals/CreateAlbumModal';
import { CreateTrackModal } from '../modals/CreateTrackModal';
import { CreateJournalEntryModal } from '../modals/CreateJournalEntryModal';
import { CreatePlaylistModal } from '../modals/CreatePlaylistModal';
import { RelationalBioModal } from '../modals/RelationalBioModal';

export const SpeedDial = () => {
  const [isArtistModalOpen, setIsArtistModalOpen] = useState(false);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);

  // Actions now just trigger the open state of the respective modal
  const actions = [
    { icon: Mic2, label: "New Artist", onClick: () => setIsArtistModalOpen(true) },
    { icon: Disc, label: "New Album", onClick: () => setIsAlbumModalOpen(true) },
    { icon: FileAudio, label: "New Track", onClick: () => setIsTrackModalOpen(true) },
    { icon: Brain, label: "Journal Entry", onClick: () => setIsJournalModalOpen(true) },
    { icon: ListMusic, label: "New Playlist", onClick: () => setIsPlaylistModalOpen(true) },
    { icon: Users, label: "New Relational Bio", onClick: () => setIsBioModalOpen(true) },
  ];

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="w-full h-14 rounded-xl shadow-lg bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-wider text-sm flex items-center justify-center gap-2">
            <Plus size={20} />
            Quick Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60 bg-zinc-950 border-zinc-800 text-white p-2">
          {actions.map((action) => (
            <DropdownMenuItem 
              key={action.label} 
              className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer"
              onSelect={action.onClick} // Use onSelect to trigger modal opening
            >
              <action.icon size={18} />
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Render controlled modals as siblings */}
      <CreateArtistModal open={isArtistModalOpen} onOpenChange={setIsArtistModalOpen} />
      <CreateAlbumModal open={isAlbumModalOpen} onOpenChange={setIsAlbumModalOpen} />
      <CreateTrackModal open={isTrackModalOpen} onOpenChange={setIsTrackModalOpen} />
      <CreateJournalEntryModal open={isJournalModalOpen} onOpenChange={setIsJournalModalOpen} />
      <CreatePlaylistModal open={isPlaylistModalOpen} onOpenChange={setIsPlaylistModalOpen} />
      <RelationalBioModal open={isBioModalOpen} onOpenChange={setIsBioModalOpen} />
    </div>
  );
};