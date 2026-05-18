import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMusicStore } from '@/store/useMusicStore';
import { Plus, Disc, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ScrollArea } from '@/components/ui/scroll-area';

export const CreateAlbumModal = ({ children }: { children?: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const { artists, addAlbum, addRelease, releaseTypes, addReleaseType } = useMusicStore();
  
  const [formData, setFormData] = useState({
    title: '',
    artistId: '',
    releases: [] as { title: string; date: string; type: string }[]
  });

  const handleAddReleaseRow = () => {
    setFormData(prev => ({
      ...prev,
      releases: [...prev.releases, { title: 'Standard Edition', date: '', type: 'Full Album' }]
    }));
  };

  const handleRemoveReleaseRow = (index: number) => {
    setFormData(prev => ({
      ...prev,
      releases: prev.releases.filter((_, i) => i !== index)
    }));
  };

  const updateReleaseRow = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      releases: prev.releases.map((r, i) => i === index ? { ...r, [field]: value } : r)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return toast.error("Album title is required");
    if (!formData.artistId) return toast.error("Artist is required");

    try {
      let finalArtistId = formData.artistId;
      
      if (!artists.find(a => a.id === formData.artistId)) {
        const res = await fetch('/api/artists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.artistId, groups: '[]' })
        });
        const newArtist = await res.json();
        finalArtistId = newArtist.id;
      }

      const albumRes = await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          artistId: finalArtistId,
          artistIds: [], // Multi-artist support
          covers: []
        })
      });
      const newAlbum = await albumRes.json();

      for (const rel of formData.releases) {
        const standardTypes = ['Full Album', 'EP', 'Single', 'Deluxe'];
        if (!standardTypes.includes(rel.type) && !releaseTypes.find(t => t.name === rel.type)) {
          await addReleaseType(rel.type);
        }

        await addRelease({
          albumId: newAlbum.id,
          title: rel.title,
          releaseDate: rel.date,
          coverImage: '',
          trackIds: []
        });
      }

      toast.success(`"${formData.title}" created with ${formData.releases.length} releases`);
      setOpen(false);
      setFormData({ title: '', artistId: '', releases: [] });
    } catch (error) {
      console.error(error);
      toast.error("Failed to create album");
    }
  };

  const artistOptions = artists.map(a => ({ value: a.id, label: a.name }));
  const typeOptions = [
    { value: 'Full Album', label: 'Full Album' },
    { value: 'EP', label: 'EP' },
    { value: 'Single', label: 'Single' },
    { value: 'Deluxe', label: 'Deluxe' },
    ...releaseTypes.map(t => ({ value: t.name, label: t.name }))
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-2 rounded-full">
            <Plus size={18} />
            New Album
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Disc size={20} className="text-indigo-500" />
            Initialize Project
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-8 py-4">
          <div className="space-y-6">
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
              <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Album Title</Label>
              <Input 
                id="title" 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g. My Beautiful Dark Twisted Fantasy" 
                className="bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-4 flex flex-col">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Initial Releases</Label>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={handleAddReleaseRow}
                className="h-6 text-[10px] font-black uppercase text-indigo-400 hover:text-indigo-300"
              >
                <Plus size={12} className="mr-1" /> Add Release
              </Button>
            </div>
            
            <ScrollArea className="flex-1 h-[300px] rounded-xl border border-zinc-900 bg-zinc-900/30 p-4">
              <div className="space-y-4">
                {formData.releases.map((rel, i) => (
                  <div key={i} className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-3 relative group">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveReleaseRow(i)}
                      className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </Button>
                    <div className="space-y-1">
                      <Input 
                        placeholder="Release Title" 
                        value={rel.title}
                        onChange={(e) => updateReleaseRow(i, 'title', e.target.value)}
                        className="h-7 text-xs bg-zinc-900 border-zinc-800"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input 
                        type="date" 
                        value={rel.date}
                        onChange={(e) => updateReleaseRow(i, 'date', e.target.value)}
                        className="h-7 text-[10px] bg-zinc-900 border-zinc-800"
                      />
                      <SearchableSelect 
                        options={typeOptions} 
                        value={rel.type} 
                        onValueChange={(val) => updateReleaseRow(i, 'type', val)}
                        className="h-7 text-[10px]"
                        allowCustom
                      />
                    </div>
                  </div>
                ))}
                {formData.releases.length === 0 && (
                  <p className="text-[10px] text-zinc-600 italic text-center py-12">No releases added yet.</p>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="col-span-2 pt-4">
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold uppercase tracking-wider">
              Initialize Project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};