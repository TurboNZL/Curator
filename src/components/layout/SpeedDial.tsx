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

// Define a type for modals that can be passed as 'children' to a trigger
type ChildTriggerModal = React.ComponentType<{ children: React.ReactElement }>;

type ActionItem = { 
  icon: React.ComponentType<{ size: number }>, 
  label: string, 
  modal: ChildTriggerModal 
};

export const SpeedDial = () => {
  const [isBioModalOpen, setIsBioModalOpen] = useState(false); // State for RelationalBioModal

  const actions: ActionItem[] = [
    { icon: Mic2, label: "New Artist", modal: CreateArtistModal },
    { icon: Disc, label: "New Album", modal: CreateAlbumModal },
    { icon: FileAudio, label: "New Track", modal: CreateTrackModal },
    { icon: Brain, label: "Journal Entry", modal: CreateJournalEntryModal },
    { icon: ListMusic, label: "New Playlist", modal: CreatePlaylistModal },
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
            <action.modal key={action.label}>
              <DropdownMenuItem className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer">
                <action.icon size={18} />
                {action.label}
              </DropdownMenuItem>
            </action.modal>
          ))}
          {/* Dedicated trigger for RelationalBioModal */}
          <DropdownMenuItem 
            className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer"
            onSelect={() => setIsBioModalOpen(true)}
          >
            <Users size={18} />
            New Relational Bio
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Render controlled modals as siblings */}
      <RelationalBioModal open={isBioModalOpen} onOpenChange={setIsBioModalOpen} />
    </div>
  );
};