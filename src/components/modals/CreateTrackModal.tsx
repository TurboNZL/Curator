import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMusicStore } from '@/store/useMusicStore';
import { Music, RefreshCw, FileAudio, Zap } from 'lucide-react'; // Added Zap icon
import { toast } from 'sonner';
import { FileUpload } from '@/components/ui/FileUpload';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ArtistCreditSelect } from '../shared/ArtistCreditSelect'; 
import { MultiSelectSearch } from '@/components/ui/MultiSelectSearch'; 
import { Credit }  from '@/../server/types/music'; // Corrected import path
import { Switch } from '@/components/ui/switch'; // Import Switch

interface CreateTrackModalProps {
  albumId?: string; 
  artistId?: string; 
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateTrackModal = ({ albumId: initialAlbumId = '', artistId: initialArtistId = '', open, onOpenChange }: CreateTrackModalProps) => {
  const [reopen, setReopen] = useState(false);
  const { artists, albums, addTracks, updateAlbum, genres: allGenres, addGenre } = useMusicStore(); // Renamed to allGenres
  
  const [formData, setFormData] = useState({
    title: '',
    artistCredits: [] as Credit[], 
    albumId: initialAlbumId,
    rating: '',
    genres: [] as string[],
    bitrate: '320kbps', 
    audioUrl: '',
    spotifyUrl: '',
    geniusUrl: '',
    youtubeMusicUrl: '',
    syncWithAlbumCredits: true, // Default to true
  });

  const genreOptions = useMemo(() => allGenres.map(genre => ({ value: genre, label: genre })), [allGenres]);

  const selectedAlbum = useMemo(() => albums.find(a => a.id === formData.albumId), [albums, formData.albumId]);
  const pendingFiles = selectedAlbum?.pendingFiles || [];

  // Determine if genres should be editable (not syncing with album, or no album)
  const isGenresEditable = useMemo(() => {
    return !selectedAlbum || !formData.syncWithAlbumCredits;
  }, [selectedAlbum, formData.syncWithAlbumCredits]);

  // Reset form data when the modal opens or initial props change
  React.useEffect(() => {
    if (open) {
      const albumGenres = selectedAlbum?.genres || [];
      setFormData({
        title: '',
        artistCredits: initialArtistId ? [{ artistId: initialArtistId, role: ['Lead artist'] }] : [], // Initialize artistCredits
        albumId: initialAlbumId,
        rating: '',
        genres: selectedAlbum ? albumGenres : [], // If album selected, inherit genres
        bitrate: '320kbps',
        audioUrl: '',
        spotifyUrl: '',
        geniusUrl: '',
        youtubeMusicUrl: '',
        syncWithAlbumCredits: !!selectedAlbum, // Sync by default if album is present
      });
    }
  }, [open, initialAlbumId, initialArtistId, selectedAlbum]);

  // Update genres if album or syncWithAlbumCredits changes
  React.useEffect(() => {
    if (selectedAlbum && formData.syncWithAlbumCredits) {
      setFormData(prev => ({ ...prev, genres: selectedAlbum.genres }));
    } else if (!selectedAlbum && formData.syncWithAlbumCredits) { // If no album, but sync is somehow true
      setFormData(prev => ({ ...prev, genres: [], syncWithAlbumCredits: false }));
    }
  }, [selectedAlbum, formData.syncWithAlbumCredits]);


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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return toast.error("Track title is required");
    if (formData.artistCredits.length === 0 || formData.artistCredits[0].artistId === '') return toast.error("At least one lead artist is required in artist credits");

    let finalPrimaryArtistId = '';
    const primaryArtistCredit = formData.artistCredits.find(ac => ac.role.includes('Lead artist'));

    if (primaryArtistCredit) {
        let existingPrimaryArtist = artists.find(a => a.id === primaryArtistCredit.artistId);
        if (!existingPrimaryArtist) {
            const res = await fetch('/api/artists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: primaryArtistCredit.artistId }) // artistId acts as name if new
            });
            const newArtist = await res.json();
            finalPrimaryArtistId = newArtist.id;
        } else {
            finalPrimaryArtistId = existingPrimaryArtist.id;
        }
    } else {
        return toast.error("A lead artist must be specified in artist credits.");
    }

    const newTrack = {
      title: formData.title,
      artistId: finalPrimaryArtistId, // Set primary artist from credits
      artistCredits: formData.artistCredits,
      albumIds: formData.albumId && formData.albumId !== 'none' ? [{ albumId: formData.albumId, order: 0 }] : [],
      rating: formData.rating ? parseFloat(formData.rating) : undefined,
      initialRating: formData.rating ? parseFloat(formData.rating) : undefined,
      genres: formData.genres,
      bitrate: formData.bitrate,
      localFilePath: formData.audioUrl,
      spotifyUrl: cleanSpotifyUrl(formData.spotifyUrl),
      geniusUrl: formData.geniusUrl,
      youtubeMusicUrl: formData.youtubeMusicUrl,
      eloScore: 1000,
      comparisons: 0,
      memories: 0,
      queueRules: {},
      syncWithAlbumCredits: formData.syncWithAlbumCredits,
      isFavorite: false,
    };

    await addTracks([newTrack]);

    if (selectedAlbum && pendingFiles.some(f => f.url === formData.audioUrl)) {
      await updateAlbum(selectedAlbum.id, {
        pendingFiles: pendingFiles.filter(f => f.url !== formData.audioUrl)
      });
    }

