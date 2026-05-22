import React from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';
import { Credit } from '@/types/music';

interface ArtistCreditSelectProps {
  value: Credit[];
  onChange: (credits: Credit[]) => void;
}

const roles = [
  { value: 'Primary artist', label: 'Primary artist' },
  { value: 'Featured artist', label: 'Featured artist' },
  { value: 'Producer', label: 'Producer' },
  { value: 'Writer', label: 'Writer' },
  { value: 'Composer', label: 'Composer' },
  { value: 'Engineer', label: 'Engineer' },
  { value: 'Mixer', label: 'Mixer' },
  { value: 'Masterer', label: 'Masterer' },
  { value: 'Remixer', label: 'Remixer' },
  { value: 'Vocals', label: 'Vocals' },
  { value: 'Guitar', label: 'Guitar' },
  { value: 'Bass', label: 'Bass' },
  { value: 'Drums', label: 'Drums' },
  { value: 'Keyboards', label: 'Keyboards' },
  { value: 'Strings', label: 'Strings' },
  { value: 'Percussion', label: 'Percussion' },
  { value: 'Programmer', label: 'Programmer' },
  { value: 'Arranger', label: 'Arranger' },
  { value: 'Conductor', label: 'Conductor' },
  { value: 'Executive Producer', label: 'Executive Producer' },
  { value: 'Art Director', label: 'Art Director' },
  { value: 'Photographer', label: 'Photographer' },
  { value: 'Designer', label: 'Designer' },
];

export const ArtistCreditSelect: React.FC<ArtistCreditSelectProps> = ({ value, onChange }) => {
  const { artists } = useMusicStore();

  const artistOptions = artists.map(a => ({ value: a.id, label: a.name }));
  const roleOptions = roles;

  const handleAddCredit = () => {
    onChange([...value, { artistId: '', role: 'Primary artist' }]);
  };

  const handleUpdateCredit = (index: number, field: 'artistId' | 'role', newValue: string) => {
    const newCredits = [...value];
    newCredits[index] = { ...newCredits[index], [field]: newValue };
    onChange(newCredits);
  };

  const handleRemoveCredit = (index: number) => {
    const newCredits = value.filter((_, i) => i !== index);
    onChange(newCredits);
  };

  return (
    <div className="space-y-4">
      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Artist Credits</Label>
      {value.map((credit, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="flex-1">
            <SearchableSelect
              options={artistOptions}
              value={credit.artistId}
              onValueChange={(val) => handleUpdateCredit(index, 'artistId', val)}
              placeholder="Select artist..."
              allowCustom
            />
          </div>
          <div className="w-32">
            <SearchableSelect
              options={roleOptions}
              value={credit.role}
              onValueChange={(val) => handleUpdateCredit(index, 'role', val)}
              placeholder="Select role..."
              allowCustom
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-500 hover:text-red-500"
            onClick={() => handleRemoveCredit(index)}
          >
            <X size={14} />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="w-full border-zinc-800 text-[10px] font-black uppercase h-9 tracking-widest hover:bg-zinc-800"
        onClick={handleAddCredit}
      >
        <Plus size={12} className="mr-1" /> Add Artist Credit
      </Button>
    </div>
  );
};
