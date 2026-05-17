"use client";

import React, { useState } from 'react';
import { Plus, Music, Disc, Users, ListMusic, BookOpen, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateArtistModal } from '../modals/CreateArtistModal';
import { CreateAlbumModal } from '../modals/CreateAlbumModal';
import { CreateTrackModal } from '../modals/CreateTrackModal';
import { CreatePlaylistModal } from '../modals/CreatePlaylistModal';
import { CreateJournalEntryModal } from '../modals/CreateJournalEntryModal';

export const SpeedDial = () => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { icon: BookOpen, label: 'Journal', modal: CreateJournalEntryModal, color: 'bg-purple-600' },
    { icon: ListMusic, label: 'Playlist', modal: CreatePlaylistModal, color: 'bg-emerald-600' },
    { icon: Users, label: 'Artist', modal: CreateArtistModal, color: 'bg-violet-600' },
    { icon: Disc, label: 'Album', modal: CreateAlbumModal, color: 'bg-indigo-600' },
    { icon: Music, label: 'Track', modal: CreateTrackModal, color: 'bg-blue-600' },
  ];

  return (
    <div className="relative flex flex-col items-start gap-4 z-50">
      {/* Action Buttons */}
      <div className={cn(
        "absolute bottom-full left-0 mb-4 flex flex-col items-start gap-3 transition-all duration-300 origin-bottom-left",
        isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4 pointer-events-none"
      )}>
        {actions.map((action, index) => (
          <div 
            key={action.label} 
            className="flex items-center gap-3"
            style={{ transitionDelay: `${index * 50}ms` }}
          >
            <action.modal>
              <button className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-transform",
                action.color
              )}>
                <action.icon size={20} />
              </button>
            </action.modal>
            <span className="bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-zinc-800 shadow-xl">
              {action.label}
            </span>
          </div>
        ))}
      </div>

      {/* Main Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-2xl transition-all duration-300",
          isOpen ? "bg-zinc-800 rotate-0" : "bg-purple-600 hover:bg-purple-500"
        )}
      >
        {isOpen ? <X size={28} /> : <Plus size={28} />}
      </button>
    </div>
  );
};
