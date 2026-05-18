"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { X, User, Disc, Music, Layers, Link as LinkIcon, Check } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { cn } from '@/lib/utils';

interface RelationalBioModalProps {
  children?: React.ReactNode;
  initialEntity?: { type: string, id: string, label: string };
  groupId?: string; // If editing
}

export const RelationalBioModal = ({ children, initialEntity, groupId }: RelationalBioModalProps) => {
  const { groups, artists, albums, tracks, addGroup, updateGroup, addGroupMember, removeGroupMember, fetchData } = useMusicStore();
  const [open, setOpen] = useState(false);

  const group = groupId ? groups.find(g => g.id === groupId) : null;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'relationship' as 'collective' | 'thematic' | 'relationship' | 'era',
    members: [] as { entityType: string, entityId: string, label: string, showOnEntityPage?: boolean }[],
    // For era type, we would add startDate/endDate here
  });

  useEffect(() => {
    if (open) {
      if (group) {
        setFormData({
          name: group.name,
          description: group.description || '',
          type: group.type,
          members: group.members || []
        });
      } else {
        setFormData({
          name: '',
          description: '',
          type: 'relationship',
          members: initialEntity ? [{ entityType: initialEntity.type, entityId: initialEntity.id, label: initialEntity.label, showOnEntityPage: (initialEntity.type !== 'track' && initialEntity.type !== 'release') }] : []
        });
      }
    }
  }, [open, group, initialEntity]);

  const entityOptions = [
    ...artists.map(a => ({ value: `artist:${a.id}`, label: `Artist: ${a.name}`, type: 'artist', name: a.name })),
    ...albums.map(a => ({ value: `album:${a.id}`, label: `Album: ${a.title}`, type: 'album', name: a.title })),
    ...tracks.map(t => ({ value: `track:${t.id}`, label: `Track: ${t.title}`, type: 'track', name: t.title })),
    // Removed releases from dropdown options
  ];

  const handleSave = async () => {
    if (!formData.name) return toast.error("Bio name is required");
    if (formData.members.length === 0) return toast.error("At least one entity must be linked");

    // Filter out `label` before sending to API for members
    const membersWithoutLabel = formData.members.map(({ label, ...rest }) => rest);

    if (groupId) {
      await updateGroup(groupId, {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        members: membersWithoutLabel
      });
      toast.success("Relational bio updated");
    } else {
      await addGroup({
        name: formData.name,
        description: formData.description,
        type: formData.type,
        label: formData.name, // Using name as default label
        members: membersWithoutLabel
      });
      toast.success("Relational bio created");
    }
    setOpen(false);
    fetchData(); // Ensures local state is fully synchronized after add/update
  };

  const addMember = (val: string) => {
    const [type, id] = val.split(':');
    const entity = entityOptions.find(opt => opt.value === val);
    if (entity && !formData.members.some(m => m.entityId === id && m.entityType === type)) {
      const newMember = { 
        entityType: type, 
        entityId: id, 
        label: entity.name, 
        showOnEntityPage: (type !== 'track' && type !== 'release') // Tracks and Releases don't have dedicated pages for this
      };
      // Optimistically update local state first
      setFormData(prev => ({
        ...prev,
        members: [...prev.members, newMember]
      }));
      // If editing existing group, call API to add member
      if (groupId) {
        addGroupMember(groupId, type, id, newMember.showOnEntityPage);
      }
    }
  };

  const removeMember = (type: string, id: string) => {
    // Optimistically update local state first
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter(m => !(m.entityId === id && m.entityType === type))
    }));
    // If editing existing group, call API to remove member
    if (groupId) {
      removeGroupMember(groupId, type, id);
    }
  };

  const toggleShowOnEntityPage = (entityId: string, entityType: string) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.map(m => 
        m.entityId === entityId && m.entityType === entityType 
          ? { ...m, showOnEntityPage: !m.showOnEntityPage } 
          : m
      )
    }));
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
            <div className="flex flex-col gap-2 mb-3">
              {formData.members.map((m, i) => (
                <div key={`${m.entityType}-${m.entityId}`} className="flex items-center justify-between px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-[10px] font-bold text-zinc-300">
                  <div className="flex items-center gap-1.5">
                    {m.entityType === 'artist' && <User size={10} />}
                    {m.entityType === 'album' && <Disc size={10} />}
                    {m.entityType === 'track' && <Music size={10} />}
                    {/* Releases are not an option anymore */}
                    <span>{m.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.entityType !== 'track' && m.entityType !== 'release' && ( // No track page, so no checkbox needed
                      <div className="flex items-center gap-1">
                        <Checkbox 
                          id={`show-on-${m.entityType}-${m.entityId}`} 
                          checked={m.showOnEntityPage}
                          onCheckedChange={() => toggleShowOnEntityPage(m.entityId, m.entityType)}
                          className="h-3 w-3"
                        />
                        <Label 
                          htmlFor={`show-on-${m.entityType}-${m.entityId}`} 
                          className="text-[8px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer"
                        >
                          Show on Page
                        </Label>
                      </div>
                    )}
                    <button onClick={() => removeMember(m.entityType, m.entityId)} className="text-zinc-600 hover:text-red-500">
                      <X size={10} />
                    </button>
                  </div>
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

          <div className="flex items-center justify-end pt-2">
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-[10px] font-black uppercase tracking-widest h-10 px-8">
              {groupId ? 'Save Changes' : 'Create Bio'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};