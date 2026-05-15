import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMusicStore } from '@/store/useMusicStore';
import { Edit2, Music, Plus, Trash2, StickyNote, Heart, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { FileUpload } from '@/components/ui/FileUpload';
import { Track, Note } from '@/types/music';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { NotesSection } from '@/components/ui/NotesSection';
import { RelationalBioSection } from '@/components/ui/RelationalBioSection';

export const EditTrackModal = ({ track, children }: { track: Track, children?: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const { updateTrack, notes, deleteTrack } = useMusicStore();
  
  const trackNotes = notes.filter(n => n.entityType === 'track' && n.entityId === track.id);
  
  const [formData, setFormData] = useState({
    title: track.title,
    rating: track.rating?.toString() || '',
    genres: track.genres.join(', '),
    producers: track.producers.join(', '),
    writers: track.writers.join(', '),
    credits: track.credits.join(', '),
    bitrate: track.bitrate || '320kbps',
    audioUrl: track.localFilePath || '',
    spotifyUrl: track.spotifyUrl || '',
    geniusUrl: track.geniusUrl || '',
    soundcloudUrl: track.soundcloudUrl || '',
    youtubeMusicUrl: track.youtubeMusicUrl || '',
    bpm: track.bpm?.toString() || '',
    key: track.key || '',
    isFavorite: track.isFavorite
  });

  const cleanSpotifyUrl = (url: string) => {
    if (!url) return '';
    try {
      const u = new URL(url);
      u.search = '';
      return u.toString();
    } catch {
      return url;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return toast.error("Track title is required");

    await updateTrack(track.id, {
      title: formData.title,
      rating: formData.rating ? parseFloat(formData.rating) : undefined,
      genres: formData.genres.split(',').map(s => s.trim()).filter(Boolean),
      producers: formData.producers.split(',').map(s => s.trim()).filter(Boolean),
      writers: formData.writers.split(',').map(s => s.trim()).filter(Boolean),
      credits: formData.credits.split(',').map(s => s.trim()).filter(Boolean),
      bitrate: formData.bitrate,
      localFilePath: formData.audioUrl,
      spotifyUrl: cleanSpotifyUrl(formData.spotifyUrl),
      geniusUrl: formData.geniusUrl,
      soundcloudUrl: formData.soundcloudUrl,
      youtubeMusicUrl: formData.youtubeMusicUrl,
      bpm: formData.bpm ? parseInt(formData.bpm) : undefined,
      key: formData.key,
      isFavorite: formData.isFavorite
    });

    toast.success(`Updated ${formData.title}`);
    setOpen(false);
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this track?")) {
      await deleteTrack(track.id);
      toast.success("Track deleted");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="h-8 w-8 p-0 text-zinc-500 hover:text-white">
            <Edit2 size={14}/>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0">
        <Tabs defaultValue="metadata" className="w-full">
          <div className="px-6 pt-6 flex items-center justify-between border-b border-zinc-900 pb-4">
            <div className="flex items-center gap-3">
              <Music size={20} className="text-blue-500" />
              <h2 className="text-xl font-black uppercase tracking-tight">Edit Track</h2>
            </div>
            <TabsList className="bg-zinc-900 border-zinc-800">
              <TabsTrigger value="metadata" className="text-[10px] font-black uppercase tracking-widest">Metadata</TabsTrigger>
              <TabsTrigger value="credits" className="text-[10px] font-black uppercase tracking-widest">Credits</TabsTrigger>
              <TabsTrigger value="notes" className="text-[10px] font-black uppercase tracking-widest">Notes</TabsTrigger>
              <TabsTrigger value="relational" className="text-[10px] font-black uppercase tracking-widest">Relational</TabsTrigger>
            </TabsList>
          </div>

          <form onSubmit={handleSubmit}>
            <TabsContent value="metadata" className="p-6 space-y-6 mt-0">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Audio Source</Label>
                <FileUpload value={formData.audioUrl} onChange={(url) => setFormData({...formData, audioUrl: url})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Track Title</Label>
                  <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="bg-zinc-900 border-zinc-800" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Rating (0-10)</Label>
                  <Input type="number" step="0.1" value={formData.rating} onChange={(e) => setFormData({...formData, rating: e.target.value})} className="bg-zinc-900 border-zinc-800" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">BPM</Label>
                  <Input type="number" value={formData.bpm} onChange={(e) => setFormData({...formData, bpm: e.target.value})} className="bg-zinc-900 border-zinc-800" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Key</Label>
                  <Input value={formData.key} onChange={(e) => setFormData({...formData, key: e.target.value})} className="bg-zinc-900 border-zinc-800" placeholder="e.g. C# Minor" />
                </div>
                <div className="flex items-end pb-2">
                  <Button 
                    type="button"
                    variant="outline" 
                    className={cn(
                      "w-full border-zinc-800 gap-2 font-black uppercase text-[10px] tracking-widest",
                      formData.isFavorite ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-zinc-900"
                    )}
                    onClick={() => setFormData({...formData, isFavorite: !formData.isFavorite})}
                  >
                    <Heart size={14} fill={formData.isFavorite ? "currentColor" : "none"} />
                    {formData.isFavorite ? "Favorited" : "Favorite"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Spotify Link</Label>
                  <Input value={formData.spotifyUrl} onChange={(e) => setFormData({...formData, spotifyUrl: e.target.value})} className="bg-zinc-900 border-zinc-800" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Genius Link</Label>
                  <Input value={formData.geniusUrl} onChange={(e) => setFormData({...formData, geniusUrl: e.target.value})} className="bg-zinc-900 border-zinc-800" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="credits" className="p-6 space-y-6 mt-0">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Genres (comma separated)</Label>
                <Input value={formData.genres} onChange={(e) => setFormData({...formData, genres: e.target.value})} className="bg-zinc-900 border-zinc-800" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Producers (comma separated)</Label>
                <Input value={formData.producers} onChange={(e) => setFormData({...formData, producers: e.target.value})} className="bg-zinc-900 border-zinc-800" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Writers (comma separated)</Label>
                <Input value={formData.writers} onChange={(e) => setFormData({...formData, writers: e.target.value})} className="bg-zinc-900 border-zinc-800" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Additional Credits (comma separated)</Label>
                <Input value={formData.credits} onChange={(e) => setFormData({...formData, credits: e.target.value})} className="bg-zinc-900 border-zinc-800" />
              </div>
            </TabsContent>

            <TabsContent value="notes" className="p-6 space-y-6 mt-0 max-h-[400px] overflow-y-auto">
              <NotesSection entityType="track" entityId={track.id} />
            </TabsContent>

            <TabsContent value="relational" className="p-6 space-y-6 mt-0">
              <RelationalBioSection entityType="track" entityId={track.id} />
            </TabsContent>

            <div className="p-6 border-t border-zinc-900 flex items-center gap-4">
              <Button 
                type="button" 
                variant="destructive" 
                className="bg-red-600/10 text-red-500 border-red-500/20 hover:bg-red-600 hover:text-white font-black uppercase tracking-widest h-10 px-6"
                onClick={handleDelete}
              >
                <Trash2 size={16} className="mr-2" /> Delete Track
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 font-bold uppercase tracking-wider h-10">Save Changes</Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
