"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Release }  from '@/../server/types/music'; // Corrected import path

interface ReleaseDateResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  release: Release | null;
  onResolve: (releaseId: string, releaseDate: string) => Promise<void>;
}

export const ReleaseDateResolutionModal: React.FC<ReleaseDateResolutionModalProps> = ({ isOpen, onClose, release, onResolve }) => {
  const [releaseDate, setReleaseDate] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (isOpen && release) {
      setReleaseDate(release.releaseDate || '');
    }
  }, [isOpen, release]);

  const handleSubmit = async () => {
    if (!release) return;
    if (!releaseDate) {
      toast.error("Release date is required.");
      return;
    }

    setIsResolving(true);
    try {
      await onResolve(release.id, releaseDate);
      toast.success("Release date updated successfully.");
      onClose();
    } catch (error) {
      console.error("Failed to update release date:", error);
      toast.error("Failed to update release date.");
    } finally {
      setIsResolving(false);
    }
  };

  if (!release) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Calendar size={20} className="text-orange-500" />
            Resolve Release Date
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Add the release date for: <span className="font-bold text-white">{release.title}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="release-date" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Release Date</Label>
            <Input
              id="release-date"
              type="date"
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              className="bg-zinc-900 border-zinc-800 focus-visible:ring-orange-500"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isResolving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isResolving || !releaseDate} className="bg-orange-600 hover:bg-orange-500 font-bold uppercase tracking-wider">
            {isResolving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Date'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};