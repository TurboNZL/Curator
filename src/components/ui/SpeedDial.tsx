"use client";

import React, { useState } from 'react';
import { Plus, Mic2, Disc, Music, ListMusic, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateArtistModal } from '../modals/CreateArtistModal';
import { CreateAlbumModal } from '../modals/CreateAlbumModal';
import { CreateTrackModal } from '../modals/CreateTrackModal';
import { CreatePlaylistModal } from '../modals/CreatePlaylistModal';
import { cn } from '@/lib/utils';

export const SpeedDial = () => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { icon: Mic2, label: 'Artist', modal: CreateArtistModal, color: 'bg-blue-600' },
    { icon: Disc, label: 'Album', modal: CreateAlbumModal, color: 'bg-indigo-600' },
    { icon: Music, label: 'Track', modal: CreateTrackModal, color: 'bg-purple-600' },
    { icon: ListMusic, label: 'Playlist', modal: CreatePlaylistModal, color: 'bg-emerald-600' },
  ];

  return (
    <div className="fixed bottom-32 left-8 flex flex-col items-start gap-4 z-50">
      <div className={cn(
        "flex flex-col gap-3 transition-all duration-300 origin-bottom",
        isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4 pointer-events-none"
      )}>
        {actions.map((action, i) => (
          <action.modal key={i}>
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110",
                action.color
              )}>
                <action.icon size={18} />
              </div>
              <span className="bg-zinc-900 border border-zinc-800 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                {action.label}
              </span>
            </div>
          </action.modal>
        ))}
      </div>

      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full shadow-2xl transition-all duration-300",
          isOpen ? "bg-zinc-800 text-white rotate-0" : "bg-blue-600 text-white hover:bg-blue-500"
        )}
      >
        {isOpen ? <X size={24} /> : <Plus size={24} />}
      </Button>
    </div>
  );
};