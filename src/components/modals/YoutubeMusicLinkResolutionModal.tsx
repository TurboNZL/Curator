"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Youtube, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Track }  from '@/../server/types/music'; // Corrected import path

interface YoutubeMusicLinkResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  onResolve: (trackId: string, youtubeMusicUrl: string) => Promise<void>;
}

export const YoutubeMusicLinkResolutionModal: React.FC<YoutubeMusicLinkResolutionModalProps> = ({ isOpen, onClose, track, onResolve }) => {
  const [youtubeMusicUrl, setYoutubeMusicUrl] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (isOpen && track) {
      setYoutubeMusicUrl(track.youtubeMusicUrl || '');
    }
  }, [isOpen, track]);

  const handleSubmit = async () => {
    if (!track) return;
    if (!youtubeMusicUrl) {
      toast.error("YouTube Music URL is required.");
      return;
    }

    setIsResolving(true);
    try {
      await onResolve(track.id, youtubeMusicUrl);
      toast.success("YouTube Music URL updated successfully.");
      onClose();
    } catch (error) {
      console.error("Failed to update YouTube Music URL:", error);
      toast.error("Failed to update YouTube Music URL.");
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
            <Youtube size={20} className="text-red-500" />
            Resolve YouTube Music Link
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Add the YouTube Music URL for: <span className="font-bold text-white">{track.title}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="youtube-url" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">YouTube Music URL</Label>
            <Input
              id="youtube-url"
              value={youtubeMusicUrl}
              onChange={(e) => setYoutubeMusicUrl(e.target.value)}
              placeholder="https://music.youtube.com/watch?v=..."
              className="bg-zinc-900 border-zinc-800 focus-visible:ring-red-500"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isResolving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isResolving || !youtubeMusicUrl} className="bg-red-600 hover:bg-red-500 font-bold uppercase tracking-wider">
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