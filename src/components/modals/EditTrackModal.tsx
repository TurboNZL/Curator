import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMusicStore } from '@/store/useMusicStore';
import { Edit2, Music } from 'lucide-react';
import { toast } from 'sonner';
import { FileUpload } from '@/components/ui/FileUpload';
import { Track } from '@/types/music';

export const EditTrackModal = ({ track, children }: { track: Track, children?: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const updateTrack = useMusicStore((state) => state.updateTrack);
  
  const [formData, setFormData] = useState({
    title: track.title,
    rating: track.rating.toString(),
    genres: track.genres.join(', '),
    producers: track.producers.join(', '),
    bitrate: track.bitrate || '320kbps',
    audioUrl: track.localFilePath || '',
    spotifyUrl: track.spotifyUrl || '',
    geniusUrl: track.geniusUrl || '',
    soundcloudUrl: track.soundcloudUrl || '',
    youtubeMusicUrl: track.youtubeMusicUrl || ''
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

    await updateTrack(track.id, {
      title: formData.title,
      rating: parseFloat(formData.rating),
      genres: formData.genres.split(',').map(s => s.trim()).filter(Boolean),
      producers: formData.producers.split(',').map(s => s.trim()).filter(Boolean),
      bitrate: formData.bitrate,
      localFilePath: formData.audioUrl,
      spotifyUrl: cleanSpotifyUrl(formData.spotifyUrl),
      geniusUrl: formData.geniusUrl,
      soundcloudUrl: formData.soundcloudUrl,
      youtubeMusicUrl: formData.youtubeMusicUrl
    });

    toast.success(`Updated ${formData.title}`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="h-8 w-8 p-0 text-zinc-500 hover:text-white">
            <Edit2 size={14}/>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Music size={20} className="text-blue-500" />
            Edit Track
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
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
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-bold uppercase tracking-wider">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};