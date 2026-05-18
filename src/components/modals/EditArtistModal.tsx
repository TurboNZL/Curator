import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMusicStore } from '@/store/useMusicStore';
import { Edit2, User, Trash2, Plus, Link as LinkIcon, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Artist } from '@/types/music';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RelationalBioModal } from './RelationalBioModal';
import { Card } from '../ui/card';

export const EditArtistModal = ({ artist, children }: { artist: Artist, children?: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const { updateArtist, deleteArtist, groups, deleteGroup } = useMusicStore();
  
  const artistGroups = groups.filter(g =>
    g.members?.some(m => m.entityId === artist.id && m.entityType === 'artist')
  );

  const [formData, setFormData] = useState({
    name: artist.name,
    image: artist.image || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Artist name is required");

    await updateArtist(artist.id, {
      name: formData.name,
      image: formData.image || undefined,
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
              <TabsTrigger value="relational" className="text-[10px] font-black uppercase tracking-widest">Relational Bios</TabsTrigger>
            </TabsList>
          </div>

          <form onSubmit={handleSubmit}>
            <TabsContent value="metadata" className="p-6 space-y-6 mt-0 max-h-[400px] overflow-y-auto">
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
            </TabsContent>

            <TabsContent value="relational" className="p-6 space-y-6 mt-0 max-h-[400px] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Linked Bios</h3>
                <RelationalBioModal initialEntity={{ type: 'artist', id: artist.id, label: artist.name }}>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest border-zinc-800 bg-zinc-900/50">
                    <Plus size={12} className="mr-1" /> New Bio
                  </Button>
                </RelationalBioModal>
              </div>
              <div className="space-y-3">
                {artistGroups.map(group => (
                  <Card key={group.id} className="bg-zinc-900/50 border-zinc-800 p-4 flex items-center justify-between group/item">
                    <div className="flex items-center gap-3">
                      <LinkIcon size={14} className="text-blue-500" />
                      <span className="text-xs font-bold text-white">{group.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <RelationalBioModal groupId={group.id}>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-blue-400">
                          <Edit3 size={14} />
                        </Button>
                      </RelationalBioModal>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-zinc-500 hover:text-red-500"
                        onClick={() => {
                          if (confirm("Delete this relational bio?")) {
                            deleteGroup(group.id);
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </Card>
                ))}
                {artistGroups.length === 0 && (
                  <p className="text-xs text-zinc-600 italic text-center py-8">No relational bios linked.</p>
                )}
              </div>
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
