import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMusicStore } from '@/store/useMusicStore';
import { Plus, Music, RefreshCw, FileAudio } from 'lucide-react';
import { toast } from 'sonner';
import { FileUpload } from '@/components/ui/FileUpload';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const cleanSpotifyUrl = (url: string) => {
  if (!url) return '';
  const spotifyRegex = /https?:\/\/(?:open\.spotify\.com\/track\/|spotify:track:)([a-zA-Z0-9]{22})/;
  const match = url.match(spotifyRegex);
  return match ? `https://open.spotify.com/track/${match[1]}` : url;
};

interface CreateTrackModalProps {
  albumId?: string;
  artistId?: string;
  children?: React.ReactNode;
}

export const CreateTrackModal = ({ albumId: initialAlbumId = '', artistId: initialArtistId = '', children }: CreateTrackModalProps) => {
  const [open, setOpen] = useState(false);
  const [reopen, setReopen] = useState(false);
  const { artists, albums, addTracks, updateAlbum } = useMusicStore();
  
  const [formData, setFormData] = useState({
    title: '',
    artistId: initialArtistId,
    albumId: initialAlbumId,
    rating: '',
    genres: '',
    producers: '',
    bitrate: '320kbps',
    audioUrl: '',
    spotifyUrl: '',
    geniusUrl: '',
    soundcloudUrl: '',
    youtubeMusicUrl: '',
    syncWithAlbum: true
  });

  const selectedAlbum = useMemo(() => albums.find(a => a.id === formData.albumId), [albums, formData.albumId]);
  const pendingFiles = selectedAlbum?.pendingFiles || [];

  const handleAutofillAll = async () => {
    if (!selectedAlbum || pendingFiles.length === 0) return;
    
    const tracksToCreate = pendingFiles.map(file => {
      const cleanTitle = file.name.split('.')[0].replace(/_/g, ' ');
      return {
        title: cleanTitle,
        artistId: formData.artistId,
        artistIds: [],
        albumIds: [selectedAlbum.id],
        genres: selectedAlbum.genres || [],
        producers: selectedAlbum.producers || [],
        writers: selectedAlbum.writers || [],
        credits: selectedAlbum.credits || [],
        bitrate: '320kbps',
        localFilePath: file.url,
        eloScore: 1000,
        comparisons: 0,
        memories: 0,
        queueRules: {},
        syncWithAlbum: true
      };
    });

    await addTracks(tracksToCreate);
    await updateAlbum(selectedAlbum.id, { pendingFiles: [] });
    toast.success(`Indexed ${tracksToCreate.length} tracks from unassigned files`);
    setOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return toast.error("Track title is required");
    if (!formData.artistId) return toast.error("Artist is required");

    const newTrack: any = {
      title: formData.title,
      artistId: formData.artistId,
      artistIds: [], // Multi-artist support
      albumIds: formData.albumId && formData.albumId !== 'none' ? [formData.albumId] : [],
      rating: formData.rating ? parseFloat(formData.rating) : undefined,
      initialRating: formData.rating ? parseFloat(formData.rating) : undefined,
      bitrate: formData.bitrate,
      localFilePath: formData.audioUrl,
      spotifyUrl: cleanSpotifyUrl(formData.spotifyUrl),
      geniusUrl: formData.geniusUrl,
      soundcloudUrl: formData.soundcloudUrl,
      youtubeMusicUrl: formData.youtubeMusicUrl,
      eloScore: 1000,
      comparisons: 0,
      memories: 0,
      queueRules: {},
      syncWithAlbum: formData.syncWithAlbum
    };

    if (formData.syncWithAlbum && selectedAlbum) {
      newTrack.genres = selectedAlbum.genres || [];
      newTrack.producers = selectedAlbum.producers || [];
      newTrack.writers = selectedAlbum.writers || [];
      newTrack.credits = selectedAlbum.credits || [];
    } else {
      newTrack.genres = formData.genres.split(',').map(s => s.trim()).filter(Boolean);
      newTrack.producers = formData.producers.split(',').map(s => s.trim()).filter(Boolean);
      newTrack.writers = [];
      newTrack.credits = [];
    }

    await addTracks([newTrack]);

    // If we used a pending file, remove it from the album
    if (selectedAlbum && pendingFiles.some(f => f.url === formData.audioUrl)) {
      await updateAlbum(selectedAlbum.id, {
        pendingFiles: pendingFiles.filter(f => f.url !== formData.audioUrl)
      });
    }

    toast.success(`"${formData.title}" indexed successfully`);
    
    if (!reopen) {
      setOpen(false);
    }
    
    setFormData({ 
      title: '', artistId: formData.artistId, albumId: formData.albumId, rating: '', genres: '', producers: '', bitrate: '320kbps', 
      audioUrl: '', spotifyUrl: '', geniusUrl: '', soundcloudUrl: '', youtubeMusicUrl: '' 
    });
  };

  const artistOptions = artists.map(a => ({ value: a.id, label: a.name }));
  const albumOptions = albums.filter(al => al.artistId === formData.artistId).map(al => ({ value: al.id, label: al.title }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="h-8 border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white gap-2">
            <Plus size={14} /> Add Track
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Music size={20} className="text-blue-500" />
              Index New Track
            </DialogTitle>
            {pendingFiles.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutofillAll}
                className="h-7 text-[9px] font-black uppercase tracking-widest border-emerald-500/30 bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500 hover:text-white"
              >
                Autofill All ({pendingFiles.length})
              </Button>
            )}
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <div className="space-y-0.5">
                <Label className="text-[10px] font-bold text-blue-400">Sync with Album</Label>
                <p className="text-[8px] text-zinc-500 uppercase font-bold">Inherit genres and credits</p>
              </div>
              <Switch
                checked={formData.syncWithAlbum}
                onCheckedChange={(val) => setFormData({...formData, syncWithAlbum: val})}
              />
            </div>

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
                <div className="flex items-center gap-2 py-2">
                  <div className="h-px flex-1 bg-zinc-900" />
                  <span className="text-[8px] font-black uppercase text-zinc-700">OR UPLOAD NEW</span>
                  <div className="h-px flex-1 bg-zinc-900" />
                </div>
              </div>
            )}

            <FileUpload value={formData.audioUrl} onChange={(url) => setFormData({...formData, audioUrl: url})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Artist</Label>
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
