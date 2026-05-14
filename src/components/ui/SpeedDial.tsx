"use client";

import React, { useState } from 'react';
import { Plus, Mic2, Disc, BookOpen, ListMusic, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateArtistModal } from '@/components/modals/CreateArtistModal';
import { CreateAlbumModal } from '@/components/modals/CreateAlbumModal';
import { CreateJournalEntryModal } from '@/components/modals/CreateJournalEntryModal';
import { CreatePlaylistModal } from '@/components/modals/CreatePlaylistModal';

export const SpeedDial = () => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { icon: Mic2, label: 'Artist', modal: CreateArtistModal, color: 'bg-blue-600' },
    { icon: Disc, label: 'Album', modal: CreateAlbumModal, color: 'bg-zinc-600' },
    { icon: ListMusic, label: 'Playlist', modal: CreatePlaylistModal, color: 'bg-emerald-600' },
    { icon: BookOpen, label: 'Journal', modal: CreateJournalEntryModal, color: 'bg-purple-600' },
  ];

  return (
    <div className="fixed bottom-24 right-8 z-50 flex flex-col items-end gap-4">
      {/* Action Buttons */}
      <div className={cn(
        "flex flex-col items-end gap-3 transition-all duration-300 origin-bottom",
        isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-0 opacity-0 translate-y-10 pointer-events-none"
      )}>
        {actions.map((action, i) => (
          <div key={i} className="flex items-center gap-3 group">
            <span className="bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity">
              {action.label}
            </span>
            <action.modal>
              <button 
                onClick={() => setIsOpen(false)}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 transition-transform",
                  action.color
                )}
              >
                <action.icon size={20} />
              </button>
            </action.modal>
          </div>
        ))}
      </div>

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95",
          isOpen ? "bg-zinc-800 rotate-45" : "bg-purple-600"
        )}
      >
        {isOpen ? <X size={24} /> : <Plus size={28} />}
      </button>
    </div>
  );
};