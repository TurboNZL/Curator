import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMusicStore } from '@/store/useMusicStore';
import { Plus, Music, Info } from 'lucide-react';
import { toast } from 'sonner';
import { FileUpload } from '@/components/ui/FileUpload';

interface CreateTrackModalProps {
  albumId: string;
  artistId: string;
  children?: React.ReactNode;
}

export const CreateTrackModal = ({ albumId, artistId, children }: CreateTrackModalProps) => {
  const [open, setOpen] = useState(false);
  const addTracks = useMusicStore((state) => state.addTracks);
  
  const [formData, setFormData] = useState({
    title: '',
    rating: '5.0',
    genres: '',
    producers: '',
    bitrate: '320kbps',
    audioUrl: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return toast.error("Track title is required");

    const newTrack = {
      id: Math.random().toString(36).substring(7),
      title: formData.title,
      artistId,
      albumIds: [albumId],
      rating: parseFloat(formData.rating),
      initialRating: parseFloat(formData.rating),
      genres: formData.genres.split(',').map(s => s.trim()).filter(Boolean),
      producers: formData.producers.split(',').map(s => s.trim()).filter(Boolean),
      bitrate: formData.bitrate,
      localFilePath: formData.audioUrl
    };

    addTracks([newTrack]);
    toast.success(`"${formData.title}" indexed successfully`);
    setOpen(false);
    setFormData({ title: '', rating: '5.0', genres: '', producers: '', bitrate: '320kbps', audioUrl: '' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="h-8 border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white gap-2">
            <Plus size={14} /> Add Track
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Music size={20} className="text-blue-500" />
            Index New Track
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Audio Source</Label>
            <FileUpload 
              value={formData.audioUrl} 
              onChange={(url) => setFormData({...formData, audioUrl: url})} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Track Title</Label>
              <Input 
                id="title" 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g. Wesley's Theory" 
                className="bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rating" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Rating (0-10)</Label>
              <Input 
                id="rating" 
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={formData.rating}
                onChange={(e) => setFormData({...formData, rating: e.target.value})}
                className="bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="producers" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Producers</Label>
            <Input 
              id="producers" 
              value={formData.producers}
              onChange={(e) => setFormData({...formData, producers: e.target.value})}
              placeholder="Flying Lotus, Ronald Isley, Sounwave..." 
              className="bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="genres" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Genres</Label>
              <Input 
                id="genres" 
                value={formData.genres}
                onChange={(e) => setFormData({...formData, genres: e.target.value})}
                placeholder="Hip Hop, Jazz Fusion..." 
                className="bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bitrate" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Quality / Bitrate</Label>
              <Input 
                id="bitrate" 
                value={formData.bitrate}
                onChange={(e) => setFormData({...formData, bitrate: e.target.value})}
                placeholder="320kbps, FLAC..." 
                className="bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-bold uppercase tracking-wider">
              Commit to Database
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};