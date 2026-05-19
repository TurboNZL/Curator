"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Disc, Mic2, ListMusic, Brain, FileAudio, Users, Layers, Download } from "lucide-react";
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
import { ImportAlbumModal } from '../modals/ImportAlbumModal';
import { RelationalBioModal } from '../modals/RelationalBioModal'; // Import RelationalBioModal

export const SpeedDial = () => {
  const [isBioModalOpen, setIsBioModalOpen] = useState(false); // State for RelationalBioModal
  const [isImportAlbumModalOpen, setIsImportAlbumModalOpen] = useState(false); // State for ImportAlbumModal

  const actions = [
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
          {/* Dedicated triggers for controlled modals */}
          <DropdownMenuItem 
            className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer"
            onSelect={() => setIsImportAlbumModalOpen(true)}
          >
            <Download size={18} />
            Import Album
          </DropdownMenuItem>
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
      <ImportAlbumModal isOpen={isImportAlbumModalOpen} onClose={() => setIsImportAlbumModalOpen(false)} />
      <RelationalBioModal open={isBioModalOpen} onOpenChange={setIsBioModalOpen} />
    </div>
  );
};