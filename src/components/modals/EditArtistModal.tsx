import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMusicStore } from '@/store/useMusicStore';
import { Edit2, User, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Artist } from '@/types/music';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotesSection } from '@/components/ui/NotesSection';
import { RelationalBioSection } from '@/components/ui/RelationalBioSection';

export const EditArtistModal = ({ artist, children }: { artist: Artist, children?: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const { updateArtist, deleteArtist, notes } = useMusicStore();
  const artistNotes = notes.filter(n => n.entityType === 'artist' && n.entityId === artist.id);
  
  const [formData, setFormData] = useState({
    name: artist.name,
    image: artist.image || '',
    bio: artist.bio || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Artist name is required");

    await updateArtist(artist.id, {
      name: formData.name,
      image: formData.image || undefined,
      bio: formData.bio || undefined
    });

    toast.success(`Updated ${formData.name}`);
    setOpen(false);
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this artist? This will remove all associated data.")) {
      await deleteArtist(artist.id);
      toast.success("Artist deleted");
      setOpen(false);
    }
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
              <User size={20} className="text-blue-500" />
              <h2 className="text-xl font-black uppercase tracking-tight">Edit Artist</h2>
            </div>
            <TabsList className="bg-zinc-900 border-zinc-800">
              <TabsTrigger value="metadata" className="text-[10px] font-black uppercase tracking-widest">Metadata</TabsTrigger>
              <TabsTrigger value="notes" className="text-[10px] font-black uppercase tracking-widest">Notes</TabsTrigger>
              <TabsTrigger value="relational" className="text-[10px] font-black uppercase tracking-widest">Relational</TabsTrigger>
            </TabsList>
          </div>

          <form onSubmit={handleSubmit}>
            <TabsContent value="metadata" className="p-6 space-y-6 mt-0">
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
                  className="bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Short Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  className="bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500 min-h-[100px]"
                />
              </div>
            </TabsContent>

            <TabsContent value="notes" className="p-6 space-y-6 mt-0 max-h-[400px] overflow-y-auto">
              <NotesSection entityType="artist" entityId={artist.id} />
            </TabsContent>

            <TabsContent value="relational" className="p-6 space-y-6 mt-0">
              <RelationalBioSection entityType="artist" entityId={artist.id} />
            </TabsContent>

            <div className="p-6 border-t border-zinc-900 flex items-center gap-4">
              <Button
                type="button"
                variant="destructive"
                className="bg-red-600/10 text-red-500 border-red-500/20 hover:bg-red-600 hover:text-white font-black uppercase tracking-widest h-10 px-6"
                onClick={handleDelete}
              >
                <Trash2 size={16} className="mr-2" /> Delete Artist
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 font-bold uppercase tracking-wider h-10">
                Save Changes
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
