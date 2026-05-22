"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Track } from '@/types/music';

interface ProducersResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  onResolve: (trackId: string, producers: string[]) => Promise<void>;
}

export const ProducersResolutionModal: React.FC<ProducersResolutionModalProps> = ({ isOpen, onClose, track, onResolve }) => {
  const [producersText, setProducersText] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (isOpen && track) {
      setProducersText(track.producers.join(', '));
    }
  }, [isOpen, track]);

  const handleSubmit = async () => {
    if (!track) return;
    
    const producersArray = producersText.split(',').map(s => s.trim()).filter(Boolean);

    setIsResolving(true);
    try {
      await onResolve(track.id, producersArray);
      toast.success("Producers updated successfully.");
      onClose();
    } catch (error) {
      console.error("Failed to update producers:", error);
      toast.error("Failed to update producers.");
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
            <Tag size={20} className="text-yellow-500" />
            Resolve Producers
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Add producers for: <span className="font-bold text-white">{track.title}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="producers-text" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Producers (comma separated)</Label>
            <Textarea
              id="producers-text"
              value={producersText}
              onChange={(e) => setProducersText(e.target.value)}
              placeholder="e.g. Metro Boomin, Kanye West"
              className="bg-zinc-900 border-zinc-800 focus-visible:ring-yellow-500 min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isResolving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isResolving} className="bg-yellow-600 hover:bg-yellow-500 font-bold uppercase tracking-wider">
            {isResolving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Producers'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};