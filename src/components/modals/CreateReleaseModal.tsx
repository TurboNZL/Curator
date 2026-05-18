import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMusicStore } from '@/store/useMusicStore';
import { Plus, FileAudio, Check } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface CreateReleaseModalProps {
  albumId: string;
  children?: React.ReactElement; // Enforce single React element
}

export const CreateReleaseModal = ({ albumId, children }: CreateReleaseModalProps) => {
  const [open, setOpen] = useState(false);
  const { addRelease, tracks } = useMusicStore();
  const albumTracks = tracks.filter(t => t.albumIds.includes(albumId));
  
  const [formData, setFormData] = useState({
    title: 'Streaming', // Default title 'Streaming'
    coverImage: '',
    releaseDate: '',
    selectedTrackIds: [] as string[]
  });

  const toggleTrack = (id: string) => {
    setFormData(prev => ({
      ...prev,
      selectedTrackIds: prev.selectedTrackIds.includes(id)
        ? prev.selectedTrackIds.filter(tid => tid !== id)
        : [...prev.selectedTrackIds, id]
    }));
  };

  const autofillTracks = () => {
    setFormData(prev => ({
      ...prev,
      selectedTrackIds: albumTracks.map(t => t.id)
    }));
    toast.info("All album tracks added to release.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return toast.error("Release title is required");

    try {
      await addRelease({
        albumId,
        title: formData.title,
        coverImage: formData.coverImage,
        trackIds: formData.selectedTrackIds,
        releaseDate: formData.releaseDate
      });

      toast.success(`Release "${formData.title}" indexed`);
      setOpen(false);
      setFormData({ title: 'Streaming', coverImage: '', releaseDate: '', selectedTrackIds: [] });
    } catch (error) {
      toast.error("Failed to save release");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ? children : (
          <Button variant="link" className="text-xs text-blue-500 font-bold p-0 h-auto uppercase tracking-wider flex items-center gap-1">
            <Plus size={12} /> Add Release
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <FileAudio size={20} className="text-blue-500" />
            Index Release
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-6">
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
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Include Tracks</Label>
                {albumTracks.length > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={autofillTracks} className="h-6 text-[10px] font-black uppercase text-blue-400 hover:text-blue-300">
                    <Plus size={12} className="mr-1" /> Autofill
                  </Button>
                )}
              </div>
              <ScrollArea className="h-[280px] rounded-xl border border-zinc-900 bg-zinc-900/30 p-2">
                <div className="space-y-1">
                  {albumTracks.map(track => (
                    <div 
                      key={track.id}
                      onClick={() => toggleTrack(track.id)}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors",
                        formData.selectedTrackIds.includes(track.id) 
                          ? "bg-blue-500/10 text-blue-400" 
                          : "hover:bg-zinc-800 text-zinc-400"
                      )}
                    >
                      <span className="text-xs font-bold truncate">{track.title}</span>
                      {formData.selectedTrackIds.includes(track.id) && <Check size={12} />}
                    </div>
                  ))}
                  {albumTracks.length === 0 && (
                    <p className="text-[10px] text-zinc-600 italic p-4 text-center">No tracks found in this album.</p>
                  )}
                </div>
              </ScrollArea>
            </div>
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