"use client";

import React, { useState } from 'react';
import { Plus, User, Disc, Music, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CreateArtistModal } from '../modals/CreateArtistModal';
import { CreateAlbumModal } from '../modals/CreateAlbumModal';
import { CreateTrackModal } from '../modals/CreateTrackModal';
import { CreateJournalEntryModal } from '../modals/CreateJournalEntryModal';

export const SpeedDial = () => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { icon: User, label: 'Artist', modal: CreateArtistModal, color: 'bg-blue-600' },
    { icon: Disc, label: 'Album', modal: CreateAlbumModal, color: 'bg-indigo-600' },
    { icon: Music, label: 'Track', modal: CreateTrackModal, color: 'bg-emerald-600' },
    { icon: BookOpen, label: 'Entry', modal: CreateJournalEntryModal, color: 'bg-purple-600' },
  ];

  return (
    <div className="relative flex flex-col items-start gap-3">
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-4 flex flex-col items-start gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {actions.map((action, i) => (
            <action.modal key={i}>
              <button
                className="flex items-center gap-3 group"
                onClick={() => setIsOpen(false)}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110",
                  action.color
                )}>
                  <action.icon size={18} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors bg-zinc-950/80 px-2 py-1 rounded border border-zinc-800">
                  {action.label}
                </span>
              </button>
            </action.modal>
          ))}
        </div>
      )}

      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-12 h-12 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center p-0",
          isOpen ? "bg-zinc-800 text-white rotate-45" : "bg-blue-600 text-white hover:bg-blue-500"
        )}
      >
        <Plus size={24} />
      </Button>
    </div>
  );
};