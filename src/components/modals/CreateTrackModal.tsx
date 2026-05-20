import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMusicStore } from '@/store/useMusicStore';
import { Music, RefreshCw, FileAudio, X } from 'lucide-react';
import { toast } from 'sonner';
import { FileUpload } from '@/components/ui/FileUpload';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface CreateTrackModalProps {
  albumId?: string; // These props are now optional for initial form state
  artistId?: string; // These props are now optional for initial form state
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateTrackModal = ({ albumId: initialAlbumId = '', artistId: initialArtistId = '', open, onOpenChange }: CreateTrackModalProps) => {
  const [reopen, setReopen] = useState(false);
  const { artists, albums, addTracks, updateAlbum } = useMusicStore();
  
  const [formData, setFormData] = useState({
    title: '',
    artistId: initialArtistId,
    artistIds: [] as string[],
    albumId: initialAlbumId,
    rating: '',
    genres: '',
    producers: '',
    bitrate: '320kbps', // Bitrate still stored, but not editable directly
    audioUrl: '',
    spotifyUrl: '',
    geniusUrl: '',
    youtubeMusicUrl: ''
  });

  // Reset form data when the modal opens or initial props change
  React.useEffect(() => {
    if (open) {
      setFormData({
        title: '',
        artistId: initialArtistId,
        artistIds: [],
        albumId: initialAlbumId,
        rating: '',
        genres: '',
        producers: '',
        bitrate: '320kbps',
        audioUrl: '',
        spotifyUrl: '',
        geniusUrl: '',
        youtubeMusicUrl: ''
      });
    }
  }, [open, initialAlbumId, initialArtistId]);

  const selectedAlbum = useMemo(() => albums.find(a => a.id === formData.albumId), [albums, formData.albumId]);
  const pendingFiles = selectedAlbum?.pendingFiles || [];

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
    if (!formData.artistId) return toast.error("Primary artist is required");

    let finalPrimaryArtistId = formData.artistId;
    let finalArtistIds = [...formData.artistIds];

    const existingPrimaryArtist = artists.find(a => a.id === formData.artistId);
    if (!existingPrimaryArtist) {
      // If primary artist is a new name, create it
      const res = await fetch('/api/artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.artistId, groups: '[]' })
      });
      const newArtist = await res.json();
      finalPrimaryArtistId = newArtist.id;
    }

    const newTrack = {
      title: formData.title,
      artistId: finalPrimaryArtistId,
      artistIds: finalArtistIds,
      albumIds: formData.albumId && formData.albumId !== 'none' ? [{ albumId: formData.albumId, order: 0 }] : [], // Corrected albumIds structure
      rating: formData.rating ? parseFloat(formData.rating) : undefined,
      initialRating: formData.rating ? parseFloat(formData.rating) : undefined,
      genres: formData.genres.split(',').map(s => s.trim()).filter(Boolean),
      producers: formData.producers.split(',').map(s => s.trim()).filter(Boolean),
      writers: [],
      credits: [],
      bitrate: formData.bitrate,
      localFilePath: formData.audioUrl,
      spotifyUrl: cleanSpotifyUrl(formData.spotifyUrl),
      geniusUrl: formData.geniusUrl,
      youtubeMusicUrl: formData.youtubeMusicUrl,
      eloScore: 1000,
      comparisons: 0,
      memories: 0,
      queueRules: {}
    };

    await addTracks([newTrack]);

    // If we used a pending file, remove it from the album
    if (selectedAlbum && pendingFiles.some(f => f.url === formData.audioUrl)) {
      await updateAlbum(selectedAlbum.id, {
        pendingFiles: pendingFiles.filter(f => f.url !== formData.audioUrl)
      });
    }

    toast.success(`"${formData.title}" indexed successfully`);
    
    if (!reopen) {
      onOpenChange(false); // Close modal
    }
    
    setFormData({ 
      title: '', 
      artistId: formData.artistId, 
      artistIds: [],
      albumId: formData.albumId, 
      rating: '', 
      genres: '', 
      producers: '', 
      bitrate: '320kbps', 
      audioUrl: '', 
      spotifyUrl: '', 
      geniusUrl: '', 
      youtubeMusicUrl: '' 
    });
  };

  const artistOptions = artists.map(a => ({ value: a.id, label: a.name }));
  const albumOptions = albums.filter(al => al.artistId === formData.artistId).map(al => ({ value: al.id, label: al.title }));

  const addArtist = (id: string) => {
    if (!formData.artistIds.includes(id)) {
      setFormData(prev => ({ ...prev, artistIds: [...prev.artistIds, id] }));
    }
  };

  const removeArtist = (id: string) => {
    setFormData(prev => ({ ...prev, artistIds: prev.artistIds.filter(aid => aid !== id) }));
  };

  const autofillAllTracks = async () => {
    if (!selectedAlbum || pendingFiles.length === 0) {
      toast.error("No unassigned files or album selected.");
      return;
    }
  
    if (!formData.artistId) {
      toast.error("Please select a primary artist for the album first.");
      return;
    }
  
    const tracksToCreate = pendingFiles.map(file => {
      const cleanTitle = file.name.split('.')[0].replace(/_/g, ' ');
      return {
        title: cleanTitle,
        artistId: formData.artistId,
        artistIds: formData.artistIds,
        albumIds: [{ albumId: selectedAlbum.id, order: 0 }], // Corrected albumIds structure
        rating: undefined,
        initialRating: undefined,
        genres: [],
        producers: [],
        writers: [],
        credits: [],
        bitrate: '320kbps', // Default, would ideally be extracted
        localFilePath: file.url,
        spotifyUrl: '',
        geniusUrl: '',
        youtubeMusicUrl: '',
        eloScore: 1000,
        comparisons: 0,
        memories: 0,
        queueRules: {}
      };
    });
  
    try {
      await addTracks(tracksToCreate);
      await updateAlbum(selectedAlbum.id, { pendingFiles: [] }); // Clear pending files
      toast.success(`Added ${tracksToCreate.length} tracks from pending files.`);
      onOpenChange(false); // Close modal after autofill
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
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Primary Artist</Label>
              <SearchableSelect 
                options={artistOptions} 
                value={formData.artistId} 
                onValueChange={(val) => setFormData({...formData, artistId: val})}
                placeholder="Search or type artist..."
                allowCustom
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Album (Optional)</Label>
              <SearchableSelect 
                options={albumOptions} 
                value={formData.albumId} 
                onValueChange={(val) => setFormData({...formData, albumId: val})}
                placeholder="Search or type album..."
                allowCustom
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Additional Artists</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.artistIds.map(aid => {
                const a = artists.find(art => art.id === aid);
                return (
                  <div key={aid} className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-bold text-zinc-400">
                    <span>{a?.name || aid}</span>
                    <button type="button" onClick={() => removeArtist(aid)} className="text-zinc-600 hover:text-red-500">
                      <X size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
            <SearchableSelect
              options={artistOptions.filter(opt => opt.value !== formData.artistId && !formData.artistIds.includes(opt.value))}
              value=""
              onValueChange={addArtist}
              placeholder="Add another artist..."
              allowCustom
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Track Title</Label>
              <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="bg-zinc-900 border-zinc-800" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Rating (0-10, empty for unrated)</Label>
              <Input type="number" step="0.1" value={formData.rating} onChange={(e) => setFormData({...formData, rating: e.target.value})} className="bg-zinc-900 border-zinc-800" />
            </div>
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