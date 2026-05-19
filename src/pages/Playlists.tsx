"use client";

import React, { useState, useMemo } from 'react';
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
import { cn } from '@/lib/utils';
import { TrackContextMenu } from '@/components/ui/TrackContextMenu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const Playlists = () => {
  const { playlists, tracks, artists, albums, addPlaylist, updatePlaylist, deletePlaylist, setCurrentTrack, fetchData, activeProfile } = useMusicStore();
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
  const [trackSearchTerm, setTrackSearchTerm] = useState('');
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
      artists.some(a => a.id === t.artistId && a.name.toLowerCase().includes(trackSearchTerm.toLowerCase())) ||
      albums.some(al => t.albumIds.some(aId => aId.albumId === al.id) && al.title.toLowerCase().includes(trackSearchTerm.toLowerCase()))
    );
  }, [tracks, artists, albums, trackSearchTerm]);

  const addTrackToEditingPlaylist = (trackId: string) => {
    setEditPlaylistData(prev => {
      if (!prev.trackIds.includes(trackId)) {
        return { ...prev, trackIds: [...prev.trackIds, trackId] };
      }
      return prev;
    });
  };

  const removeTrackFromEditingPlaylist = (trackId: string) => {
    setEditPlaylistData(prev => ({
      ...prev,
      trackIds: prev.trackIds.filter(id => id !== trackId),
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
      const [removed] = newTrackIds.splice(draggedTrackIndex, 1);
      newTrackIds.splice(index, 0, removed);
      return { ...prev, trackIds: newTrackIds };
    });
    setDraggedTrackIndex(index);
  };

  const onDragEnd = () => {
    setDraggedTrackIndex(null);
  };

  const getTrackDetails = (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    const artist = artists.find(a => a.id === track?.artistId);
    const album = albums.find(al => track?.albumIds.some(aId => aId.albumId === al.id));
    return { track, artist, album };
  };

  const handleSharePlaylist = (playlist: any) => {
    const trackUrls = playlist.trackIds.map((trackId: string) => {
      const track = tracks.find(t => t.id === trackId);
      return track?.spotifyUrl || track?.youtubeMusicUrl || '';
    }).filter(Boolean);
    const clipboardText = trackUrls.join('\n');
    navigator.clipboard.writeText(clipboardText);
    toast.success("Playlist URLs copied to clipboard!");
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white uppercase">Playlists</h1>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Curated collections of your favorite music.</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black uppercase tracking-widest h-10 px-8 gap-2">
          <Plus size={16} /> New Playlist
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {playlists.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-900 rounded-3xl">
            <ListMusic size={48} className="text-zinc-800 mx-auto mb-4" />
            <h3 className="text-zinc-400 font-bold">No playlists yet</h3>
            <p className="text-zinc-600 text-sm mt-1">Start curating your first collection.</p>
          </div>
        ) : (
          playlists.map(playlist => (
            <Card key={playlist.id} className="bg-zinc-900/40 border-zinc-800 p-3 hover:bg-zinc-900/60 transition-all cursor-pointer group relative">
              <div className="aspect-square rounded-lg overflow-hidden mb-3 relative">
                <img src={playlist.coverImage || defaultCover} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={playlist.name} />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" className="rounded-full bg-emerald-600 hover:bg-emerald-500 text-white w-10 h-10" onClick={(e) => {
                    e.stopPropagation();
                    const playlistTracks = tracks.filter(t => playlist.trackIds.includes(t.id));
                    if (playlistTracks.length > 0) setCurrentTrack(playlistTracks[0].id, { type: 'playlist', id: playlist.id, tracks: playlistTracks.map(t => t.id) });
                  }}>
                    <Play fill="currentColor" size={18} />
                  </Button>
                </div>
              </div>
              <h3 className="text-sm font-bold text-white truncate">{playlist.name}</h3>
              <p className="text-xs text-zinc-500">{playlist.trackIds.length} tracks</p>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit2 size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-white">
                  <DropdownMenuItem onClick={() => openEditModal(playlist)} className="text-xs font-medium">
                    <Edit2 size={14} className="mr-2" /> <span>Edit Playlist</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSharePlaylist(playlist)} className="text-xs font-medium">
                    <Share size={14} className="mr-2" /> <span>Share</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDeletePlaylist(playlist.id)} className="text-xs font-medium text-red-500">
                    <Trash2 size={14} className="mr-2" /> <span>Delete Playlist</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Card>
          ))
        )}
      </div>

      {/* Create Playlist Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <ListMusic size={20} className="text-emerald-500" />
              New Playlist
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Playlist Cover</Label>
              <ImageUpload
                value={newPlaylistData.coverImage}
                onChange={(url) => setNewPlaylistData(prev => ({ ...prev, coverImage: url }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-name" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Name</Label>
              <Input
                id="create-name"
                value={newPlaylistData.name}
                onChange={(e) => setNewPlaylistData(prev => ({ ...prev, name: e.target.value }))}
                className="bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Description</Label>
              <Textarea
                id="create-description"
                value={newPlaylistData.description}
                onChange={(e) => setNewPlaylistData(prev => ({ ...prev, description: e.target.value }))}
                className="bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500 min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="text-zinc-400 hover:text-white hover:bg-zinc-900 font-bold uppercase tracking-widest text-[10px]">
              Cancel
            </Button>
            <Button onClick={handleCreatePlaylist} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] px-8">
              Create Playlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Playlist Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <ListMusic size={20} className="text-emerald-500" />
              Edit Playlist: {editingPlaylist?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 flex-1 overflow-hidden py-4">
            <div className="space-y-6 overflow-y-auto pr-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Playlist Cover</Label>
                <ImageUpload
                  value={editPlaylistData.coverImage}
                  onChange={(url) => setEditPlaylistData(prev => ({ ...prev, coverImage: url }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Name</Label>
                <Input
                  id="edit-name"
                  value={editPlaylistData.name}
                  onChange={(e) => setEditPlaylistData(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editPlaylistData.description}
                  onChange={(e) => setEditPlaylistData(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500 min-h-[100px]"
                />
              </div>
            </div>

            <div className="space-y-4 flex flex-col">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Playlist Tracks</Label>
                <Input
                  placeholder="Search tracks to add..."
                  value={trackSearchTerm}
                  onChange={(e) => setTrackSearchTerm(e.target.value)}
                  className="w-40 bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500 h-8 text-xs"
                />
              </div>
              <ScrollArea className="flex-1 rounded-xl border border-zinc-900 bg-zinc-900/30 p-2">
                <div className="space-y-1">
                  {editPlaylistData.trackIds.map((trackId, index) => {
                    const { track, artist, album } = getTrackDetails(trackId);
                    if (!track) return null;

                    return (
                      <div
                        key={track.id}
                        draggable
                        onDragStart={() => onDragStart(index)}
                        onDragOver={(e) => onDragOver(e, index)}
                        onDragEnd={onDragEnd}
                        className={cn(
                          "flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg group cursor-grab transition-all",
                          draggedTrackIndex === index && "opacity-50 scale-[0.98] border-emerald-500/50"
                        )}
                      >
                        <div className="text-zinc-600 group-hover:text-zinc-400">
                          <GripVertical size={14} />
                        </div>
                        {album?.covers?.[0] ? (
                          <img src={album.covers[0]} alt="" className="w-6 h-6 object-cover rounded" />
                        ) : (
                          <div className="w-6 h-6 flex items-center justify-center bg-zinc-800 rounded text-zinc-500">
                            <MusicIcon size={12} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{track.title}</p>
                          <p className="text-[10px] text-zinc-500 truncate">{artist?.name}</p>
                        </div>
                        <TrackContextMenu track={track} />
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-red-500" onClick={() => removeTrackFromEditingPlaylist(track.id)}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    );
                  })}
                </div>
                {trackSearchTerm && (
                  <div className="pt-4 border-t border-zinc-900 mt-4">
                    <Label className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-2 block">Available Tracks</Label>
                    {allAvailableTracks
                      .filter(t => !editPlaylistData.trackIds.includes(t.id))
                      .map(track => {
                        const { artist, album } = getTrackDetails(track.id);
                        return (
                          <button
                            key={track.id}
                            onClick={() => addTrackToEditingPlaylist(track.id)}
                            className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-zinc-800 text-zinc-400 w-full text-left transition-colors"
                          >
                            {album?.covers?.[0] ? (
                              <img src={album.covers[0]} alt="" className="w-6 h-6 object-cover rounded" />
                            ) : (
                              <div className="w-6 h-6 flex items-center justify-center bg-zinc-800 rounded text-zinc-500">
                                <MusicIcon size={12} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate">{track.title}</p>
                              <p className="text-[10px] text-zinc-500 truncate">{artist?.name}</p>
                            </div>
                            <Plus size={12} />
                          </button>
                        );
                      })
                    }
                  </div>
                )}
                {editPlaylistData.trackIds.length === 0 && !trackSearchTerm && (
                  <p className="text-[10px] text-zinc-600 italic p-4 text-center">Add tracks using the search bar above.</p>
                )}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter className="border-t border-zinc-900 pt-4">
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} className="text-zinc-400 hover:text-white hover:bg-zinc-900 font-bold uppercase tracking-widest text-[10px]">
              Cancel
            </Button>
            <Button onClick={handleEditPlaylist} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] px-8">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Playlists;