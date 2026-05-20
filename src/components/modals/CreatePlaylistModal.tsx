"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useMusicStore } from '@/store/useMusicStore';
import { ListMusic } from 'lucide-react'; // Added icon import
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/ImageUpload';

interface CreatePlaylistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreatePlaylistModal = ({ open, onOpenChange }: CreatePlaylistModalProps) => {
  const addPlaylist = useMusicStore((state) => state.addPlaylist);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    coverImage: ''
  });

  // Reset form data when the modal opens
  React.useEffect(() => {
    if (open) {
      setFormData({ name: '', description: '', coverImage: '' });
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Playlist name is required");

    addPlaylist({
      name: formData.name,
      description: formData.description,
      coverImage: formData.coverImage,
      trackIds: [],
    });

    toast.success(`Playlist "${formData.name}" created`);
    onOpenChange(false); // Close modal
    setFormData({ name: '', description: '', coverImage: '' }); // Reset form
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <ListMusic size={20} className="text-emerald-500" />
            Create Playlist
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Cover Art</Label>
            <ImageUpload 
              value={formData.coverImage} 
              onChange={(val) => setFormData({...formData, coverImage: val})} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Playlist Name</Label>
            <Input 
              id="name" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. Late Night Jazz" 
              className="bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Description</Label>
            <Textarea 
              id="description" 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="What's the vibe of this collection?" 
              className="bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500 min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold uppercase tracking-wider">
              Initialize Collection
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};