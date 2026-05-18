"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMusicStore } from '@/store/useMusicStore';
import { toast } from 'sonner';
import { SearchableSelect } from '../ui/SearchableSelect';
import { X, User, Disc, Music, Layers, Link as LinkIcon } from 'lucide-react';

interface RelationalBioModalProps {
  children?: React.ReactNode;
  initialEntity?: { type: string, id: string, label: string };
  groupId?: string; // If editing
}

export const RelationalBioModal = ({ children, initialEntity, groupId }: RelationalBioModalProps) => {
  const { groups, artists, albums, tracks, releases, addGroup, updateGroup, addGroupMember, removeGroupMember } = useMusicStore();
  const [open, setOpen] = useState(false);

  const group = groupId ? groups.find(g => g.id === groupId) : null;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isArtistOnly: false,
    members: [] as { entityType: string, entityId: string, label: string }[]
  });

  useEffect(() => {
    if (open) {
      if (group) {
        setFormData({
          name: group.name,
          description: group.description || '',
          isArtistOnly: group.isArtistOnly,
          members: group.members || []
        });
      } else {
        setFormData({
          name: '',
          description: '',
          isArtistOnly: false,
          members: initialEntity ? [{ entityType: initialEntity.type, entityId: initialEntity.id, label: initialEntity.label }] : []
        });
      }
    }
  }, [open, group, initialEntity]);

  const entityOptions = [
    ...artists.map(a => ({ value: `artist:${a.id}`, label: `Artist: ${a.name}`, type: 'artist', name: a.name })),
    ...albums.map(a => ({ value: `album:${a.id}`, label: `Album: ${a.title}`, type: 'album', name: a.title })),
    ...tracks.map(t => ({ value: `track:${t.id}`, label: `Track: ${t.title}`, type: 'track', name: t.title })),
    ...releases.map(r => ({ value: `release:${r.id}`, label: `Release: ${r.title}`, type: 'release', name: r.title })),
  ];

  const handleSave = async () => {
    if (!formData.name) return toast.error("Bio name is required");
    if (formData.members.length === 0) return toast.error("At least one entity must be linked");

    if (groupId) {
      await updateGroup(groupId, {
        name: formData.name,
        description: formData.description,
        isArtistOnly: formData.isArtistOnly,
      });
      toast.success("Relational bio updated");
    } else {
      await addGroup({
        name: formData.name,
        description: formData.description,
        isArtistOnly: formData.isArtistOnly,
        type: 'relationship',
        label: formData.name,
        members: formData.members
      });
      toast.success("Relational bio created");
    }
    setOpen(false);
  };

  const addMember = (val: string) => {
    const [type, id] = val.split(':');
    const entity = entityOptions.find(opt => opt.value === val);
    if (entity && !formData.members.some(m => m.entityId === id && m.entityType === type)) {
      const newMember = { entityType: type, entityId: id, label: entity.name };
      if (groupId) {
        addGroupMember(groupId, type, id);
      }
      setFormData({
        ...formData,
        members: [...formData.members, newMember]
      });
    }
  };

  const removeMember = (type: string, id: string) => {
    if (groupId) {
      removeGroupMember(groupId, type, id);
    }
    setFormData({
      ...formData,
      members: formData.members.filter(m => !(m.entityId === id && m.entityType === type))
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button variant="outline">Relational Bio</Button>}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-900 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tighter">
            {groupId ? 'Edit Relational Bio' : 'New Relational Bio'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Bio Name</Label>
            <Input
              placeholder="e.g. Sample Source, Collective"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="bg-zinc-900 border-zinc-800 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Description</Label>
            <Textarea 
              placeholder="Describe the relationship..." 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="bg-zinc-900 border-zinc-800 text-sm min-h-[120px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Linked Entities</Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.members.map((m, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-[10px] font-bold text-zinc-300">
                  {m.entityType === 'artist' && <User size={10} />}
                  {m.entityType === 'album' && <Disc size={10} />}
                  {m.entityType === 'track' && <Music size={10} />}
                  {m.entityType === 'release' && <Layers size={10} />}
                  <span>{m.label}</span>
                  <button onClick={() => removeMember(m.entityType, m.entityId)} className="ml-1 text-zinc-600 hover:text-red-500">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
            <SearchableSelect 
              options={entityOptions.filter(opt => !formData.members.some(m => `${m.entityType}:${m.entityId}` === opt.value))}
              value=""
              onValueChange={addMember}
              placeholder="Link another entity..."
              className="h-9 text-xs"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Switch 
                id="artist-only-modal" 
                checked={formData.isArtistOnly} 
                onCheckedChange={(val) => setFormData({...formData, isArtistOnly: val})} 
              />
              <Label htmlFor="artist-only-modal" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer">
                Artist Only Mode
              </Label>
            </div>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-[10px] font-black uppercase tracking-widest h-10 px-8">
              {groupId ? 'Save Changes' : 'Create Bio'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
