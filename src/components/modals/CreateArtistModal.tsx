import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMusicStore } from '@/store/useMusicStore';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Mic2 } from 'lucide-react'; // Added icon import

interface CreateArtistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateArtistModal = ({ open, onOpenChange }: CreateArtistModalProps) => {
  const addArtist = useMusicStore((state) => state.addArtist);
  
  const [formData, setFormData] = useState({
    name: '',
    image: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Artist name is required");

    addArtist({
      name: formData.name,
      image: formData.image || undefined,
    });

    toast.success(`${formData.name} added to catalog`);
    onOpenChange(false); // Close modal
    setFormData({ name: '', image: '' }); // Reset form
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Mic2 size={20} className="text-blue-500" />
            Add New Artist
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Artist Image</Label>
            <ImageUpload 
              value={formData.image} 
              onChange={(val) => setFormData({...formData, image: val})} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Artist Name</Label>
            <Input 
              id="name" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. Kendrick Lamar" 
              className="bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500"
            />
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-bold uppercase tracking-wider">
              Create Entity
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};