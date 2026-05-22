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
import { Credit } from '@/types/music';

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
  const { artists, releases, addArtist, addAlbum, addRelease, addTracks, fetchData, genres } = useMusicStore();
  const [isSaving, setIsSaving] = useState(false);

  const [albumFormData, setAlbumFormData] = useState({
    title: initialData.suggestedAlbumTitle,
    artistId: initialData.suggestedArtistId || '',
    artistNameInput: initialData.suggestedArtistName,
    primaryCover: initialData.suggestedAlbumCover, 
    releaseDate: '',
    artistCredits: [] as Credit[], // NEW: Album artist credits
  });

  const [tracksFormData, setTracksFormData] = useState<ImportedTrackData[]>(initialData.suggestedTracks);

  const allGenres = useMusicStore(state => state.genres);
  const genreOptions = allGenres.map(genre => ({ value: genre, label: genre }));
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]); // To allow setting genres for all tracks

  useEffect(() => {
    if (isOpen) {
      if (initialData.suggestedArtistId) {
        setAlbumFormData(prev => ({ ...prev, artistId: initialData.suggestedArtistId, artistNameInput: initialData.suggestedArtistName }));
        setAlbumFormData(prev => ({ ...prev, artistCredits: [{ artistId: initialData.suggestedArtistId, role: 'Lead artist' }] }));
      } else if (initialData.suggestedArtistName) {
        const foundArtist = artists.find(a => a.name.toLowerCase() === initialData.suggestedArtistName.toLowerCase());
        if (foundArtist) {
          setAlbumFormData(prev => ({ ...prev, artistId: foundArtist.id, artistNameInput: foundArtist.name }));
          setAlbumFormData(prev => ({ ...prev, artistCredits: [{ artistId: foundArtist.id, role: 'Lead artist' }] }));
        } else {
          setAlbumFormData(prev => ({ ...prev, artistId: '', artistNameInput: initialData.suggestedArtistName }));
          setAlbumFormData(prev => ({ ...prev, artistCredits: [] }));
        }
      }
      setSelectedGenres([]); // Reset genres
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
      let finalArtistId = albumFormData.artistId;
      let artistNameForToast = albumFormData.artistNameInput;

      if (!finalArtistId || !artists.some(a => a.id === finalArtistId)) {
        const nameToUse = albumFormData.artistNameInput;
        const existingArtistByName = artists.find(a => a.name.toLowerCase() === nameToUse.toLowerCase());
        
        if (existingArtistByName) {
          finalArtistId = existingArtistByName.id;
          artistNameForToast = existingArtistByName.name;
        } else {
          if (!nameToUse) throw new Error("Artist name is required to create a new artist.");
          const newArtist = await addArtist({ name: nameToUse });
          finalArtistId = newArtist.id;
          artistNameForToast = newArtist.name;
          toast.success(`Artist "${artistNameForToast}" created.`);
        }
      } else {
        artistNameForToast = artists.find(a => a.id === finalArtistId)?.name || artistNameForToast;
      }

      if (!finalArtistId) {
        throw new Error("Artist could not be created or identified.");
      }

      // Ensure primary artist is also in album artistCredits if not already there
      const finalAlbumArtistCredits = [...albumFormData.artistCredits];
      if (!finalAlbumArtistCredits.some(credit => credit.artistId === finalArtistId)) {
        finalAlbumArtistCredits.unshift({ artistId: finalArtistId, role: 'Lead artist' });
      }

      const newAlbum = await addAlbum({
        title: albumFormData.title,
        artistId: finalArtistId,
        artistIds: [finalArtistId],
        primaryCover: albumFormData.primaryCover || null, 
        pendingFiles: [], 
        credits: [],
        artistCredits: finalAlbumArtistCredits, // NEW: Album artist credits
      });
      toast.success(`Album "${albumFormData.title}" created.`);

      const tracksToCreate = tracksFormData.map((track, index) => ({
        ...track,
        artistId: finalArtistId,
        artistIds: [finalArtistId], 
        albumIds: [{ albumId: newAlbum.id, order: index }], // Use index for order
        genres: selectedGenres, // Apply selected genres to all tracks
        producers: [], writers: [], credits: [], // Removed as direct fields
        eloScore: 1000, comparisons: 0, memories: 0, queueRules: {},
        bitrate: track.bitrate,
        artistCredits: [{ artistId: finalArtistId, role: 'Lead artist' }], // Add default artistCredits for tracks
        syncWithAlbumCredits: true, // Default to true
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

  const handleArtistSelectChange = (value: string) => {
    const existingArtist = artists.find(a => a.id === value);
    const newArtistId = existingArtist ? existingArtist.id : value;

    setAlbumFormData(prev => ({
      ...prev,
      artistId: newArtistId,
      artistNameInput: existingArtist ? existingArtist.name : value,
      artistCredits: [{ artistId: newArtistId, role: 'Lead artist' }] // Set default lead artist for album
    }));
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
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Primary Artist</Label>
                  <SearchableSelect
                    options={artistOptions}
                    value={albumFormData.artistId}
                    onValueChange={handleArtistSelectChange}
                    placeholder="Search or type artist..."
                    allowCustom
                    className="bg-zinc-900 border-zinc-800"
                    contentClassName="bg-zinc-950 border-zinc-800"
                    itemClassName="text-white hover:bg-zinc-800"
                  />
                </div>
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
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tracks" className="flex-1 p-6 space-y-4 mt-0 overflow-y-auto">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Edit individual track titles if needed. Genres set below will apply to all tracks.</p>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Genres (Applies to all imported tracks)</Label>
              <MultiSelectSearch
                options={genreOptions}
                selected={selectedGenres.map(genre => ({ value: genre, label: genre }))}
                onSelectedChange={(selectedItems) => setSelectedGenres(selectedItems.map(item => item.value))}
                placeholder="Select genres..."
              />
            </div>
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
            disabled={isSaving || !albumFormData.title || (!albumFormData.artistId && !albumFormData.artistNameInput) || tracksFormData.length === 0}
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