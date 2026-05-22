"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Card } from '@/components/ui/card';
import { ListMusic, Plus, Play, Trash2, Edit2, GripVertical, Album as AlbumIcon, Music as MusicIcon, Share, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, trackHasAlbum, getAlbumDisplayCover } from '@/lib/utils';
import { TrackRightClickMenu } from '@/components/ui/TrackRightClickMenu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Credit }  from '@/../server/types/music'; // Corrected import path

const Playlists = () => {
  const { playlists, tracks, artists, albums, addPlaylist, updatePlaylist, deletePlaylist, setCurrentTrack, fetchData, activeProfile, releases } = useMusicStore();
  const navigate = useNavigate();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<any | null>(null);

  const [newPlaylistData, setNewPlaylistData] = useState({
    name: '',
    description: '',
    coverImage: '',
    trackIds: [] as string[],
  });

  const [editPlaylistData, setEditPlaylistData] = useState<any>({
    id: '',
    name: '',
    description: '',
    coverImage: '',
    trackIds: [] as string[],
  });
  const [trackSearchTerm, setSearchTerm] = useState('');
  const [draggedTrackIndex, setDraggedTrackIndex] = useState<number | null>(null);

  const defaultCover = activeProfile.settings?.defaultAlbumImage || '/placeholder.svg';

  const handleCreatePlaylist = async () => {
    if (!newPlaylistData.name) {
      toast.error("Playlist name is required.");
      return;
    }
    try {
      await addPlaylist(newPlaylistData);
      toast.success(`Playlist "${newPlaylistData.name}" created.`);
      setIsCreateModalOpen(false);
      setNewPlaylistData({ name: '', description: '', coverImage: '', trackIds: [] });
      fetchData();
    } catch (error) {
      console.error("Failed to create playlist:", error);
      toast.error("Failed to create playlist.");
    }
  };

  const handleEditPlaylist = async () => {
    if (!editPlaylistData.name) {
      toast.error("Playlist name is required.");
      return;
    }
    try {
      await updatePlaylist(editPlaylistData.id, {
        name: editPlaylistData.name,
        description: editPlaylistData.description,
        coverImage: editPlaylistData.coverImage,
        trackIds: editPlaylistData.trackIds,
      });
      toast.success(`Playlist "${editPlaylistData.name}" updated.`);
      setIsEditModalOpen(false);
      setEditingPlaylist(null);
      setEditPlaylistData({ id: '', name: '', description: '', coverImage: '', trackIds: [] });
      fetchData();
    } catch (error) {
      console.error("Failed to update playlist:", error);
      toast.error("Failed to update playlist.");
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (confirm("Are you sure you want to delete this playlist?")) {
      try {
        await deletePlaylist(playlistId);
        toast.success("Playlist deleted.");
        fetchData();
      } catch (error) {
        console.error("Failed to delete playlist:", error);
        toast.error("Failed to delete playlist.");
      }
    }
  };

  const openEditModal = (playlist: any) => {
    setEditingPlaylist(playlist);
    setEditPlaylistData({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description || '',
      coverImage: playlist.coverImage || '',
      trackIds: [...playlist.trackIds],
    });
    setIsEditModalOpen(true);
  };

  const allAvailableTracks = useMemo(() => {
    return tracks.filter(t => 
      t.title.toLowerCase().includes(trackSearchTerm.toLowerCase()) ||
      artists.some(a => a.id === t.artistId && a.name.toLowerCase().includes(trackSearchTerm.toLowerCase()))
    );
  }, [tracks, artists, trackSearchTerm]);

  const addTrackToEditPlaylist = (trackId: string) => {
    setEditPlaylistData(prev => {
      if (prev.trackIds.includes(trackId)) {
        toast.info("Track is already in this playlist.");
        return prev;
      }
      return { ...prev, trackIds: [...prev.trackIds, trackId] };
    });
  };

  const removeTrackFromEditPlaylist = (index: number) => {
    setEditPlaylistData(prev => ({
      ...prev,
      trackIds: prev.trackIds.filter((_, i) => i !== index),
    }));
  };

  const onDragStart = (index: number) => {
    setDraggedTrackIndex(index);
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedTrackIndex === null || draggedTrackIndex === index) return;

    setEditPlaylistData(prev => {
      const newTrackIds = [...prev.trackIds];
      const [reorderedItem] = newTrackIds.splice(draggedTrackIndex, 1);
      newTrackIds.splice(index, 0, reorderedItem);
      return { ...prev, trackIds: newTrackIds };
    });
    setDraggedTrackIndex(index);
  };

  const onDragEnd = () => {
    setDraggedTrackIndex(null);
  };

  const getTrackDisplayArtists = useCallback((track: any) => {
    if (!track || !track.artistCredits) {
      const primaryArtist = artists.find(a => a.id === track.artistId);
      return primaryArtist?.name || "Unknown Artist";
    }

    const leadArtists = track.artistCredits
      .filter((credit: Credit) => credit.role.includes('Lead artist')) // Changed to .includes()
      .map((credit: Credit) => artists.find(a => a.id === credit.artistId)?.name)
      .filter(Boolean);

    if (leadArtists.length > 0) {
      return leadArtists.join(', ');
    }
    const primaryArtist = artists.find(a => a.id === track.artistId);
    return primaryArtist?.name || "Unknown Artist";
  }, [artists]);


  const getAlbumArt = (track: any) => {
    const album = albums.find(a => trackHasAlbum(track, a.id));
    return getAlbumDisplayCover(album, releases, defaultCover);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Playlists</h1>
          <p className="text-zinc-500 text-sm mt-1">Organize and curate your listening experiences.</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black uppercase tracking-widest h-10 px-8 gap-2">
          <Plus size={16} /> New Playlist
        </Button>
      </div>

      {playlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-900 rounded-3xl">
          <ListMusic size={48} className="text-zinc-800 mb-4" />
          <h3 className="text-zinc-400 font-bold">No playlists found</h3>
          <p className="text-zinc-600 text-sm mt-1 mb-6">Create your first playlist to get started!</p>
          <Button onClick={() => setIsCreateModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black uppercase tracking-widest h-10 px-8 gap-2">
            <Plus size={16} /> New Playlist
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {playlists.map(playlist => (
            <Card key={playlist.id} className="relative group bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 transition-all overflow-hidden cursor-pointer">
              <Link to={`/playlists/${playlist.id}`} className="block">
                <div className="aspect-square overflow-hidden relative">
                  <img
                    src={playlist.coverImage || defaultCover}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt={playlist.name}
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-white text-sm truncate">{playlist.name}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{playlist.trackIds.length} tracks</p>
                </div>
              </Link>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-full border-zinc-800 bg-zinc-900/50" onClick={() => openEditModal(playlist)}>
                  <Edit2 size={14} />
                </Button>
                <Button variant="destructive" size="sm" className="h-8 w-8 p-0 rounded-full bg-red-600/10 text-red-500 border-red-500/20" onClick={() => handleDeletePlaylist(playlist.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Playlist Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <ListMusic size={20} className="text-emerald-500" />
              Create Playlist
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePlaylist} className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Cover Art</Label>
              <ImageUpload
                value={newPlaylistData.coverImage}
                onChange={(val) => setNewPlaylistData({...newPlaylistData, coverImage: val})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Playlist Name</Label>
              <Input
                id="name"
                value={newPlaylistData.name}
                onChange={(e) => setNewPlaylistData({...newPlaylistData, name: e.target.value})}
                placeholder="e.g. Late Night Jazz"
                className="bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Description</Label>
              <Textarea
                id="description"
                value={newPlaylistData.description}
                onChange={(e) => setNewPlaylistData({...newPlaylistData, description: e.target.value})}
                placeholder="What's the vibe of this collection?"
                className="bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500 min-h-[100px]"
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold uppercase tracking-wider">
                Initialize Collection
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Playlist Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[700px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <ListMusic size={20} className="text-emerald-500" />
              Edit Playlist
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditPlaylist} className="flex-1 flex flex-col overflow-hidden">
            <div className="grid grid-cols-2 gap-8 py-4 flex-1 overflow-hidden px-6">
              <div className="space-y-4 overflow-y-auto">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Cover Art</Label>
                  <ImageUpload
                    value={editPlaylistData.coverImage}
                    onChange={(val) => setEditPlaylistData({...editPlaylistData, coverImage: val})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Playlist Name</Label>
                  <Input
                    id="edit-name"
                    value={editPlaylistData.name}
                    onChange={(e) => setEditPlaylistData({...editPlaylistData, name: e.target.value})}
                    className="bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editPlaylistData.description}
                    onChange={(e) => setEditPlaylistData({...editPlaylistData, description: e.target.value})}
                    className="bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500 min-h-[100px]"
                  />
                </div>
              </div>

              <div className="space-y-4 flex flex-col overflow-y-auto">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Playlist Tracks</Label>
                </div>
                <ScrollArea className="flex-1 h-[200px] rounded-xl border border-zinc-900 bg-zinc-900/30 p-2">
                  <div className="space-y-1">
                    {editPlaylistData.trackIds.length === 0 ? (
                      <p className="text-[10px] text-zinc-600 italic text-center py-8">No tracks in this playlist.</p>
                    ) : (
                      editPlaylistData.trackIds.map((trackId: string, index: number) => {
                        const track = tracks.find(t => t.id === trackId);
                        if (!track) return null;
                        return (
                          <div
                            key={track.id}
                            draggable
                            onDragStart={() => onDragStart(index)}
                            onDragOver={(e) => onDragOver(e, index)}
                            onDragEnd={onDragEnd}
                            className={cn(
                              "flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg group cursor-move transition-all",
                              draggedTrackIndex === index && "opacity-50 scale-[0.98] border-emerald-500/50"
                            )}
                          >
                            <div className="text-zinc-600 group-hover:text-zinc-400">
                              <GripVertical size={14} />
                            </div>
                            <img src={getAlbumArt(track)} className="w-8 h-8 object-cover rounded-md" alt="" />
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold truncate text-white">{track.title}</span>
                              <p className="text-[10px] text-zinc-500 truncate">{getTrackDisplayArtists(track)}</p>
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-red-500" onClick={() => removeTrackFromEditPlaylist(index)}>
                              <Trash2 size={12} />
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
                <div className="space-y-2">
                  <Label htmlFor="track-search" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Add Tracks</Label>
                  <Input
                    id="track-search"
                    placeholder="Search tracks to add..."
                    value={trackSearchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500"
                  />
                  {trackSearchTerm && allAvailableTracks.length > 0 && (
                    <ScrollArea className="h-32 rounded-xl border border-zinc-900 bg-zinc-900/30 p-2 mt-2">
                      <div className="space-y-1">
                        {allAvailableTracks.map(track => (
                          <button
                            key={track.id}
                            type="button"
                            onClick={() => addTrackToEditPlaylist(track.id)}
                            className="flex items-center justify-between w-full p-2 rounded-lg text-left text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition-colors"
                          >
                            <span>{track.title} - {getTrackDisplayArtists(track)}</span>
                            <Plus size={12} className="text-emerald-400" />
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="px-6 py-4 border-t border-zinc-900 shrink-0">
              <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)} className="text-zinc-400 hover:text-white hover:bg-zinc-900 font-bold uppercase tracking-widest text-[10px]">
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] px-8">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Playlists;