"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Link, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMusicStore } from '@/store/useMusicStore';
import { Track } from '@/types/music';

interface SpotifyUriGroupResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  // These are the tracks that belong to the album's specific release and need Spotify URIs (or have them)
  tracks: Track[]; 
  albumDetails: { 
    albumId: string;
    albumTitle: string;
    releaseId?: string;
    releaseTitle?: string;
  } | null;
  onResolve: (trackIds: string[], uris: string[]) => Promise<void>;
}

export const SpotifyUriGroupResolutionModal: React.FC<SpotifyUriGroupResolutionModalProps> = ({ isOpen, onClose, tracks: initialTracks, albumDetails, onResolve }) => {
  const { tracks: allTracks, releases } = useMusicStore();
  const [uris, setUris] = useState<string[]>([]);
  const [pastedText, setPastedText] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  // Memoize sorted tracks based on the release order
  const orderedTracks = useMemo(() => {
    if (!albumDetails || !albumDetails.releaseId) {
      // Fallback if no specific release is provided, sort by track ID or default
      return [...initialTracks].sort((a,b) => a.title.localeCompare(b.title)).map(t => ({
        ...t,
        isEditable: !t.spotifyUrl // Tracks without a Spotify URL are editable
      }));
    }

    const release = releases.find(r => r.id === albumDetails.releaseId);
    if (!release) return [...initialTracks].sort((a,b) => a.title.localeCompare(b.title)).map(t => ({ ...t, isEditable: !t.spotifyUrl }));

    // Get all track objects for this release, in order as defined in the release.trackIds
    return release.trackIds
      .map(trackId => allTracks.find(t => t.id === trackId))
      .filter(Boolean)
      .map(t => ({
        ...t,
        isEditable: !t.spotifyUrl // A track is editable if it's currently missing its Spotify URL
      }));
  }, [initialTracks, albumDetails, allTracks, releases]);

  useEffect(() => {
    if (isOpen) {
      // Initialize URIs with existing ones or empty strings, based on orderedTracks
      setUris(orderedTracks.map(t => t.spotifyUrl || ''));
      setPastedText('');
    }
  }, [isOpen, orderedTracks]);

  const handleUriChange = (index: number, value: string) => {
    setUris(prev => {
      const newUris = [...prev];
      newUris[index] = value;
      return newUris;
    });
  };

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setPastedText(text);
    
    const pastedLinks = text.split('\n')
      .map(line => {
        const trimmed = line.trim();
        // Normalize Spotify link to just the track ID if it's a full URL
        if (trimmed.startsWith('https://open.spotify.com/track/')) {
          return trimmed.split('?')[0]; // Remove query params
        }
        return trimmed; // Assume it's a URI if not a full URL
      })
      .filter(Boolean);

    setUris(prev => {
      const newUris = [...prev];
      let pasteIndex = 0;
      for (let i = 0; i < orderedTracks.length && pasteIndex < pastedLinks.length; i++) {
        // Only update if the track is editable
        if (orderedTracks[i].isEditable) {
          newUris[i] = pastedLinks[pasteIndex];
          pasteIndex++;
        }
      }
      return newUris;
    });
  };

  const submitResolution = async () => {
    setIsResolving(true);
    try {
      const trackIdsToUpdate = orderedTracks.map(t => t.id);
      const finalUris = uris.map((uri, index) => orderedTracks[index].isEditable ? uri : orderedTracks[index].spotifyUrl || '');

      await onResolve(trackIdsToUpdate, finalUris);
      toast.success("Spotify URIs updated successfully.");
      onClose();
    } catch (error) {
      console.error("Failed to resolve Spotify URIs:", error);
      toast.error("Failed to update Spotify URIs.");
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Link size={20} className="text-green-500" />
            Resolve Spotify URIs for {albumDetails?.albumTitle}
          </DialogTitle>
          {albumDetails?.releaseTitle && (
            <DialogDescription className="text-zinc-400">
              Editing tracks from release: <span className="font-bold text-white">{albumDetails.releaseTitle}</span>
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tracks (Order from {albumDetails?.releaseTitle || 'Album Default'})</Label>
              <ScrollArea className="h-[250px] rounded-xl border border-zinc-900 bg-zinc-900/30 p-2">
                <div className="space-y-1">
                  {orderedTracks.map((track, index) => (
                    <div key={track.id} className="flex items-center gap-2 p-2 rounded-lg text-zinc-400">
                      <span className="text-xs font-bold w-4 shrink-0">{index + 1}.</span>
                      <span className="text-xs font-bold truncate">{track.title}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Spotify URIs</Label>
              <ScrollArea className="h-[250px] rounded-xl border border-zinc-900 bg-zinc-900/30 p-2">
                <div className="space-y-1">
                  {orderedTracks.map((track, index) => (
                    <Input
                      key={track.id}
                      value={uris[index] || ''}
                      onChange={(e) => handleUriChange(index, e.target.value)}
                      placeholder={`URI for ${track.title}`}
                      className="bg-zinc-900 border-zinc-800 focus-visible:ring-green-500 text-xs"
                      disabled={!track.isEditable}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paste-uris" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Paste Multiple URIs (Spotify track URLs or URIs)</Label>
            <Textarea
              id="paste-uris"
              value={pastedText}
              onChange={handlePaste}
              placeholder="Paste Spotify track URLs or URIs here (one per line)"
              className="bg-zinc-900 border-zinc-800 focus-visible:ring-green-500 text-xs min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isResolving}>
            Cancel
          </Button>
          <Button onClick={submitResolution} className="bg-green-600 hover:bg-green-500 font-bold uppercase tracking-wider" disabled={isResolving}>
            {isResolving ? "Resolving..." : "Resolve Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};