"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Text, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Album, Credit } from '@/types/music'; // Import Credit type
import { ArtistCreditSelect } from '../shared/ArtistCreditSelect'; // Import ArtistCreditSelect

interface AlbumCreditsResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  album: Album | null;
  onResolve: (albumId: string, credits: string[], artistCredits: Credit[]) => Promise<void>;
}

export const AlbumCreditsResolutionModal: React.FC<AlbumCreditsResolutionModalProps> = ({ isOpen, onClose, album, onResolve }) => {
  const [generalCreditsText, setGeneralCreditsText] = useState('');
  const [artistSpecificCredits, setArtistSpecificCredits] = useState<Credit[]>([]);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (isOpen && album) {
      setGeneralCreditsText(album.credits.join(', '));
      setArtistSpecificCredits(album.artistCredits || []);
    }
  }, [isOpen, album]);

  const handleSubmit = async () => {
    if (!album) return;
    
    const generalCreditsArray = generalCreditsText.split(',').map(s => s.trim()).filter(Boolean);

    setIsResolving(true);
    try {
      await onResolve(album.id, generalCreditsArray, artistSpecificCredits);
      toast.success("Album credits updated successfully.");
      onClose();
    } catch (error) {
      console.error("Failed to update album credits:", error);
      toast.error("Failed to update album credits.");
    } finally {
      setIsResolving(false);
    }
  };

  if (!album) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Text size={20} className="text-blue-500" />
            Resolve Album Credits
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Add credits for: <span className="font-bold text-white">{album.title}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="general-credits-text" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">General Credits (comma separated)</Label>
            <Textarea
              id="general-credits-text"
              value={generalCreditsText}
              onChange={(e) => setGeneralCreditsText(e.target.value)}
              placeholder="e.g. Mixed by Dr. Dre, Mastered by Mike Dean"
              className="bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500 min-h-[100px]"
            />
          </div>
          <ArtistCreditSelect
            value={artistSpecificCredits}
            onChange={setArtistSpecificCredits}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isResolving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isResolving} className="bg-blue-600 hover:bg-blue-500 font-bold uppercase tracking-wider">
            {isResolving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Credits'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};