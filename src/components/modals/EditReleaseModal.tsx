import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMusicStore } from '@/store/useMusicStore';
import { Edit2, FileAudio, Check, Trash2, GripVertical, ArrowUp, ArrowDown, Plus } from 'lucide-react';

import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Release } from '@/types/music';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface EditReleaseModalProps {
  release: Release;
  albumId: string;
  children?: React.ReactNode;
}

export const EditReleaseModal = ({ release, albumId, children }: EditReleaseModalProps) => {
  const [open, setOpen] = useState(false);
  const { updateRelease, tracks } = useMusicStore();
  const albumTracks = tracks.filter(t => t.albumIds.includes(albumId));
  
  const [formData, setFormData] = useState({
    title: release.title,
    coverImage: release.coverImage || '',
    releaseDate: release.releaseDate || '',
    selectedTrackIds: release.trackIds || []
  });

  const toggleTrack = (id: string) => {
    setFormData(prev => ({
      ...prev,
      selectedTrackIds: prev.selectedTrackIds.includes(id)
        ? prev.selectedTrackIds.filter(tid => tid !== id)
        : [...prev.selectedTrackIds, id]
    }));
  };

  const moveTrack = (index: number, direction: 'up' | 'down') => {
    const newIds = [...formData.selectedTrackIds];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newIds.length) return;
    
    [newIds[index], newIds[targetIndex]] = [newIds[targetIndex], newIds[index]];
    setFormData({ ...formData, selectedTrackIds: newIds });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return toast.error("Release title is required");

    try {
      await updateRelease(release.id, {
        title: formData.title,
        coverImage: formData.coverImage,
        trackIds: formData.selectedTrackIds,
        releaseDate: formData.releaseDate
      });

      toast.success(`Release "${formData.title}" updated`);
      setOpen(false);
    } catch (error) {
      toast.error("Failed to update release");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white">
            <Edit2 size={12} />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <FileAudio size={20} className="text-blue-500" />
            Edit Release
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
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
            </div>

            <div className="space-y-4 flex flex-col">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tracklist Order</Label>
              <ScrollArea className="flex-1 h-[400px] rounded-xl border border-zinc-900 bg-zinc-900/30 p-2">
                <div className="space-y-1">
                  {formData.selectedTrackIds.map((tid, index) => {
                    const track = tracks.find(t => t.id === tid);
                    return (
                      <div key={tid} className="flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg group">
                        <div className="flex flex-col gap-0.5">
                          <button type="button" onClick={() => moveTrack(index, 'up')} className="text-zinc-600 hover:text-white"><ArrowUp size={10} /></button>
                          <button type="button" onClick={() => moveTrack(index, 'down')} className="text-zinc-600 hover:text-white"><ArrowDown size={10} /></button>
                        </div>
                        <span className="text-xs font-bold truncate flex-1">{track?.title}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-red-500" onClick={() => toggleTrack(tid)}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    );
                  })}
                  <div className="pt-4 border-t border-zinc-900 mt-4">
                    <Label className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-2 block">Add More Tracks</Label>
                    {albumTracks.filter(t => !formData.selectedTrackIds.includes(t.id)).map(track => (
                      <div 
                        key={track.id}
                        onClick={() => toggleTrack(track.id)}
                        className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-zinc-800 text-zinc-400 transition-colors"
                      >
                        <span className="text-xs font-bold truncate">{track.title}</span>
                        <Plus size={12} />
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </div>
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
