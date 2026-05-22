"use client";

import React, { useState, useMemo, useEffect } from 'react'; // Added useMemo, useEffect
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useMusicStore } from '@/store/useMusicStore';
import { Edit2, Music, Plus, Trash2, Link as LinkIcon, Edit3, X, Zap, Star } from 'lucide-react'; 
import { toast } from 'sonner';
import { FileUpload } from '@/components/ui/FileUpload';
import { Track, Credit } from '@/types/music'; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { RelationalBioModal } from './RelationalBioModal';
import { Card } from '../ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { ArtistCreditSelect } from '@/components/shared/ArtistCreditSelect';
import { MultiSelectSearch } from '@/components/ui/MultiSelectSearch';

interface EditTrackModalProps {
  track: Track;
  children?: React.ReactElement; 
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditTrackModal = ({ track, children, open, onOpenChange }: EditTrackModalProps) => {
  const { updateTrack, deleteTrack, albums, artists, groups, deleteGroup, genres: allGenres, addGenre } = useMusicStore(); // Added allGenres, addGenre
  
  const trackGroups = groups.filter(g =>
    g.members?.some(m => m.entityId === track.id && m.entityType === 'track' && m.showOnEntityPage)
  );

  const albumForTrack = useMemo(() => {
    return track.albumIds.length > 0 ? albums.find(a => a.id === track.albumIds[0].albumId) : undefined;
  }, [albums, track.albumIds]);
  
  const [formData, setFormData] = useState({
    title: track.title,
    artistId: track.artistId, // Keep for now as it's required by the API, but derived from credits
    artistCredits: track.artistCredits || [],
    albumId: track.albumIds[0]?.albumId || '',
    initialRating: track.initialRating?.toString() || '',
    genres: track.genres || [],
    bitrate: track.bitrate || '320kbps',
    audioUrl: track.localFilePath || '',
    spotifyUrl: track.spotifyUrl || '',
    geniusUrl: track.geniusUrl || '',
    youtubeMusicUrl: track.youtubeMusicUrl || '', 
    syncWithAlbumCredits: track.syncWithAlbumCredits,
  });

  const genreOptions = useMemo(() => allGenres.map(genre => ({ value: genre, label: genre })), [allGenres]);

  const albumOptions = useMemo(() => albums.filter(al => {
    // Only show albums where the track's current primary artist is a lead artist on the album
    const primaryArtistCredit = formData.artistCredits.find(ac => ac.role.includes('Lead artist'));
    const currentPrimaryArtistId = primaryArtistCredit?.artistId;
    return al.artistId === currentPrimaryArtistId || al.artistCredits?.some(ac => ac.artistId === currentPrimaryArtistId && ac.role.includes('Lead artist'));
  }).map(al => ({ value: al.id, label: al.title })), [albums, formData.artistCredits]);

  const [isRelationalBioModalOpen, setIsRelationalBioModalOpen] = React.useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(undefined);

  const cleanSpotifyUrl = (url: string) => {
    if (!url) return '';
    try {
      const u = new URL(url);
      u.search = '';
      return u.toString();
    } catch {
      return url;
    }
  };

  const isGenresEditable = useMemo(() => {
    return !albumForTrack || !formData.syncWithAlbumCredits;
  }, [albumForTrack, formData.syncWithAlbumCredits]);

  // Reset form data when modal opens
  useEffect(() => {
    if (open) {
      const albumGenres = albumForTrack?.genres || [];
      setFormData({
        title: track.title,
        artistId: track.artistId,
        artistCredits: track.artistCredits.length > 0 
          ? track.artistCredits 
          : (track.artistId ? [{ artistId: track.artistId, role: ['Lead artist'] }] : []),
        albumId: track.albumIds[0]?.albumId || '',
        initialRating: track.initialRating?.toString() || '',
        genres: track.syncWithAlbumCredits && albumForTrack ? albumGenres : track.genres, // Apply album genres if syncing
        bitrate: track.bitrate || '320kbps',
        audioUrl: track.localFilePath || '',
        spotifyUrl: track.spotifyUrl || '',
        geniusUrl: track.geniusUrl || '',
        youtubeMusicUrl: track.youtubeMusicUrl || '', 
        syncWithAlbumCredits: track.syncWithAlbumCredits,
      });
    }
  }, [open, track, albumForTrack]);

  // Update genres if album or syncWithAlbumCredits changes
  useEffect(() => {
    if (albumForTrack && formData.syncWithAlbumCredits) {
      setFormData(prev => ({ ...prev, genres: albumForTrack.genres }));
    } else if (!albumForTrack && formData.syncWithAlbumCredits) { // If no album, but sync is somehow true
      setFormData(prev => ({ ...prev, genres: track.genres, syncWithAlbumCredits: false }));
    }
  }, [albumForTrack, formData.syncWithAlbumCredits, track.genres]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return toast.error("Track title is required");
    if (formData.artistCredits.length === 0 || formData.artistCredits[0].artistId === '') return toast.error("At least one lead artist is required in artist credits");

    // Derive primaryArtistId from artistCredits
    const primaryArtistCredit = formData.artistCredits.find(ac => ac.role.includes('Lead artist'));
    const derivedPrimaryArtistId = primaryArtistCredit?.artistId || track.artistId;


    await updateTrack(track.id, {
      title: formData.title,
      artistId: derivedPrimaryArtistId, // Update primary artist from credits
      artistCredits: formData.artistCredits,
      albumIds: formData.albumId ? [{ albumId: formData.albumId, order: 0 }] : [],
      initialRating: formData.initialRating ? parseFloat(formData.initialRating) : undefined,
      genres: formData.genres, // Genres are always editable here
      bitrate: formData.bitrate,
      localFilePath: formData.audioUrl,
      spotifyUrl: cleanSpotifyUrl(formData.spotifyUrl),
      geniusUrl: formData.geniusUrl,
      youtubeMusicUrl: formData.youtubeMusicUrl,
      syncWithAlbumCredits: formData.syncWithAlbumCredits,
    });

    toast.success(`Updated ${formData.title}`);
    onOpenChange(false); // Close modal
  };


  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this track?")) {
      await deleteTrack(track.id);
      toast.success("Track deleted");
      onOpenChange(false); // Close modal
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[700px] max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <Tabs defaultValue="metadata" className="w-full flex flex-col overflow-hidden">
          <div className="px-6 pt-6 flex items-center justify-between border-b border-zinc-900 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <Music size={20} className="text-blue-500" />
              <h2 className="text-xl font-black uppercase tracking-tight">Edit Track</h2>
            </div>
            <TabsList className="bg-zinc-900 border-zinc-800">
              <TabsTrigger value="metadata" className="text-[10px] font-black uppercase tracking-widest">Metadata</TabsTrigger>
              <TabsTrigger value="links" className="text-[10px] font-black uppercase tracking-widest">Links & Rating</TabsTrigger>
              <TabsTrigger value="relational" className="text-[10px] font-black uppercase tracking-widest">Relational Bios</TabsTrigger>
            </TabsList>
          </div>

          <form onSubmit={handleSubmit}>
            <TabsContent value="metadata" className="p-6 space-y-6 mt-0 max-h-[400px] overflow-y-auto">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Audio Source</Label>
                <FileUpload value={formData.audioUrl} onChange={(url) => setFormData({...formData, audioUrl: url})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Track Title</Label>
                  <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="bg-zinc-900 border-zinc-800" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Album</Label>
                  <SearchableSelect
                    options={albumOptions}
                    value={formData.albumId}
                    onValueChange={(val) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        albumId: val,
                        genres: (albums.find(a => a.id === val)?.genres || []), // Update genres on album change
                        syncWithAlbumCredits: !!val, // Sync if album is selected
                      }));
                    }}
                    placeholder="Select album..."
                    className="bg-zinc-900 border-zinc-800"
                    contentClassName="bg-zinc-950 border-zinc-800"
                    itemClassName="text-white hover:bg-zinc-800"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-blue-500" />
                  <Label htmlFor="sync-credits" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Sync with Album (Credits & Genres)
                  </Label>
                </div>
                <Switch
                  id="sync-credits"
                  checked={formData.syncWithAlbumCredits}
                  onCheckedChange={(checked) => setFormData(prev => ({ 
                    ...prev, 
                    syncWithAlbumCredits: checked,
                    genres: checked && albumForTrack ? albumForTrack.genres : track.genres, // Reset genres if toggling sync
                  }))}
                  disabled={!albumForTrack} // Disable if no album is selected
                />
              </div>

              {/* Artist Credit Select */}
              <ArtistCreditSelect
                value={formData.artistCredits}
                onChange={(credits) => setFormData(prev => ({ ...prev, artistCredits: credits }))}
                disabled={formData.syncWithAlbumCredits}
              />
              
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Genres</Label>
                <MultiSelectSearch
                    options={genreOptions}
                    selected={formData.genres.map(genre => ({ value: genre, label: genre }))}
                    onSelectedChange={(selectedItems) => setFormData(prev => ({ ...prev, genres: selectedItems.map(item => item.value) }))}
                    placeholder="Select genres..."
                    allowCustom
                    onNewItem={addGenre}
                    disabled={!isGenresEditable} // Disable if not editable
                />
              </div>

              <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Bitrate</Label>
                  <Input value={formData.bitrate || 'Unknown'} disabled className="bg-zinc-900 border-zinc-800 text-zinc-400" />
              </div>
            </TabsContent>

            <TabsContent value="links" className="p-6 space-y-6 mt-0 max-h-[400px] overflow-y-auto">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Initial Rating (0-10)</Label>
                <Input type="number" step="0.1" value={formData.initialRating} onChange={(e) => setFormData({...formData, initialRating: e.target.value})} className="bg-zinc-900 border-zinc-800" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Spotify Link</Label>
                  <Input value={formData.spotifyUrl} onChange={(e) => setFormData({...formData, spotifyUrl: e.target.value})} className="bg-zinc-900 border-zinc-800" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Genius Link</Label>
                  <Input value={formData.geniusUrl} onChange={(e) => setFormData({...formData, geniusUrl: e.target.value})} className="bg-zinc-900 border-zinc-800" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">YouTube Music Link</Label>
                <Input value={formData.youtubeMusicUrl} onChange={(e) => setFormData({...formData, youtubeMusicUrl: e.target.value})} className="bg-zinc-900 border-zinc-800" />
              </div>
            </TabsContent>

            <TabsContent value="relational" className="p-6 space-y-6 mt-0 max-h-[400px] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Linked Bios</h3>
                <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest border-zinc-800 bg-zinc-900/50" onClick={() => {setSelectedGroupId(undefined); setIsRelationalBioModalOpen(true);}}>
                  <Plus size={12} className="mr-1" /> New Bio
                </Button>
              </div>
              <div className="space-y-3">
                {trackGroups.map(group => (
                  <Card key={group.id} className="bg-zinc-900/50 border-zinc-800 p-4 flex items-center justify-between group/item">
                    <div className="flex items-center gap-3">
                      <LinkIcon size={14} className="text-blue-500" />
                      <span className="text-xs font-bold text-white">{group.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-blue-400" onClick={() => {setSelectedGroupId(group.id); setIsRelationalBioModalOpen(true);}}>
                          <Edit3 size={14} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-zinc-500 hover:text-red-500"
                        onClick={() => {
                          if (confirm("Delete this relational bio?")) {
                            deleteGroup(group.id);
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </Card>
                ))}
                {trackGroups.length === 0 && (
                  <p className="text-xs text-zinc-600 italic text-center py-8">No relational bios linked.</p>
                )}
              </div>
            </TabsContent>

            <div className="p-6 border-t border-zinc-900 flex items-center gap-4">
              <Button 
                type="button" 
                variant="destructive" 
                className="bg-red-600/10 text-red-500 border-red-500/20 hover:bg-red-600 hover:text-white font-black uppercase tracking-widest h-10 px-6"
                onClick={handleDelete}
              >
                <Trash2 size={16} className="mr-2" /> Delete Track
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 font-bold uppercase tracking-wider h-10">Save Changes</Button>
            </div>
          </form>
        </Tabs>
        <RelationalBioModal initialEntity={{ type: 'track', id: track.id, label: track.title }} open={isRelationalBioModalOpen} onOpenChange={setIsRelationalBioModalOpen} groupId={selectedGroupId} />
      </DialogContent>
    </Dialog>
  );
};