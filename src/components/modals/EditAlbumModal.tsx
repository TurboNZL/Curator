import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMusicStore } from '@/store/useMusicStore';
import { Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Album } from '@/types/music';

export const EditAlbumModal = ({ album, children }: { album: Album, children?: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const { artists, updateAlbum } = useMusicStore();
  
  const [formData, setFormData] = useState({
    title: album.title,
    artistId: album.artistId,
    cover: album.covers[0] || '',
    type: album.type
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return toast.error("Album title is required");

    await updateAlbum(album.id, {
      title: formData.title,
      artistId: formData.artistId,
      covers: formData.cover ? [formData.cover] : [],
      type: formData.type
    });

    toast.success(`Updated ${formData.title}`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-full border-zinc-800 bg-zinc-900/50">
            <Edit2 size={14}/>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight">Edit Album</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Cover Art</Label>
            <ImageUpload 
              value={formData.cover} 
              onChange={(val) => setFormData({...formData, cover: val})} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Album Title</Label>
            <Input 
              id="title" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Artist</Label>
            <Select value={formData.artistId} onValueChange={(val) => setFormData({...formData, artistId: val})}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                {artists.map(artist => (
                  <SelectItem key={artist.id} value={artist.id}>{artist.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Release Type</Label>
            <Select value={formData.type} onValueChange={(val) => setFormData({...formData, type: val as any})}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                <SelectItem value="Full Album">Full Album</SelectItem>
                <SelectItem value="EP">EP</SelectItem>
                <SelectItem value="Single">Single</SelectItem>
                <SelectItem value="Deluxe">Deluxe</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-bold uppercase tracking-wider">
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};