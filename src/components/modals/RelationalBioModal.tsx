"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { GroupMember, Artist }  from '@/../server/types/music'; // Corrected import path

interface RelationalBioModalProps {
  initialEntity?: { type: string, id: string, label: string };
  groupId?: string; // If editing
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewArtist?: (artist: Omit<Artist, 'id' | 'eras'>) => Promise<Artist>; // New prop for creating artists
}

export const RelationalBioModal = ({ initialEntity, groupId, open, onOpenChange, onNewArtist }: RelationalBioModalProps) => {
  const { groups, artists, albums, tracks, addGroup, updateGroup, addGroupMember, removeGroupMember, fetchData, addArtist } = useMusicStore();
  
  const group = groupId ? groups.find(g => g.id === groupId) : null;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'relationship' as 'collective' | 'thematic' | 'relationship' | 'era',
    members: [] as GroupMember[], // Use GroupMember type
    // For era type, we would add startDate/endDate here
  });

  useEffect(() => {
    if (open) { // Only run when modal opens or initialData changes
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
          members: initialEntity ? [{ entityType: initialEntity.type as GroupMember['entityType'], entityId: initialEntity.id, label: initialEntity.label, showOnEntityPage: (initialEntity.type !== 'track' && initialEntity.type !== 'release') }] : []
        });
      }
    }
  }, [open, group, initialEntity]);

  const entityOptions = useMemo(() => ([
    ...artists.map(a => ({ value: `artist:${a.id}`, label: `Artist: ${a.name}`, type: 'artist' as const, name: a.name, id: a.id })),
    ...albums.map(a => ({ value: `album:${a.id}`, label: `Album: ${a.title}`, type: 'album' as const, name: a.title, id: a.id })),
    ...tracks.map(t => ({ value: `track:${t.id}`, label: `Track: ${t.title}`, type: 'track' as const, name: t.title, id: t.id })),
    // Removed releases from dropdown options
  ]), [artists, albums, tracks]);

  const handleSave = async () => {
    if (!formData.name) return toast.error("Bio name is required");
    if (formData.members.length === 0) return toast.error("At least one entity must be linked");

    if (groupId) {
      await updateGroup(groupId, {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        isArtistOnly: false, // Default value for isArtistOnly
        members: formData.members,
      });
      toast.success("Relational bio updated");
    } else {
      await addGroup({
        name: formData.name,
        description: formData.description,
        type: formData.type,
        label: formData.name, // Using name as default label
        isArtistOnly: false, // Default value for isArtistOnly
        members: formData.members,
      });
      toast.success("Relational bio created");
    }
    onOpenChange(false); // Close modal
    fetchData(); // Ensures local state is fully synchronized after add/update
  };

  const addMember = async (val: string) => {
    let entityOption = entityOptions.find(opt => opt.value === val);

    // If it's a new artist name entered directly
    if (!entityOption && val.startsWith('artist:') && onNewArtist) {
      const artistName = val.substring('artist:'.length);
      try {
        const newArtist = await onNewArtist({ name: artistName });
        entityOption = { value: `artist:${newArtist.id}`, label: `Artist: ${newArtist.name}`, type: 'artist', name: newArtist.name, id: newArtist.id };
        toast.success(`Artist "${newArtist.name}" created and linked.`);
      } catch (error) {
        toast.error(`Failed to create artist "${artistName}".`);
        return;
      }
    }

    if (entityOption && !formData.members.some(m => m.entityId === entityOption.id && m.entityType === entityOption.type)) {
      const newMember: GroupMember = { // Explicitly type newMember as GroupMember
        entityType: entityOption.type, 
        entityId: entityOption.id, 
        label: entityOption.name, 
        showOnEntityPage: (entityOption.type !== 'track') 
      };
      // Optimistically update local state first
      setFormData(prev => ({
        ...prev,
        members: [...prev.members, newMember]
      }));
      // If editing existing group, call API to add member
      if (groupId) {
        addGroupMember(groupId, entityOption.type, entityOption.id, newMember.showOnEntityPage);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      
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
                    <span>{m.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.entityType !== 'track' && m.entityType !== 'release' && ( 
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
              allowCustom={!!onNewArtist} // Allow custom input if onNewArtist is provided
              onNewItem={(item) => addMember(`artist:${item}`)} // Handle new artist creation
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