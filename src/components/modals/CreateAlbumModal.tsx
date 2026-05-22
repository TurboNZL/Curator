import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMusicStore } from '@/store/useMusicStore';
import { Plus, Disc, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImageUpload } from '../ui/ImageUpload';
import { ArtistCreditSelect } from '../shared/ArtistCreditSelect'; // Import ArtistCreditSelect
import { Credit } from '@/types/music'; // Import Credit type

interface CreateAlbumModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateAlbumModal = ({ open, onOpenChange }: CreateAlbumModalProps) => {
  const { artists, addAlbum, addRelease } = useMusicStore();
  
  const [formData, setFormData] = useState({
    title: '',
    artistId: '', // Primary artist
    artistIds: [] as string[], // Additional artists
    artistCredits: [] as Credit[], // NEW: Album artist credits
    primaryCover: '', 
    credits: [] as string[], // General album notes
    releases: [] as { title: string; date: string }[]
  });

  const handleAddReleaseRow = () => {
    setFormData(prev => ({
      ...prev,
      releases: [...prev.releases, { title: 'Streaming', date: '' }] 
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
    if (!formData.artistId) return toast.error("Primary artist is required");

    try {
      let finalPrimaryArtistId = formData.artistId;
      
      const existingPrimaryArtist = artists.find(a => a.id === formData.artistId);
      if (!existingPrimaryArtist) {
        const res = await fetch('/api/artists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.artistId, groups: '[]' })
        });
        const newArtist = await res.json();
        finalPrimaryArtistId = newArtist.id;
      }

      // Ensure primary artist is also in artistCredits if not already there
      const finalArtistCredits = [...formData.artistCredits];
      if (!finalArtistCredits.some(credit => credit.artistId === finalPrimaryArtistId)) {
        finalArtistCredits.unshift({ artistId: finalPrimaryArtistId, role: 'Lead artist' });
      }


      const newAlbum = await addAlbum({
        title: formData.title,
        artistId: finalPrimaryArtistId,
        artistIds: [finalPrimaryArtistId, ...formData.artistIds.filter(id => id !== finalPrimaryArtistId)], 
        primaryCover: formData.primaryCover || null, 
        pendingFiles: [], 
        credits: formData.credits, // General album credits
        artistCredits: finalArtistCredits, // NEW: Album artist credits
      });

      for (const rel of formData.releases) {
        await addRelease({
          albumId: newAlbum.id,
          title: rel.title,
          releaseDate: rel.date,
          coverImage: formData.primaryCover || '', 
          trackIds: []
        });
      }

      toast.success(`"${formData.title}" created with ${formData.releases.length} releases`);
      onOpenChange(false); 
      setFormData({ 
        title: '', 
        artistId: '', 
        artistIds: [],
        artistCredits: [],
        primaryCover: '', 
        credits: [],
        releases: [] 
      }); 
    } catch (error) {
      console.error(error);
      toast.error("Failed to create album");
    }
  };

  const artistOptions = artists.map(a => ({ value: a.id, label: a.name }));
  const addArtist = (id: string) => {
    if (!formData.artistIds.includes(id)) {
      setFormData(prev => ({ ...prev, artistIds: [...prev.artistIds, id] }));
    }
  };

  const removeArtist = (id: string) => {
    setFormData(prev => ({ ...prev, artistIds: prev.artistIds.filter(aid => aid !== id) }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Album Primary Cover</Label>
              <ImageUpload
                value={formData.primaryCover}
                onChange={(val) => setFormData({...formData, primaryCover: val})}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Primary Artist</Label>
              <SearchableSelect 
                options={artistOptions} 
                value={formData.artistId} 
                onValueChange={(val) => setFormData({...formData, artistId: val})}
                placeholder="Search or type artist..."
                allowCustom
                className="bg-zinc-900 border-zinc-800"
                contentClassName="bg-zinc-950 border-zinc-800"
                itemClassName="text-white hover:bg-zinc-800"
              />
            </div>
             <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Additional Artists</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.artistIds.map(aid => {
                  const a = artists.find(art => art.id === aid);
                  return (
                    <div key={aid} className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-bold text-zinc-400">
                      <span>{a?.name || aid}</span>
                      <button type="button" onClick={() => removeArtist(aid)} className="text-zinc-600 hover:text-red-500">
                        <X size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <SearchableSelect
                options={artistOptions.filter(opt => opt.value !== formData.artistId && !formData.artistIds.includes(opt.value))}
                value=""
                onValueChange={addArtist}
                placeholder="Add another artist..."
                allowCustom
                className="bg-zinc-900 border-zinc-800"
                contentClassName="bg-zinc-950 border-zinc-800"
                itemClassName="text-white hover:bg-zinc-800"
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
            {/* New: ArtistCreditSelect for album-level artist roles */}
            <ArtistCreditSelect
              value={formData.artistCredits}
              onChange={(credits) => setFormData(prev => ({ ...prev, artistCredits: credits }))}
            />
            {/* Existing: General Album Credits */}
            <div className="space-y-2">
              <Label htmlFor="credits" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">General Album Notes (comma separated)</Label>
              <Input 
                id="credits" 
                value={formData.credits.join(', ')} // Display as comma-separated
                onChange={(e) => setFormData({...formData, credits: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} // Parse back to array
                placeholder="e.g. Mixed by Dr. Dre, Mastered by Mike Dean" 
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