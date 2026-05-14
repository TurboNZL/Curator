import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMusicStore } from '@/store/useMusicStore';
import { Edit2, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Album } from '@/types/music';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotesSection } from '@/components/ui/NotesSection';

export const EditAlbumModal = ({ album, children }: { album: Album, children?: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const { artists, updateAlbum, notes } = useMusicStore();
  const albumNotes = notes.filter(n => n.entityType === 'album' && n.entityId === album.id);
  
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
              <div className="grid grid-cols-2 gap-4">
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
