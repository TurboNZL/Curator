import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMusicStore } from '@/store/useMusicStore';
import { Edit2, FileAudio, Check, Trash2, GripVertical, Plus, Layers, Link as LinkIcon, Edit3 } from 'lucide-react';

import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Release } from '@/types/music';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RelationalBioModal } from './RelationalBioModal';
import { Card } from '../ui/card';

interface EditReleaseModalProps {
  release: Release;
  albumId: string;
  children?: React.ReactElement; // Enforce single React element
}

export const EditReleaseModal = ({ release, albumId, children }: EditReleaseModalProps) => {
  const [open, setOpen] = useState(false);
  const { updateRelease, tracks, groups, deleteGroup } = useMusicStore();
  const albumTracks = tracks.filter(t => t.albumIds.includes(albumId));
  
  const releaseGroups = groups.filter(g =>
    g.members?.some(m => m.entityId === release.id && m.entityType === 'release' && m.showOnEntityPage)
  );

  const [formData, setFormData] = useState({
    title: release.title,
    coverImage: release.coverImage || '',
    releaseDate: release.releaseDate || '',
    selectedTrackIds: release.trackIds || []
  });

  const [draggedIndex, setDragIndex] = useState<number | null>(null);
  const [isRelationalBioModalOpen, setIsRelationalBioModalOpen] = React.useState(false);


  const onDragStart = (index: number) => {
    setDragIndex(index);
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newIds = [...formData.selectedTrackIds];
    const item = newIds[draggedIndex];
    newIds.splice(draggedIndex, 1);
    newIds.splice(index, 0, item);
    
    setFormData({ ...formData, selectedTrackIds: newIds });
    setDragIndex(index);
  };

  const onDragEnd = () => {
    setDragIndex(null);
  };

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
        {children ? children : (
          <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white">
            <Edit2 size={12} />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0">
        <Tabs defaultValue="metadata" className="w-full">
          <div className="px-6 pt-6 flex items-center justify-between border-b border-zinc-900 pb-4">
            <div className="flex items-center gap-3">
              <Layers size={20} className="text-blue-500" />
              <h2 className="text-xl font-black uppercase tracking-tight">Edit Release</h2>
            </div>
            <TabsList className="bg-zinc-900 border-zinc-800">
              <TabsTrigger value="metadata" className="text-[10px] font-black uppercase tracking-widest">Metadata</TabsTrigger>
              <TabsTrigger value="relational" className="text-[10px] font-black uppercase tracking-widest">Relational Bios</TabsTrigger>
            </TabsList>
          </div>

          <form onSubmit={handleSubmit}>
            <TabsContent value="metadata" className="p-6 space-y-6 mt-0">
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
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tracklist Order</Label>
                    {albumTracks.length > 0 && (
                      <Button type="button" variant="ghost" size="sm" onClick={autofillTracks} className="h-6 text-[10px] font-black uppercase text-blue-400 hover:text-blue-300">
                        <Plus size={12} className="mr-1" /> <span>Autofill</span>
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="flex-1 h-[400px] rounded-xl border border-zinc-900 bg-zinc-900/30 p-2">
                    <div className="space-y-1">
                      {formData.selectedTrackIds.map((tid, index) => {
                        const track = tracks.find(t => t.id === tid);
                        return (
                          <div
                            key={tid}
                            draggable
                            onDragStart={() => onDragStart(index)}
                            onDragOver={(e) => onDragOver(e, index)}
                            onDragEnd={onDragEnd}
                            className={cn(
                              "flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg group cursor-move transition-all",
                              draggedIndex === index && "opacity-50 scale-[0.98] border-blue-500/50"
                            )}
                          >
                            <div className="text-zinc-600 group-hover:text-zinc-400">
                              <GripVertical size={14} />
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
            </TabsContent>

            <TabsContent value="relational" className="p-6 space-y-6 mt-0 max-h-[400px] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Linked Bios</h3>
                {/* Modified RelationalBioModal usage */}
                <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest border-zinc-800 bg-zinc-900/50" onClick={() => setIsRelationalBioModalOpen(true)}>
                  <Plus size={12} className="mr-1" /> <span>New Bio</span>
                </Button>
              </div>
              <div className="space-y-3">
                {releaseGroups.map(group => (
                  <Card key={group.id} className="bg-zinc-900/50 border-zinc-800 p-4 flex items-center justify-between group/item">
                    <div className="flex items-center gap-3">
                      <LinkIcon size={14} className="text-blue-500" />
                      <span className="text-xs font-bold text-white">{group.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <RelationalBioModal groupId={group.id} open={isRelationalBioModalOpen} onOpenChange={setIsRelationalBioModalOpen}>
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
                {releaseGroups.length === 0 && (
                  <p className="text-xs text-zinc-600 italic text-center py-8">No relational bios linked to show on this page.</p>
                )}
              </div>
            </TabsContent>

            <div className="p-6 border-t border-zinc-900">
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-bold uppercase tracking-wider">
                Save Changes
              </Button>
            </div>
          </form>
        </Tabs>
        {/* Render controlled RelationalBioModal as a sibling */}
        <RelationalBioModal initialEntity={{ type: 'release', id: release.id, label: release.title }} open={isRelationalBioModalOpen} onOpenChange={setIsRelationalBioModalOpen} />
      </DialogContent>
    </Dialog>
  );
};