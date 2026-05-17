import React, { useState } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Link as LinkIcon, User, Disc, Music, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { SearchableSelect } from './SearchableSelect';
import { ScrollArea } from './scroll-area';
import { cn } from '@/lib/utils';

interface RelationalBioSectionProps {
  entityType: 'artist' | 'album' | 'track' | 'release';
  entityId: string;
}

export const RelationalBioSection = ({ entityType, entityId }: RelationalBioSectionProps) => {
  const { groups, artists, albums, tracks, releases, addGroup, updateGroup, deleteGroup, addGroupMember, removeGroupMember } = useMusicStore();
  
  // Find groups where this entity is a member
  // Note: We need group members in the store. Let's assume groups in store include members for now or we fetch them.
  // Actually, let's just show all groups and allow linking.
  
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    isArtistOnly: false,
    type: 'relationship' as const
  });

  const handleCreateGroup = async () => {
    if (!newGroup.name) return toast.error("Bio name is required");
    await addGroup({
      ...newGroup,
      label: newGroup.name, // Keep label in sync for now or just use name
      members: [{ entityType, entityId }]
    });
    setNewGroup({ name: '', description: '', isArtistOnly: false, type: 'relationship' });
    toast.success("Relational bio created");
  };

  const entityOptions = [
    ...artists.map(a => ({ value: `artist:${a.id}`, label: `Artist: ${a.name}`, type: 'artist' })),
    ...albums.map(a => ({ value: `album:${a.id}`, label: `Album: ${a.title}`, type: 'album' })),
    ...tracks.map(t => ({ value: `track:${t.id}`, label: `Track: ${t.title}`, type: 'track' })),
    ...releases.map(r => ({ value: `release:${r.id}`, label: `Release: ${r.title}`, type: 'release' })),
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {groups.filter(g => g.members?.some(m => m.entityId === entityId && m.entityType === entityType)).map(group => (
          <div key={group.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4 group/bio">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LinkIcon size={14} className="text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">{group.name}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-red-500 opacity-0 group-hover/bio:opacity-100 transition-opacity" onClick={() => deleteGroup(group.id)}>
                <Trash2 size={12} />
              </Button>
            </div>
            
            <p className="text-xs text-zinc-400 leading-relaxed">{group.description}</p>
            
            <div className="flex flex-wrap gap-2">
              {group.members?.map((member, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded-md text-[10px] font-bold text-zinc-300">
                  {member.entityType === 'artist' && <User size={10} />}
                  {member.entityType === 'album' && <Disc size={10} />}
                  {member.entityType === 'track' && <Music size={10} />}
                  {member.entityType === 'release' && <Layers size={10} />}
                  <span>{member.label}</span>
                  <button onClick={() => removeGroupMember(group.id, member.entityType, member.entityId)} className="ml-1 text-zinc-600 hover:text-red-500">
                    <Plus size={10} className="rotate-45" />
                  </button>
                </div>
              ))}
              <div className="w-32">
                <SearchableSelect
                  options={entityOptions.filter(opt => !group.members?.some(m => `${m.entityType}:${m.entityId}` === opt.value))}
                  value=""
                  onValueChange={(val) => {
                    const [type, id] = val.split(':');
                    addGroupMember(group.id, type as any, id);
                  }}
                  placeholder="Link entity..."
                  className="h-6 text-[8px]"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl space-y-4">
        <div className="flex items-center gap-2">
          <Plus size={14} className="text-zinc-500" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Create Relational Bio</h4>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Bio Name</Label>
            <Input
              placeholder="e.g. Sample Source, Collective"
              value={newGroup.name}
              onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
              className="bg-zinc-900 border-zinc-800 text-xs"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Description</Label>
          <Textarea 
            placeholder="Describe the relationship..." 
            value={newGroup.description}
            onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
            className="bg-zinc-900 border-zinc-800 text-sm min-h-[80px]"
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch 
              id="artist-only" 
              checked={newGroup.isArtistOnly} 
              onCheckedChange={(val) => setNewGroup({...newGroup, isArtistOnly: val})} 
            />
            <Label htmlFor="artist-only" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer">
              Artist Only Mode (Shows on Artist Page)
            </Label>
          </div>
          <Button onClick={handleCreateGroup} className="bg-blue-600 hover:bg-blue-500 text-[10px] font-black uppercase tracking-widest h-8 px-6">
            Create Bio
          </Button>
        </div>
      </div>
    </div>
  );
};
