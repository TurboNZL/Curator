"use client";

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMusicStore } from '@/store/useMusicStore';
import { Edit2, Layers, Check, FileAudio, Plus, Trash2, Link as LinkIcon, Edit3, X, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Album } from '@/types/music';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { RelationalBioModal } from './RelationalBioModal';
import { Card } from '../ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export const EditAlbumModal = ({ album, children }: { album: Album, children?: React.ReactElement }) => {
  const [open, setOpen] = useState(false);
  const { artists, updateAlbum, deleteAlbum, releases, uploadFile, groups, deleteGroup } = useMusicStore();
  const albumReleases = releases.filter(r => r.albumId === album.id);
  
  const albumGroups = groups.filter(g =>
    g.members?.some(m => m.entityId === album.id && m.entityType === 'album' && m.showOnEntityPage)
  );

  const availableCovers = Array.from(new Set([
    ...album.covers,
    ...albumReleases.map(r => r.coverImage).filter(Boolean) as string[]
  ]));

  const [formData, setFormData] = useState({
    title: album.title,
    artistId: album.artistId,
    artistIds: album.artistIds || [],
    cover: album.covers[0] || '',
    pendingFiles: album.pendingFiles || [],
    releaseDate: albumReleases.length > 0 ? albumReleases.sort((a,b) => new Date(b.releaseDate || '').getTime() - new Date(a.releaseDate || '').getTime())[0].releaseDate : '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return toast.error("Album title is required");

    await updateAlbum(album.id, {
      title: formData.title,
      artistId: formData.artistId,
      artistIds: formData.artistIds,
      covers: formData.cover ? [formData.cover] : [],
      pendingFiles: formData.pendingFiles
    });

    toast.success(`Updated ${formData.title}`);
    setOpen(false);
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this album? This will remove all associated data.")) {
      await deleteAlbum(album.id);
      toast.success("Album deleted");
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
          setFormData(prev => ({ ...prev, pendingFiles: [...prev.pendingFiles, ...newFiles] }));
          return `Uploaded ${newFiles.length} files`;
        },
        error: 'Failed to upload some files'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const removePendingFile = (url: string) => {
    setFormData(prev => ({ ...prev, pendingFiles: prev.pendingFiles.filter(f => f.url !== url) }));
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

  const handleInheritReleaseDate = (releaseDate: string) => {
    setFormData(prev => ({ ...prev, releaseDate }));
    toast.info(`Album release date inherited from ${releaseDate}`);
  };

  const sortedReleases = useMemo(() => {
    return [...albumReleases].sort((a, b) => new Date(b.releaseDate || '').getTime() - new Date(a.releaseDate || '').getTime());
  }, [albumReleases]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ? children : (
          <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-full border-zinc-800 bg-zinc-900/50">
            <Edit2 size={14}/>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[700px] p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <Tabs defaultValue="metadata" className="w-full flex flex-col overflow-hidden">
          <div className="px-6 pt-6 flex items-center justify-between border-b border-zinc-900 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <Layers size={20} className="text-blue-500" />
              <h2 className="text-xl font-black uppercase tracking-tight">Edit Album</h2>
            </div>
            <TabsList className="bg-zinc-900 border-zinc-800">
              <TabsTrigger value="metadata" className="text-[10px] font-black uppercase tracking-widest">Metadata</TabsTrigger>
              <TabsTrigger value="files" className="text-[10px] font-black uppercase tracking-widest">Files ({formData.pendingFiles.length})</TabsTrigger>
              <TabsTrigger value="relational" className="text-[10px] font-black uppercase tracking-widest">Relational Bios</TabsTrigger>
            </TabsList>
          </div>

          <form onSubmit={handleSubmit}>
            <TabsContent value="metadata" className="p-6 space-y-6 mt-0 max-h-[400px] overflow-y-auto">
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

                <div className="space-y-2">
                  <Label htmlFor="album-release-date" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Album Release Date</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      id="album-release-date" 
                      type="date"
                      value={formData.releaseDate}
                      onChange={(e) => setFormData({...formData, releaseDate: e.target.value})}
                      className="bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500 flex-1"
                    />
                    {sortedReleases.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" className="h-9 w-9 border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white">
                            <Calendar size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-white">
                          {sortedReleases.map(rel => rel.releaseDate && (
                            <DropdownMenuItem key={rel.id} onClick={() => handleInheritReleaseDate(rel.releaseDate!)}>
                              Inherit from "{rel.title}" ({rel.releaseDate})
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="files" className="p-6 space-y-6 mt-0 max-h-[400px] overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Unassigned Audio Files</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="h-8 border-zinc-800 bg-zinc-900/50 text-[10px] font-black uppercase tracking-widest gap-2"
                    onClick={() => document.getElementById('bulk-audio')?.click()}
                  >
                    <Plus size={14} /> Upload Folder/Files
                  </Button>
                  <input 
                    id="bulk-audio" 
                    type="file" 
                    multiple 
                    accept="audio/*" 
                    className="hidden" 
                    onChange={handleBulkUpload}
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  {formData.pendingFiles.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg group">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileAudio size={16} className="text-blue-500" />
                        <span className="text-xs font-mono text-zinc-400 truncate">{file.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removePendingFile(file.url)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                  {formData.pendingFiles.length === 0 && (
                    <div className="py-12 text-center border-2 border-dashed border-zinc-900 rounded-xl">
                      <p className="text-[10px] text-zinc-600 uppercase font-bold">No unassigned files. Upload audio to start indexing.</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="relational" className="p-6 space-y-6 mt-0 max-h-[400px] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Linked Bios</h3>
                <RelationalBioModal initialEntity={{ type: 'album', id: album.id, label: album.title }}>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest border-zinc-800 bg-zinc-900/50">
                    <Plus size={12} className="mr-1" /> New Bio
                  </Button>
                </RelationalBioModal>
              </div>
              <div className="space-y-3">
                {albumGroups.map(group => (
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
                {albumGroups.length === 0 && (
                  <p className="text-xs text-zinc-600 italic text-center py-8">No relational bios linked to show on this page.</p>
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
                <Trash2 size={16} className="mr-2" /> Delete Album
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