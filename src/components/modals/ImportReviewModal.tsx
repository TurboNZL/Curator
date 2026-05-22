"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Disc, Music, User, Plus, Loader2, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useMusicStore } from '@/store/useMusicStore';
import { cn, getAlbumDisplayCover } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArtistCreditSelect } from '../shared/ArtistCreditSelect';
import { MultiSelectSearch } from '@/components/ui/MultiSelectSearch';
import { Credit } from '../../server/types/music'; // Corrected import path

interface ImportedTrackData {
  title: string;
  youtubeMusicUrl: string;
  localFilePath: string;
  thumbnailUrl?: string;
  bitrate?: string;
}

interface ImportReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: {
    suggestedAlbumTitle: string;
    suggestedArtistName: string;
    suggestedArtistId?: string;
    suggestedAlbumCover: string;
    suggestedTracks: ImportedTrackData[];
  };
}

export const ImportReviewModal: React.FC<ImportReviewModalProps> = ({ isOpen, onClose, initialData }) => {
  const { artists, releases, addArtist, addAlbum, addRelease, addTracks, fetchData, genres: allGenres, addGenre } = useMusicStore();
  const [isSaving, setIsSaving] = useState(false);

  const [albumFormData, setAlbumFormData] = useState({
    title: initialData.suggestedAlbumTitle,
    artistCredits: [] as Credit[], // Now using artistCredits directly
    primaryCover: initialData.suggestedAlbumCover, 
    releaseDate: '',
    genres: [] as string[], // Added genres
  });

  const [tracksFormData, setTracksFormData] = useState<ImportedTrackData[]>(initialData.suggestedTracks);

  const genreOptions = useMemo(() => allGenres.map(genre => ({ value: genre, label: genre })), [allGenres]);

  useEffect(() => {
    if (isOpen) {
      const initialArtistId = initialData.suggestedArtistId;
      const initialArtistName = initialData.suggestedArtistName;
      let defaultArtistCredit: Credit[] = [];

      if (initialArtistId) {
        defaultArtistCredit = [{ artistId: initialArtistId, role: ['Lead artist'] }];
      } else if (initialArtistName) {
        const foundArtist = artists.find(a => a.name.toLowerCase() === initialArtistName.toLowerCase());
        if (foundArtist) {
          defaultArtistCredit = [{ artistId: foundArtist.id, role: ['Lead artist'] }];
        }
      }
      
      setAlbumFormData(prev => ({ 
        ...prev, 
        artistCredits: defaultArtistCredit,
        title: initialData.suggestedAlbumTitle, // Reset title in case it changed
        primaryCover: initialData.suggestedAlbumCover, // Reset cover
        releaseDate: '', // Reset release date
        genres: [], // Reset genres
      }));
      setTracksFormData(initialData.suggestedTracks);
    }
  }, [artists, initialData, isOpen]);


  const artistOptions = useMemo(() => {
    return artists.map(a => ({ value: a.id, label: a.name }));
  }, [artists]);

  const handleTrackTitleChange = (index: number, newTitle: string) => {
    setTracksFormData(prev => prev.map((t, i) => i === index ? { ...t, title: newTitle } : t));
  };

  const handleSaveImport = async () => {
    setIsSaving(true);
    try {
      if (!albumFormData.title) throw new Error("Album title is required.");
      if (albumFormData.artistCredits.length === 0 || albumFormData.artistCredits[0].artistId === '') throw new Error("At least one lead artist is required.");

      let finalArtistId = '';
      const primaryArtistCredit = albumFormData.artistCredits.find(ac => ac.role.includes('Lead artist'));

      if (primaryArtistCredit) {
        let existingPrimaryArtist = artists.find(a => a.id === primaryArtistCredit.artistId);
        if (!existingPrimaryArtist) {
          const newArtist = await addArtist({ name: primaryArtistCredit.artistId }); // artistId acts as name if new
          finalArtistId = newArtist.id;
          toast.success(`Artist "${newArtist.name}" created.`);
        } else {
          finalArtistId = existingPrimaryArtist.id;
        }
      } else {
        throw new Error("A lead artist must be specified in artist credits.");
      }
      
      const newAlbum = await addAlbum({
        title: albumFormData.title,
        artistId: finalArtistId,
        primaryCover: albumFormData.primaryCover || null, 
        pendingFiles: [], 
        // Removed credits: [],
        artistCredits: albumFormData.artistCredits, // Album artist credits (role: string[])
        genres: albumFormData.genres, // Add genres
      });
      toast.success(`Album "${albumFormData.title}" created.`);

      const tracksToCreate = tracksFormData.map((track, index) => ({
        ...track,
        artistId: finalArtistId,
        albumIds: [{ albumId: newAlbum.id, order: index }], 
        genres: albumFormData.genres, // Apply album genres to all tracks
        eloScore: 1000, comparisons: 0, memories: 0, queueRules: {},
        bitrate: track.bitrate,
        artistCredits: [{ artistId: finalArtistId, role: ['Lead artist'] }], // Add default artistCredits for tracks (role: string[])
        syncWithAlbumCredits: true,
      }));
      const createdTracks = await addTracks(tracksToCreate);
      toast.success(`Added ${tracksToCreate.length} tracks to "${newAlbum.title}".`);

      await addRelease({
        albumId: newAlbum.id,
        title: 'Streaming',
        releaseDate: albumFormData.releaseDate,
        coverImage: albumFormData.primaryCover, 
        trackIds: createdTracks.map(t => t.id)
      });
      toast.success(`Default release for "${newAlbum.title}" created.`);

      await fetchData();
      onClose();
    } catch (error: any) {
      console.error('Failed to save imported album:', error);
      toast.error(`Failed to complete import: ${error.message || 'An unexpected error occurred.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 border-b border-zinc-900 pb-4">
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Disc size={20} className="text-indigo-500" />
            Review Imported Album
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Review and edit details before adding this album and its tracks to your catalog.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="album-details" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-900 border-b border-zinc-800 rounded-none px-6">
            <TabsTrigger value="album-details" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-zinc-950 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-500">Album Details</TabsTrigger>
            <TabsTrigger value="tracks" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-zinc-950 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-500">Tracks ({tracksFormData.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="album-details" className="flex-1 p-6 space-y-6 mt-0 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Album Primary Cover</Label>
                  <ImageUpload
                    value={albumFormData.primaryCover}
                    onChange={(val) => setAlbumFormData(prev => ({ ...prev, primaryCover: val }))}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="album-title" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Album Title</Label>
                  <Input
                    id="album-title"
                    value={albumFormData.title}
                    onChange={(e) => setAlbumFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. My Beautiful Dark Twisted Fantasy"
                    className="bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500"
                  />
                </div>
                {/* Artist Credit Select replaces old primary/additional artist inputs */}
                <ArtistCreditSelect
                  value={albumFormData.artistCredits}
                  onChange={(credits) => setAlbumFormData(prev => ({ ...prev, artistCredits: credits }))}
                />
                <div className="space-y-2">
                  <Label htmlFor="release-date" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Release Date (for default release)</Label>
                  <Input
                    id="release-date"
                    type="date"
                    value={albumFormData.releaseDate}
                    onChange={(e) => setAlbumFormData(prev => ({ ...prev, releaseDate: e.target.value }))}
                    className="bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500"
                  />
                </div>
                 {/* Genres MultiSelectSearch */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Genres (Applies to Album & all tracks)</Label>
                  <MultiSelectSearch
                    options={genreOptions}
                    selected={albumFormData.genres.map(genre => ({ value: genre, label: genre }))}
                    onSelectedChange={(selectedItems) => setAlbumFormData(prev => ({ ...prev, genres: selectedItems.map(item => item.value) }))}
                    placeholder="Select genres..."
                    allowCustom
                    onNewItem={addGenre}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tracks" className="flex-1 p-6 space-y-4 mt-0 overflow-y-auto">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Edit individual track titles if needed. Genres will be inherited from the album.</p>
            <ScrollArea className="h-[calc(90vh-400px)] rounded-xl border border-zinc-900 bg-zinc-900/30 p-2">
              <div className="space-y-2">
                {tracksFormData.map((track, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-zinc-900 border border-zinc-800 rounded-lg">
                    <img src={track.thumbnailUrl || getAlbumDisplayCover(undefined, [], '/placeholder.svg')} alt="" className="w-10 h-10 object-cover rounded-md" />
                    <Input
                      value={track.title}
                      onChange={(e) => handleTrackTitleChange(index, e.target.value)}
                      className="flex-1 bg-zinc-800 border-zinc-700 text-white text-sm"
                      placeholder="Track Title"
                    />
                    <span className="text-[10px] font-mono text-zinc-600">{track.bitrate || 'N/A'}</span>
                    <a href={track.youtubeMusicUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-red-500">
                      <LinkIcon size={14} />
                    </a>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="px-6 py-4 border-t border-zinc-900">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-zinc-400 hover:text-white hover:bg-zinc-900 font-bold uppercase tracking-widest text-[10px]"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveImport}
            disabled={isSaving || !albumFormData.title || albumFormData.artistCredits.length === 0 || albumFormData.artistCredits[0].artistId === '' || tracksFormData.length === 0}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] px-8"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Confirm & Add to Catalog'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};