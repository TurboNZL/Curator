import React, { useState } from 'react';
import { Plus, Users, Disc, Music, ListMusic, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CreateArtistModal } from '../modals/CreateArtistModal';
import { CreateAlbumModal } from '../modals/CreateAlbumModal';
import { CreatePlaylistModal } from '../modals/CreatePlaylistModal';
import { CreateJournalEntryModal } from '../modals/CreateJournalEntryModal';
import { CreateTrackModal } from '../modals/CreateTrackModal';

export const SpeedDial = () => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { icon: Users, label: 'Artist', modal: CreateArtistModal, color: 'bg-blue-600' },
    { icon: Disc, label: 'Album', modal: CreateAlbumModal, color: 'bg-purple-600' },
    { icon: Music, label: 'Track', modal: CreateTrackModal, color: 'bg-pink-600', props: { albumId: '', artistId: '' } },
    { icon: ListMusic, label: 'Playlist', modal: CreatePlaylistModal, color: 'bg-emerald-600' },
    { icon: BookOpen, label: 'Journal', modal: CreateJournalEntryModal, color: 'bg-zinc-700' },
  ];

  return (
    <div className="fixed bottom-24 right-8 flex flex-col items-end gap-4 z-50">
      <div className={cn(
        "flex flex-col gap-3 transition-all duration-300 origin-bottom",
        isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-0 opacity-0 translate-y-10 pointer-events-none"
      )}>
        {actions.map((action, i) => (
          <div key={action.label} className="flex items-center gap-3 group">
            <span className="bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity">
              {action.label}
            </span>
            <action.modal {...(action.props || {})}>
              <Button 
                size="icon" 
                className={cn("w-12 h-12 rounded-full shadow-xl hover:scale-110 transition-transform", action.color)}
              >
                <action.icon size={20} />
              </Button>
            </action.modal>
          </div>
        ))}
      </div>

      <Button 
        onClick={() => setIsOpen(!isOpen)}
        size="icon" 
        className={cn(
          "w-14 h-14 rounded-full bg-white text-black shadow-2xl hover:scale-105 transition-all",
          isOpen && "rotate-45 bg-zinc-800 text-white"
        )}
      >
        <Plus size={28} />
      </Button>
    </div>
  );
};