import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMusicStore } from '@/store/useMusicStore';
import { Edit2, Music, Plus, Trash2, StickyNote, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { FileUpload } from '@/components/ui/FileUpload';
import { Track, Note } from '@/types/music';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export const EditTrackModal = ({ track, children }: { track: Track, children?: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const { updateTrack, notes, addNote, updateNote, deleteNote } = useMusicStore();
  
  const trackNotes = notes.filter(n => n.entityType === 'track' && n.entityId === track.id);
  
  const [formData, setFormData] = useState({
    title: track.title,
    rating: track.rating.toString(),
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

  const [newNote, setNewNote] = useState({ label: '', content: '' });

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
      rating: parseFloat(formData.rating),
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

  const handleAddNote = async () => {
    if (!newNote.content) return toast.error("Note content is required");
    await addNote({
      entityType: 'track',
      entityId: track.id,
      label: newNote.label,
      content: newNote.content,
      isLinked: false
    });
    setNewNote({ label: '', content: '' });
    toast.success("Note added");
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
              <TabsTrigger value="notes" className="text-[10px] font-black uppercase tracking-widest">Notes ({trackNotes.length})</TabsTrigger>
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

            <TabsContent value="notes" className="p-6 space-y-6 mt-0">
              <div className="space-y-4">
                {trackNotes.map(note => (
                  <div key={note.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2 group/note">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">{note.label || 'Note'}</span>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-0 group-hover/note:opacity-100 text-zinc-500 hover:text-red-500"
                        onClick={() => deleteNote(note.id)}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">{note.content}</p>
                  </div>
                ))}

                <div className="p-4 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl space-y-4">
                  <div className="flex items-center gap-2">
                    <StickyNote size={14} className="text-zinc-500" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Add New Note</h4>
                  </div>
                  <div className="space-y-2">
                    <Input 
                      placeholder="Label (e.g. Transition, Trivia)" 
                      value={newNote.label}
                      onChange={(e) => setNewNote({...newNote, label: e.target.value})}
                      className="bg-zinc-900 border-zinc-800 text-xs"
                    />
                    <Textarea 
                      placeholder="Write your note here..." 
                      value={newNote.content}
                      onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                      className="bg-zinc-900 border-zinc-800 text-sm min-h-[80px]"
                    />
                    <Button 
                      type="button"
                      onClick={handleAddNote}
                      className="w-full bg-zinc-800 hover:bg-zinc-700 text-[10px] font-black uppercase tracking-widest h-8"
                    >
                      Add Note
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <div className="p-6 border-t border-zinc-900">
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-bold uppercase tracking-wider">Save Changes</Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
