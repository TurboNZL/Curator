import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMusicStore } from '@/store/useMusicStore';
import { Plus, Music } from 'lucide-react';
import { toast } from 'sonner';
import { FileUpload } from '@/components/ui/FileUpload';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

interface CreateTrackModalProps {
  albumId?: string;
  artistId?: string;
  children?: React.ReactNode;
}

export const CreateTrackModal = ({ albumId: initialAlbumId = '', artistId: initialArtistId = '', children }: CreateTrackModalProps) => {
  const [open, setOpen] = useState(false);
  const { artists, albums, addTracks } = useMusicStore();
  
  const [formData, setFormData] = useState({
    title: '',
    artistId: initialArtistId,
    albumId: initialAlbumId,
    rating: '5.0',
    genres: '',
    producers: '',
    bitrate: '320kbps',
    audioUrl: '',
    spotifyUrl: '',
    geniusUrl: '',
    soundcloudUrl: '',
    youtubeMusicUrl: ''
  });

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
    if (!formData.artistId) return toast.error("Artist is required");

    const newTrack = {
      title: formData.title,
      artistId: formData.artistId,
      albumIds: formData.albumId && formData.albumId !== 'none' ? [formData.albumId] : [],
      rating: parseFloat(formData.rating),
      initialRating: parseFloat(formData.rating),
      genres: formData.genres.split(',').map(s => s.trim()).filter(Boolean),
      producers: formData.producers.split(',').map(s => s.trim()).filter(Boolean),
      writers: [],
      credits: [],
      bitrate: formData.bitrate,
      localFilePath: formData.audioUrl,
      spotifyUrl: cleanSpotifyUrl(formData.spotifyUrl),
      geniusUrl: formData.geniusUrl,
      soundcloudUrl: formData.soundcloudUrl,
      youtubeMusicUrl: formData.youtubeMusicUrl,
      eloScore: 1000,
      comparisons: 0,
      isFavorite: false
    };

    await addTracks([newTrack]);
    toast.success(`"${formData.title}" indexed successfully`);
    setOpen(false);
    setFormData({ 
      title: '', artistId: initialArtistId, albumId: initialAlbumId, rating: '5.0', genres: '', producers: '', bitrate: '320kbps', 
      audioUrl: '', spotifyUrl: '', geniusUrl: '', soundcloudUrl: '', youtubeMusicUrl: '' 
    });
  };

  const artistOptions = artists.map(a => ({ value: a.id, label: a.name }));
  const albumOptions = [
    { value: 'none', label: 'None (Single)' },
    ...albums.filter(al => al.artistId === formData.artistId).map(al => ({ value: al.id, label: al.title }))
  ];

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
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Music size={20} className="text-blue-500" />
            Index New Track
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Audio Source</Label>
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
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Rating (0-10)</Label>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">SoundCloud Link</Label>
              <Input value={formData.soundcloudUrl} onChange={(e) => setFormData({...formData, soundcloudUrl: e.target.value})} className="bg-zinc-900 border-zinc-800" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">YouTube Music Link</Label>
              <Input value={formData.youtubeMusicUrl} onChange={(e) => setFormData({...formData, youtubeMusicUrl: e.target.value})} className="bg-zinc-900 border-zinc-800" />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-bold uppercase tracking-wider">Commit to Database</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};