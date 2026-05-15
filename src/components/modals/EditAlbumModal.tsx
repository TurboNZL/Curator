import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMusicStore } from '@/store/useMusicStore';
import { Edit2, Layers, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Album } from '@/types/music';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotesSection } from '@/components/ui/NotesSection';
import { cn } from '@/lib/utils';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

export const EditAlbumModal = ({ album, children }: { album: Album, children?: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const { artists, updateAlbum, notes, releases, releaseTypes } = useMusicStore();
  const albumNotes = notes.filter(n => n.entityType === 'album' && n.entityId === album.id);
  const albumReleases = releases.filter(r => r.albumId === album.id);
  
  // Collect all unique covers from releases
  const availableCovers = Array.from(new Set([
    ...album.covers,
    ...albumReleases.map(r => r.coverImage).filter(Boolean) as string[]
  ]));

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
          <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-full border-zinc-800 bg-zinc-900/50">
            <Edit2 size={14}/>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[500px] p-0 overflow-hidden">
        <Tabs defaultValue="metadata" className="w-full">
          <div className="px-6 pt-6 flex items-center justify-between border-b border-zinc-900 pb-4">
            <div className="flex items-center gap-3">
              <Layers size={20} className="text-blue-500" />
              <h2 className="text-xl font-black uppercase tracking-tight">Edit Album</h2>
            </div>
            <TabsList className="bg-zinc-900 border-zinc-800">
              <TabsTrigger value="metadata" className="text-[10px] font-black uppercase tracking-widest">Metadata</TabsTrigger>
              <TabsTrigger value="notes" className="text-[10px] font-black uppercase tracking-widest">Notes ({albumNotes.length})</TabsTrigger>
            </TabsList>
          </div>

          <form onSubmit={handleSubmit}>
            <TabsContent value="metadata" className="p-6 space-y-6 mt-0">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Select Primary Cover</Label>
                <div className="grid grid-cols-4 gap-2">
                  {availableCovers.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormData({...formData, cover: url})}
                      className={cn(
                        "aspect-square rounded-lg overflow-hidden border-2 transition-all relative group",
                        formData.cover === url ? "border-blue-500" : "border-zinc-800 hover:border-zinc-600"
                      )}
                    >
                      <img src={url} className="w-full h-full object-cover" alt="" />
                      {formData.cover === url && (
                        <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                          <Check size={20} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                  {availableCovers.length === 0 && (
                    <div className="col-span-4 py-8 text-center border-2 border-dashed border-zinc-800 rounded-xl">
                      <p className="text-[10px] text-zinc-600 uppercase font-bold">No covers available. Add a release first.</p>
                    </div>
                  )}
                </div>
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
              <div className="grid grid-cols-2 gap-4">
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
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Release Type</Label>
                  <SearchableSelect 
                    options={typeOptions} 
                    value={formData.type} 
                    onValueChange={(val) => setFormData({...formData, type: val})}
                    placeholder="Search or type type..."
                    allowCustom
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="p-6 space-y-6 mt-0 max-h-[400px] overflow-y-auto">
              <NotesSection entityType="album" entityId={album.id} />
            </TabsContent>

            <div className="p-6 border-t border-zinc-900">
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-bold uppercase tracking-wider">
                Save Changes
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};