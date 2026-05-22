"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Text, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Track } from '@/types/music';

interface TrackCreditsResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  onResolve: (trackId: string, credits: string[]) => Promise<void>;
}

export const TrackCreditsResolutionModal: React.FC<TrackCreditsResolutionModalProps> = ({ isOpen, onClose, track, onResolve }) => {
  const [creditsText, setCreditsText] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (isOpen && track) {
      setCreditsText(track.credits.join(', '));
    }
  }, [isOpen, track]);

  const handleSubmit = async () => {
    if (!track) return;
    
    const creditsArray = creditsText.split(',').map(s => s.trim()).filter(Boolean);

    setIsResolving(true);
    try {
      await onResolve(track.id, creditsArray);
      toast.success("Track credits updated successfully.");
      onClose();
    } catch (error) {
      console.error("Failed to update track credits:", error);
      toast.error("Failed to update track credits.");
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
            <Text size={20} className="text-gray-500" />
            Resolve Track Credits
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Add additional credits for: <span className="font-bold text-white">{track.title}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="credits-text" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Credits (comma separated)</Label>
            <Textarea
              id="credits-text"
              value={creditsText}
              onChange={(e) => setCreditsText(e.target.value)}
              placeholder="e.g. Mixed by Dr. Dre, Mastered by Mike Dean"
              className="bg-zinc-900 border-zinc-800 focus-visible:ring-gray-500 min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isResolving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isResolving} className="bg-gray-600 hover:bg-gray-500 font-bold uppercase tracking-wider">
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