"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMusicStore } from '@/store/useMusicStore';
import { Edit2, Music, Plus, Trash2, Link as LinkIcon, Edit3, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { FileUpload } from '@/components/ui/FileUpload';
import { Track } from '@/types/music';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Switch } from '@/components/ui/switch';

export const EditTrackModal = ({ track, children }: { track: Track, children?: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const { updateTrack, deleteTrack, albums, artists } = useMusicStore();
  
  const [formData, setFormData] = useState({
    title: track.title,
    artistId: track.artistId,
    artistIds: track.artistIds || [],
    albumId: track.albumIds[0] || '',
    initialRating: track.initialRating?.toString() || '',
    genres: track.genres || [],
    producers: track.producers || [],
    writers: track.writers || [],
    credits: track.credits || [],
    audioUrl: track.localFilePath || '',
    spotifyUrl: track.spotifyUrl || '',
    geniusUrl: track.geniusUrl || '',
    youtubeMusicUrl: track.youtubeMusicUrl || '',
    syncWithAlbum: track.syncWithAlbum ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, initialRating: parseFloat(formData.initialRating) || 0 };
    await updateTrack(track.id, payload);
    toast.success("Track updated");
    setOpen(false);
  };

  const artistOptions = artists.map(a => ({ value: a.id, label: a.name }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children || <Button variant="ghost" size="icon"><Edit2 size={14}/></Button>}</DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[600px] p-0 overflow-hidden">
        <Tabs defaultValue="metadata" className="w-full">
          <div className="px-6 pt-6 flex items-center justify-between border-b border-zinc-900 pb-4">
            <div className="flex items-center gap-3"><Music size={20} className="text-blue-500" /><h2 className="text-xl font-black uppercase tracking-tight">Edit Track</h2></div>
            <TabsList className="bg-zinc-900 border-zinc-800">
              <TabsTrigger value="metadata" className="text-[10px] font-black uppercase tracking-widest">Metadata</TabsTrigger>
              <TabsTrigger value="credits" className="text-[10px] font-black uppercase tracking-widest">Credits</TabsTrigger>
            </TabsList>
          </div>
          <form onSubmit={handleSubmit}>
            <TabsContent value="metadata" className="p-6 space-y-6">
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Audio Source</Label><FileUpload value={formData.audioUrl} onChange={(url) => setFormData({...formData, audioUrl: url})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Title</Label><Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="bg-zinc-900 border-zinc-800" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Rating</Label><Input type="number" step="0.1" value={formData.initialRating} onChange={(e) => setFormData({...formData, initialRating: e.target.value})} className="bg-zinc-900 border-zinc-800" /></div>
              </div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Spotify Link</Label><Input value={formData.spotifyUrl} onChange={(e) => setFormData({...formData, spotifyUrl: e.target.value})} className="bg-zinc-900 border-zinc-800" /></div>
            </TabsContent>
            <TabsContent value="credits" className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                <div className="space-y-0.5"><Label className="text-xs font-bold text-blue-400">Sync with Album</Label><p className="text-[10px] text-zinc-500">Inherit metadata from parent album</p></div>
                <Switch checked={formData.syncWithAlbum} onCheckedChange={(v) => setFormData({...formData, syncWithAlbum: v})} />
              </div>
              {!formData.syncWithAlbum && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Producers</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.producers.map(p => (
                        <div key={p} className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-bold text-zinc-400">
                          <span>{p}</span><button type="button" onClick={() => setFormData({...formData, producers: formData.producers.filter(x => x !== p)})}><X size={10} /></button>
                        </div>
                      ))}
                    </div>
                    <SearchableSelect options={artistOptions} value="" onValueChange={(v) => setFormData({...formData, producers: [...formData.producers, artists.find(a => a.id === v)?.name || v]})} placeholder="Add producer..." allowCustom />
                  </div>
                </div>
              )}
            </TabsContent>
            <div className="p-6 border-t border-zinc-900 flex gap-4">
              <Button type="button" variant="destructive" onClick={() => deleteTrack(track.id)} className="bg-red-600/10 text-red-500 border-red-500/20 h-10 px-6 font-black uppercase tracking-widest"><Trash2 size={16} /></Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 font-bold uppercase tracking-wider h-10">Save Changes</Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};