import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMusicStore } from '@/store/useMusicStore';
import { Plus, FileAudio } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/ImageUpload';

interface CreateReleaseModalProps {
  albumId: string;
  children?: React.ReactNode;
}

export const CreateReleaseModal = ({ albumId, children }: CreateReleaseModalProps) => {
  const [open, setOpen] = useState(false);
  const addRelease = useMusicStore((state) => state.addRelease);
  
  const [formData, setFormData] = useState({
    title: '',
    coverImage: '',
    releaseDate: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return toast.error("Release title is required");

    try {
      await addRelease({
        albumId,
        title: formData.title,
        coverImage: formData.coverImage,
        trackIds: [],
        releaseDate: formData.releaseDate
      });

      toast.success(`Release "${formData.title}" indexed`);
      setOpen(false);
      setFormData({ title: '', coverImage: '', releaseDate: '' });
    } catch (error) {
      toast.error("Failed to save release");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="link" className="text-xs text-blue-500 font-bold p-0 h-auto uppercase tracking-wider flex items-center gap-1">
            <Plus size={12} /> Add Release
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <FileAudio size={20} className="text-blue-500" />
            Index Release
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Release Artwork</Label>
            <ImageUpload 
              value={formData.coverImage} 
              onChange={(val) => setFormData({...formData, coverImage: val})} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Release Title</Label>
            <Input 
              id="title" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g. 2014 Vinyl Pressing" 
              className="bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Release Date</Label>
            <Input 
              id="date" 
              type="date"
              value={formData.releaseDate}
              onChange={(e) => setFormData({...formData, releaseDate: e.target.value})}
              className="bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500"
            />
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-bold uppercase tracking-wider">
              Save Release
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};