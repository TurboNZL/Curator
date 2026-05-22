"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Track } from '@/types/music';

interface GenresResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  onResolve: (trackId: string, genres: string[]) => Promise<void>;
}

export const GenresResolutionModal: React.FC<GenresResolutionModalProps> = ({ isOpen, onClose, track, onResolve }) => {
  const [genresText, setGenresText] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (isOpen && track) {
      setGenresText(track.genres.join(', '));
    }
  }, [isOpen, track]);

  const handleSubmit = async () => {
    if (!track) return;
    
    const genresArray = genresText.split(',').map(s => s.trim()).filter(Boolean);

    setIsResolving(true);
    try {
      await onResolve(track.id, genresArray);
      toast.success("Genres updated successfully.");
      onClose();
    } catch (error) {
      console.error("Failed to update genres:", error);
      toast.error("Failed to update genres.");
    } finally {
      setIsResolving(false);
    }
  };

  if (!track) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Tag size={20} className="text-pink-500" />
            Resolve Genres
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Add genres for: <span className="font-bold text-white">{track.title}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="genres-text" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Genres (comma separated)</Label>
            <Textarea
              id="genres-text"
              value={genresText}
              onChange={(e) => setGenresText(e.target.value)}
              placeholder="e.g. Hip Hop, Trap, R&B"
              className="bg-zinc-900 border-zinc-800 focus-visible:ring-pink-500 min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isResolving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isResolving} className="bg-pink-600 hover:bg-pink-500 font-bold uppercase tracking-wider">
            {isResolving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Genres'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};