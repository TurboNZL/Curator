"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Disc, Mic2, ListMusic, Brain, FileAudio, Users, Download } from "lucide-react";
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
import { ImportAlbumModal } from '../modals/ImportAlbumModal';

// Define ModalName type as suggested
type ModalName =
  | "artist"
  | "album"
  | "track"
  | "journal"
  | "playlist";

// Define ActionItem type as suggested
type ActionItem = {
  icon: React.ComponentType<{ size: number }>;
  label: string;
  type: ModalName;
};

export const SpeedDial = () => {
  // Update useState to use ModalName type
  const [activeModal, setActiveModal] = useState<ModalName | null>(null);
  const [isImportAlbumModalOpen, setIsImportAlbumModal] = useState(false);
  const [isRelationalBioModalOpen, setIsRelationalBioModalOpen] = useState(false);

  // Explicitly type the actions array
  const actions: ActionItem[] = [
    { icon: Mic2, label: "New Artist", type: "artist" },
    { icon: Disc, label: "New Album", type: "album" },
    { icon: FileAudio, label: "New Track", type: "track" },
    { icon: Brain, label: "Journal Entry", type: "journal" },
    { icon: ListMusic, label: "New Playlist", type: "playlist" },
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
              key={action.type}
              onSelect={() => setActiveModal(action.type)}
              className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer"
            >
              <action.icon size={18} />
              {action.label}
            </DropdownMenuItem>
          ))}

          <DropdownMenuItem
            className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer"
            onSelect={() => setIsImportAlbumModal(true)}
          >
            <Download size={18} />
            Import Album
          </DropdownMenuItem>

          <DropdownMenuItem
            className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/50 cursor-pointer"
            onSelect={() => setIsRelationalBioModalOpen(true)}
          >
            <Users size={18} />
            New Relational Bio
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Render modals conditionally based on activeModal state */}
      <CreateArtistModal
        open={activeModal === 'artist'}
        onOpenChange={(open) => {
          if (!open) setActiveModal(null);
        }}
      />

      <CreateAlbumModal
        open={activeModal === 'album'}
        onOpenChange={(open) => {
          if (!open) setActiveModal(null);
        }}
      />

      <CreateTrackModal
        open={activeModal === 'track'}
        onOpenChange={(open) => {
          if (!open) setActiveModal(null);
        }}
      />

      <CreateJournalEntryModal
        open={activeModal === 'journal'}
        onOpenChange={(open) => {
          if (!open) setActiveModal(null);
        }}
      />

      <CreatePlaylistModal
        open={activeModal === 'playlist'}
        onOpenChange={(open) => {
          if (!open) setActiveModal(null);
        }}
      />

      <ImportAlbumModal
        isOpen={isImportAlbumModalOpen}
        onClose={() => setIsImportAlbumModal(false)}
      />

      <RelationalBioModal
        open={isRelationalBioModalOpen}
        onOpenChange={setIsRelationalBioModalOpen}
      />
    </div>
  );
};