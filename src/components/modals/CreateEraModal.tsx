import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMusicStore } from '@/store/useMusicStore';
import { Plus, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface CreateEraModalProps {
  artistId: string;
  children?: React.ReactNode;
}

export const CreateEraModal = ({ artistId, children }: CreateEraModalProps) => {
  const [open, setOpen] = useState(false);
  const { artists, addTimelineEntry } = useMusicStore();
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Era name is required");

    // Update artist in store (we need to add an updateArtist action or handle it here)
    // For now, let's assume we'll add a generic updateArtist action to the store
    useMusicStore.setState((state) => ({
      artists: state.artists.map(a => a.id === artistId ? {
        ...a,
        eras: [...a.eras, { id: Math.random().toString(36).substring(7), artistId, ...formData }]
      } : a)
    }));

    addTimelineEntry({
      type: 'entry',
      title: `New Era: ${formData.name}`,
      description: `Defined a new creative period for the artist.`,
      entityId: artistId
    });

    toast.success(`Era "${formData.name}" created`);
    setOpen(false);
    setFormData({ name: '', description: '' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="link" className="text-xs text-blue-500 font-bold p-0 h-auto uppercase tracking-wider">
            Add Era
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Calendar size={20} className="text-blue-500" />
            Define Era
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Era Name</Label>
            <Input 
              id="name" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. The Soul-Sample Era" 
              className="bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Description</Label>
            <Textarea 
              id="description" 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe the sound, aesthetic, or timeframe..." 
              className="bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500 min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-bold uppercase tracking-wider">
              Save Era
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};