    toast.success(`"${formData.title}" indexed successfully`);
    
    if (!reopen) {
      onOpenChange(false);
    }
    
    setFormData({ 
      title: '', 
      artistCredits: [{ artistId: finalPrimaryArtistId, role: ['Lead artist'] }], // Keep primary artist for convenience if reopening
      albumId: formData.albumId, 
      rating: '', 
      genres: selectedAlbum && formData.syncWithAlbumCredits ? selectedAlbum.genres : [], // Reset genres based on sync
      bitrate: '320kbps', 
      audioUrl: '', 
      spotifyUrl: '', 
      geniusUrl: '', 
      youtubeMusicUrl: '',
      syncWithAlbumCredits: !!selectedAlbum,
    });
  };

  const albumOptions = useMemo(() => albums.filter(al => {
    const primaryArtistCredit = formData.artistCredits.find(ac => ac.role.includes('Lead artist'));
    const currentPrimaryArtistId = primaryArtistCredit?.artistId;
    return al.artistId === currentPrimaryArtistId;
  }).map(al => ({ value: al.id, label: al.title })), [albums, formData.artistCredits]);


  const autofillAllTracks = async () => {
    if (!selectedAlbum || pendingFiles.length === 0) {
      toast.error("No unassigned files or album selected.");
      return;
    }
  
    const primaryArtistCredit = formData.artistCredits.find(ac => ac.role.includes('Lead artist'));
    if (!primaryArtistCredit || !primaryArtistCredit.artistId) {
      toast.error("Please select a primary artist for the album first.");
      return;
    }
    const albumPrimaryArtistId = primaryArtistCredit.artistId;
  
    const tracksToCreate = pendingFiles.map(file => {
      const cleanTitle = file.name.split('.')[0].replace(/_/g, ' ');
      const defaultArtistCredits: Credit[] = [{ artistId: albumPrimaryArtistId, role: ['Lead artist'] }];

      return {
        title: cleanTitle,
        artistId: albumPrimaryArtistId,
        artistCredits: defaultArtistCredits, 
        albumIds: [{ albumId: selectedAlbum.id, order: 0 }],
        rating: undefined,
        initialRating: undefined,
        genres: selectedAlbum.genres, // Apply album genres to all tracks
        bitrate: '320kbps',
        localFilePath: file.url,
        spotifyUrl: '',
        geniusUrl: '',
        youtubeMusicUrl: '',
        eloScore: 1000,
        comparisons: 0,
        memories: 0,
        queueRules: {},
        syncWithAlbumCredits: true,
        isFavorite: false,
      };
    });
  
    try {
      await addTracks(tracksToCreate);
      await updateAlbum(selectedAlbum.id, { pendingFiles: [] });
      toast.success(`Added ${tracksToCreate.length} tracks from pending files.`);
      onOpenChange(false);
    } catch (error) {
      console.error("Autofill failed:", error);
      toast.error("Failed to autofill tracks.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Music size={20} className="text-blue-500" />
            Index New Track
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Audio Source</Label>
            
            {pendingFiles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Pick from unassigned files</Label>
                <div className="grid grid-cols-1 gap-1 max-h-[120px] overflow-y-auto pr-2">
                  {pendingFiles.map((file, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        const cleanTitle = file.name.split('.')[0].replace(/_/g, ' ');
                        setFormData({...formData, audioUrl: file.url, title: formData.title || cleanTitle});
                      }}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg border text-left transition-all",
                        formData.audioUrl === file.url ? "bg-blue-500/10 border-blue-500/50 text-blue-400" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                      )}
                    >
                      <FileAudio size={14} />
                      <span className="text-[10px] font-mono truncate">{file.name}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="h-px flex-1 bg-zinc-900" />
                  <span className="text-[8px] font-black uppercase text-zinc-700">OR</span>
                  <div className="h-px flex-1 bg-zinc-900" />
                  <Button type="button" variant="outline" className="ml-2 h-7 text-[10px] font-black uppercase tracking-widest" onClick={autofillAllTracks}>
                    Autofill All
                  </Button>
                </div>
              </div>
            )}

            <FileUpload value={formData.audioUrl} onChange={(url) => setFormData({...formData, audioUrl: url})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Album selection */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Album (Optional)</Label>
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
                placeholder="Search or type album..."
                allowCustom
                className="bg-zinc-900 border-zinc-800"
                contentClassName="bg-zinc-950 border-zinc-800"
                itemClassName="text-white hover:bg-zinc-800"
              />
            </div>
             {/* Track Title and Initial Rating */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Track Title</Label>
              <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="bg-zinc-900 border-zinc-800" />
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
                genres: checked && selectedAlbum ? selectedAlbum.genres : [], // Reset genres if toggling sync
              }))}
              disabled={!selectedAlbum} // Disable if no album is selected
            />
          </div>

          {/* Artist Credits */}
          <ArtistCreditSelect
            value={formData.artistCredits}
            onChange={(credits) => setFormData(prev => ({ ...prev, artistCredits: credits }))}
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

          <div className="flex items-center gap-2 py-2">
            <Checkbox id="reopen" checked={reopen} onCheckedChange={(val) => setReopen(!!val)} />
            <Label htmlFor="reopen" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer flex items-center gap-2">
              <RefreshCw size={12} /> Reopen after adding
            </Label>
          </div>

          <DialogFooter>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-bold uppercase tracking-wider">Commit to Database</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};