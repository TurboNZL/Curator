import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMusicStore } from '@/store/useMusicStore';
import { Edit2, Music, Plus, Trash2, Link as LinkIcon, Edit3, X } from 'lucide-react';
import { toast } from 'sonner';
import { FileUpload } from '@/components/ui/FileUpload';
import { Track } from '@/types/music';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { RelationalBioModal } from './RelationalBioModal';
import { Card } from '../ui/card';

export const EditTrackModal = ({ track, children }: { track: Track, children?: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const { updateTrack, deleteTrack, albums, artists, groups, deleteGroup, uploadFile } = useMusicStore();
  
  const trackGroups = groups.filter(g =>
    g.members?.some(m => m.entityId === track.id && m.entityType === 'track' && m.showOnEntityPage)
  );
  
  const [formData, setFormData] = useState({
    title: track.title,
    artistId: track.artistId,
    artistIds: track.artistIds || [],
    albumId: track.albumIds[0] || '',
    initialRating: track.initialRating?.toString() || '',
    genres: track.genres.join(', '),
    producers: track.producers.join(', '),
    writers: track.writers.join(', '),
    credits: track.credits.join(', '),
    bitrate: track.bitrate || '320kbps', // Still stored, but not editable directly
    audioUrl: track.localFilePath || '',
    spotifyUrl: track.spotifyUrl || '',
    geniusUrl: track.geniusUrl || '',
    youtubeMusicUrl: track.youtubeMusicUrl || '', // Removed soundcloudUrl
  });

  const albumOptions = albums.filter(a => a.artistId === formData.artistId).map(a => ({ value: a.id, label: a.title }));

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
      artistId: formData.artistId,
      artistIds: formData.artistIds,
      albumIds: formData.albumId ? [formData.albumId] : [],
      initialRating: formData.initialRating ? parseFloat(formData.initialRating) : undefined,
      genres: formData.genres.split(',').map(s => s.trim()).filter(Boolean),
      producers: formData.producers.split(',').map(s => s.trim()).filter(Boolean),
      writers: formData.writers.split(',').map(s => s.trim()).filter(Boolean),
      credits: formData.credits.split(',').map(s => s.trim()).filter(Boolean),
      bitrate: formData.bitrate,
      localFilePath: formData.audioUrl,
      spotifyUrl: cleanSpotifyUrl(formData.spotifyUrl),
      geniusUrl: formData.geniusUrl,
      youtubeMusicUrl: formData.youtubeMusicUrl,
    });

    toast.success(`Updated ${formData.title}`);
    setOpen(false);
  };

  const addArtist = (id: string) => {
    if (!formData.artistIds.includes(id)) {
      setFormData(prev => ({ ...prev, artistIds: [...prev.artistIds, id] }));
    }
  };

  const removeArtist = (id: string) => {
    setFormData(prev => ({ ...prev, artistIds: prev.artistIds.filter(aid => aid !== id) }));
  };

  const artistOptions = artists.map(a => ({ value: a.id, label: a.name }));

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this track?")) {
      await deleteTrack(track.id);
      toast.success("Track deleted");
      setOpen(false);
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const uploadPromises = Array.from(files).map(async file => {
      const url = await uploadFile(file, 'audio');
      const cleanName = file.name.replace(/_/g, ' ');
      return { url, name: cleanName };
    });

    try {
      toast.promise(Promise.all(uploadPromises), {
        loading: 'Uploading audio files...',
        success: (newFiles) => {
          return `Uploaded ${newFiles.length} files`;
        },
        error: 'Failed to upload some files'
      });
    } catch (err) {
      console.error(err);
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
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[700px] max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <Tabs defaultValue="metadata" className="w-full flex flex-col overflow-hidden">
          <div className="px-6 pt-6 flex items-center justify-between border-b border-zinc-900 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <Music size={20} className="text-blue-500" />
              <h2 className="text-xl font-black uppercase tracking-tight">Edit Track</h2>
            </div>
            <TabsList className="bg-zinc-900 border-zinc-800">
              <TabsTrigger value="metadata" className="text-[10px] font-black uppercase tracking-widest">Metadata</TabsTrigger>
              <TabsTrigger value="credits" className="text-[10px] font-black uppercase tracking-widest">Credits</TabsTrigger>
              <TabsTrigger value="relational" className="text-[10px] font-black uppercase tracking-widest">Relational Bios</TabsTrigger>
            </TabsList>
          </div>

          <form onSubmit={handleSubmit}>
            <TabsContent value="metadata" className="p-6 space-y-6 mt-0 max-h-[400px] overflow-y-auto">
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
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Album</Label>
                  <SearchableSelect
                    options={albums.filter(a => a.artistId === formData.artistId).map(a => ({ value: a.id, label: a.title }))}
                    value={formData.albumId}
                    onValueChange={(val) => setFormData({...formData, albumId: val})}
                    placeholder="Select album..."
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Primary Artist</Label>
                  <SearchableSelect 
                    options={artistOptions} 
                    value={formData.artistId} 
                    onValueChange={(val) => setFormData({...formData, artistId: val})}
                    placeholder="Search or type artist..."
                    allowCustom
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
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Initial Rating (0-10)</Label>
                  <Input type="number" step="0.1" value={formData.initialRating} onChange={(e) => setFormData({...formData, initialRating: e.target.value})} className="bg-zinc-900 border-zinc-800" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Bitrate</Label>
                  {/* Bitrate is now display-only */}
                  <Input value={formData.bitrate || 'Unknown'} disabled className="bg-zinc-900 border-zinc-800 text-zinc-400" />
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

            <TabsContent value="credits" className="p-6 space-y-6 mt-0 max-h-[400px] overflow-y-auto">
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

            <TabsContent value="relational" className="p-6 space-y-6 mt-0 max-h-[400px] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Linked Bios</h3>
                <RelationalBioModal initialEntity={{ type: 'track', id: track.id, label: track.title }}>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest border-zinc-800 bg-zinc-900/50">
                    <Plus size={12} className="mr-1" /> New Bio
                  </Button>
                </RelationalBioModal>
              </div>
              <div className="space-y-3">
                {trackGroups.map(group => (
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
                {trackGroups.length === 0 && (
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