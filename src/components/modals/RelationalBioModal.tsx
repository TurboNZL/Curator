"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMusicStore } from '@/store/useMusicStore';
import { toast } from 'sonner';
import { SearchableSelect } from '../ui/SearchableSelect';
import { X, User, Disc, Music, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RelationalBioModalProps {
  children?: React.ReactNode;
  initialEntity?: { type: string, id: string, label: string };
  groupId?: string;
}

export const RelationalBioModal = ({ children, initialEntity, groupId }: RelationalBioModalProps) => {
  const { groups, artists, albums, tracks, addGroup, updateGroup } = useMusicStore();
  const [open, setOpen] = useState(false);

  const group = groupId ? groups.find(g => g.id === groupId) : null;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isEra: false,
    startDate: '',
    endDate: '',
    members: [] as { entityType: string, entityId: string, label: string, isVisible: boolean }[]
  });

  useEffect(() => {
    if (open) {
      if (group) {
        setFormData({
          name: group.name,
          description: group.description || '',
          isEra: group.isEra || false,
          startDate: group.startDate || '',
          endDate: group.endDate || '',
          members: (group.members || []).map(m => ({ ...m, isVisible: m.isVisible ?? true }))
        });
      } else {
        setFormData({
          name: '',
          description: '',
          isEra: false,
          startDate: '',
          endDate: '',
          members: initialEntity ? [{ ...initialEntity, isVisible: true }] : []
        });
      }
    }
  }, [open, group, initialEntity]);

  const entityOptions = [
    ...artists.map(a => ({ value: `artist:${a.id}`, label: `Artist: ${a.name}`, type: 'artist', name: a.name })),
    ...albums.map(a => ({ value: `album:${a.id}`, label: `Album: ${a.title}`, type: 'album', name: a.title })),
    ...tracks.map(t => ({ value: `track:${t.id}`, label: `Track: ${t.title}`, type: 'track', name: t.title })),
  ];

  const handleSave = async () => {
    if (!formData.name) return toast.error("Bio name is required");
    const payload = { ...formData, type: 'relationship' as const, isArtistOnly: false };
    if (groupId) await updateGroup(groupId, payload);
    else await addGroup(payload);
    toast.success(groupId ? "Bio updated" : "Bio created");
    setOpen(false);
  };

  const addMember = (val: string) => {
    const [type, id] = val.split(':');
    const entity = entityOptions.find(opt => opt.value === val);
    if (entity && !formData.members.some(m => m.entityId === id && m.entityType === type)) {
      setFormData({ ...formData, members: [...formData.members, { entityType: type, entityId: id, label: entity.name, isVisible: true }] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children || <Button variant="outline">Relational Bio</Button>}</DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-900 text-white max-w-md">
        <DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tighter">{groupId ? 'Edit Bio' : 'New Bio'}</DialogTitle></DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Bio Name</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-zinc-900 border-zinc-800" /></div>
          <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="bg-zinc-900 border-zinc-800 min-h-[100px]" /></div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Linked Entities</Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.members.map((m, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-bold text-zinc-300">
                  {m.entityType === 'artist' ? <User size={10} /> : m.entityType === 'album' ? <Disc size={10} /> : <Music size={10} />}
                  <span>{m.label}</span>
                  {m.entityType !== 'track' && (
                    <button onClick={() => setFormData({...formData, members: formData.members.map((x, idx) => idx === i ? {...x, isVisible: !x.isVisible} : x)})} className={cn("ml-1", m.isVisible ? "text-blue-500" : "text-zinc-600")}><Check size={10} /></button>
                  )}
                  <button onClick={() => setFormData({...formData, members: formData.members.filter((_, idx) => idx !== i)})} className="ml-1 text-zinc-600 hover:text-red-500"><X size={10} /></button>
                </div>
              ))}
            </div>
            <SearchableSelect options={entityOptions.filter(opt => !formData.members.some(m => `${m.entityType}:${m.entityId}` === opt.value))} value="" onValueChange={addMember} placeholder="Link entity..." />
          </div>
          <div className="flex items-center gap-2"><Switch checked={formData.isEra} onCheckedChange={(v) => setFormData({...formData, isEra: v})} /><Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Mark as Era</Label></div>
          {formData.isEra && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Start Date</Label><Input placeholder="YYYY or YYYY-MM" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} className="bg-zinc-900 border-zinc-800" /></div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">End Date</Label><Input placeholder="YYYY or YYYY-MM" value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} className="bg-zinc-900 border-zinc-800" /></div>
            </div>
          )}
          <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-500 font-black uppercase tracking-widest h-10">Save Bio</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};