"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Track } from '@/types/music';

interface GeniusLinkResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  onResolve: (trackId: string, geniusUrl: string) => Promise<void>;
}

export const GeniusLinkResolutionModal: React.FC<GeniusLinkResolutionModalProps> = ({ isOpen, onClose, track, onResolve }) => {
  const [geniusUrl, setGeniusUrl] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (isOpen && track) {
      setGeniusUrl(track.geniusUrl || '');
    }
  }, [isOpen, track]);

  const handleSubmit = async () => {
    if (!track) return;
    if (!geniusUrl) {
      toast.error("Genius URL is required.");
      return;
    }

    setIsResolving(true);
    try {
      await onResolve(track.id, geniusUrl);
      toast.success("Genius URL updated successfully.");
      onClose();
    } catch (error) {
      console.error("Failed to update Genius URL:", error);
      toast.error("Failed to update Genius URL.");
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
            <Link size={20} className="text-yellow-500" />
            Resolve Genius Link
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Add the Genius URL for: <span className="font-bold text-white">{track.title}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="genius-url" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Genius URL</Label>
            <Input
              id="genius-url"
              value={geniusUrl}
              onChange={(e) => setGeniusUrl(e.target.value)}
              placeholder="https://genius.com/..."
              className="bg-zinc-900 border-zinc-800 focus-visible:ring-yellow-500"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isResolving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isResolving || !geniusUrl} className="bg-yellow-600 hover:bg-yellow-500 font-bold uppercase tracking-wider">
            {isResolving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Link'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};