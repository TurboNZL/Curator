"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Text, Loader2, Tag } from 'lucide-react'; // Added Tag icon
import { toast } from 'sonner';
import { Album, Credit } from '@/../server/types/music'; // Corrected import path
import { ArtistCreditSelect } from '../shared/ArtistCreditSelect';
import { MultiSelectSearch } from '@/components/ui/MultiSelectSearch'; // Import MultiSelectSearch
import { useMusicStore } from '@/store/useMusicStore'; // Import useMusicStore

interface AlbumCreditsResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  album: Album | null;
  onResolve: (albumId: string, artistCredits: Credit[], genres: string[]) => Promise<void>;
  initialGenres: string[];
}

export const AlbumCreditsResolutionModal: React.FC<AlbumCreditsResolutionModalProps> = ({ isOpen, onClose, album, onResolve, initialGenres }) => {
  const { genres: allGenres, addGenre, artists, addArtist } = useMusicStore(); // Destructure addGenre and artists
  const [artistSpecificCredits, setArtistSpecificCredits] = useState<Credit[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]); // New state for genres
  const [isResolving, setIsResolving] = useState(false);

  // Memoize genre options for MultiSelectSearch
  const genreOptions = useMemo(() => allGenres.map(genre => ({ value: genre, label: genre })), [allGenres]);

  useEffect(() => {
    if (isOpen && album) {
      setArtistSpecificCredits(album.artistCredits.map(credit => ({
        ...credit,
        role: Array.isArray(credit.role) ? credit.role : [credit.role as string],
      })) || []);
      setSelectedGenres(initialGenres); // Initialize genres from props
    }
  }, [isOpen, album, initialGenres]);

  const handleSubmit = async () => {
    if (!album) return;
    
    setIsResolving(true);
    try {
      await onResolve(album.id, artistSpecificCredits, selectedGenres); // Pass selectedGenres to onResolve
      toast.success("Album credits and genres updated successfully.");
      onClose();
    } catch (error) {
      console.error("Failed to update album credits:", error);
      toast.error("Failed to update album credits and genres.");
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
            Resolve Album Credits & Genres
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Add credits and genres for: <span className="font-bold text-white">{album.title}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <ArtistCreditSelect
            value={artistSpecificCredits}
            onChange={setArtistSpecificCredits}
            onNewArtist={addArtist} // Pass addArtist to enable new artist creation
          />
          {/* New: Genres MultiSelectSearch */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Tag size={12}/> Genres</Label>
            <MultiSelectSearch
              options={genreOptions}
              selected={selectedGenres.map(genre => ({ value: genre, label: genre }))}
              onSelectedChange={(items) => setSelectedGenres(items.map(item => item.value))}
              placeholder="Select genres..."
              allowCustom
              onNewItem={addGenre} // Allow creating new genres
            />
          </div>
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
              'Save Details'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};