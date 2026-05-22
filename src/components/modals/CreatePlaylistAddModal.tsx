"use client";

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMusicStore } from '@/store/useMusicStore';
import { ListMusic, Plus, Search, Check } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Album, Track } from '../../server/types/music'; // Corrected import path

interface CreatePlaylistAddModalProps {
  trackToAdd?: Track;
  albumToAdd?: Album;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreatePlaylistAddModal = ({ trackToAdd, albumToAdd, open, onOpenChange }: CreatePlaylistAddModalProps) => {
  const { playlists, updatePlaylist, addPlaylist } = useMusicStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const filteredPlaylists = useMemo(() => {
    return playlists.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [playlists, searchTerm]);

  const handleCreateAndAdd = async () => {
    if (!newPlaylistName) {
      toast.error("New playlist name is required.");
      return;
    }

    try {
      const newPlaylist = await addPlaylist({
        name: newPlaylistName,
        description: '',
        coverImage: '',
        trackIds: []
      });
      setSelectedPlaylistId(newPlaylist.id);
      setNewPlaylistName('');
      toast.success(`Playlist "${newPlaylist.name}" created.`);
    } catch (error) {
      console.error("Failed to create playlist:", error);
      toast.error("Failed to create playlist.");
    }
  };

  const handleAddEntityToPlaylist = async () => {
    if (!selectedPlaylistId) {
      toast.error("Please select a playlist first.");
      return;
    }

    const playlist = playlists.find(p => p.id === selectedPlaylistId);
    if (!playlist) {
      toast.error("Selected playlist not found.");
      return;
    }

    const tracksToAdd: string[] = [];
    if (trackToAdd) {
      if (playlist.trackIds.includes(trackToAdd.id)) {
        toast.info(`Track "${trackToAdd.title}" is already in this playlist.`);
        onOpenChange(false); // Close modal even if already present
        return;
      }
      tracksToAdd.push(trackToAdd.id);
    } else if (albumToAdd) {
      const albumTracks = useMusicStore.getState().tracks.filter(t => t.albumIds.some(aId => aId.albumId === albumToAdd.id));
      const existingTrackIds = new Set(playlist.trackIds);
      const newAlbumTrackIds = albumTracks
        .map(t => t.id)
        .filter(id => !existingTrackIds.has(id));
      
      if (newAlbumTrackIds.length === 0) {
        toast.info(`All tracks from "${albumToAdd.title}" are already in this playlist.`);
        onOpenChange(false); // Close modal even if already present
        return;
      }
      tracksToAdd.push(...newAlbumTrackIds);
    }

    if (tracksToAdd.length === 0) {
      toast.info("No new tracks to add.");
      onOpenChange(false); // Close modal
      return;
    }

    const updatedTrackIds = Array.from(new Set([...playlist.trackIds, ...tracksToAdd]));

    try {
      await updatePlaylist(selectedPlaylistId, { trackIds: updatedTrackIds });
      toast.success(`${tracksToAdd.length} track(s) added to "${playlist.name}".`);
      onOpenChange(false); // Close modal
      setSelectedPlaylistId(null);
      setSearchTerm('');
    } catch (error) {
      console.error("Failed to add tracks to playlist:", error);
      toast.error("Failed to add tracks to playlist.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <ListMusic size={20} className="text-emerald-500" />
            Add {trackToAdd ? 'Track' : albumToAdd ? 'Album' : 'Content'} to Playlist
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div>
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              {trackToAdd?.title || albumToAdd?.title || 'Select content to add'}
            </Label>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
            <Input
              placeholder="Search playlists..."
              className="pl-10 bg-zinc-900 border-zinc-800 text-white h-9 rounded-full focus-visible:ring-emerald-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <ScrollArea className="h-48 rounded-xl border border-zinc-900 bg-zinc-900/30 p-2">
            <div className="space-y-1">
              {filteredPlaylists.length === 0 ? (
                <p className="text-xs text-zinc-600 italic text-center py-4">No playlists found. Create a new one below!</p>
              ) : (
                filteredPlaylists.map(playlist => (
                  <button
                    key={playlist.id}
                    type="button"
                    onClick={() => setSelectedPlaylistId(playlist.id)}
                    className={cn(
                      "flex items-center justify-between w-full p-2 rounded-lg text-left text-sm font-bold transition-colors",
                      selectedPlaylistId === playlist.id
                        ? "bg-emerald-600/20 text-emerald-400"
                        : "text-zinc-300 hover:bg-zinc-800"
                    )}
                  >
                    {playlist.name}
                    {selectedPlaylistId === playlist.id && <Check size={16} className="text-emerald-400" />}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="flex items-center gap-2">
            <Input
              placeholder="New playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="flex-1 bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500"
            />
            <Button
              type="button"
              onClick={handleCreateAndAdd}
              disabled={!newPlaylistName}
              className="bg-zinc-800 hover:bg-zinc-700 text-[10px] font-black uppercase tracking-widest h-9"
            >
              <Plus size={12} className="mr-1" /> Create
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400 hover:text-white hover:bg-zinc-900 font-bold uppercase tracking-widest text-[10px]">
            Cancel
          </Button>
          <Button
            onClick={handleAddEntityToPlaylist}
            disabled={!selectedPlaylistId && !newPlaylistName} // Allow adding if a playlist is selected OR if a new name is provided
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] px-8"
          >
            Add to Playlist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};