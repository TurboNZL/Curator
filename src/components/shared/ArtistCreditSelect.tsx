import React from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';
import { Credit } from '@/types/music';
import { cn } from '@/lib/utils'; // Import cn for conditional classnames

interface ArtistCreditSelectProps {
  value: Credit[];
  onChange: (credits: Credit[]) => void;
  disabled?: boolean;
}

export const ArtistCreditSelect: React.FC<ArtistCreditSelectProps> = ({ value, onChange, disabled = false }) => {
  const { artists, roleCategories } = useMusicStore();

  const artistOptions = artists.map(a => ({ value: a.id, label: a.name }));
  const roleOptions = roleCategories.map(rc => ({ value: rc.name, label: rc.name }));

  const handleAddCredit = () => {
    onChange([...value, { artistId: '', role: 'Lead artist' }]);
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
              disabled={disabled}
              className={cn("bg-zinc-900 border-zinc-800", disabled && "bg-zinc-900/50 cursor-not-allowed")}
              contentClassName="bg-zinc-950 border-zinc-800"
              itemClassName="text-white hover:bg-zinc-800"
            />
          </div>
          <div className="w-32">
            <SearchableSelect
              options={roleOptions}
              value={credit.role}
              onValueChange={(val) => handleUpdateCredit(index, 'role', val)}
              placeholder="Select role..."
              allowCustom
              disabled={disabled}
              className={cn("bg-zinc-900 border-zinc-800", disabled && "bg-zinc-900/50 cursor-not-allowed")}
              contentClassName="bg-zinc-950 border-zinc-800"
              itemClassName="text-white hover:bg-zinc-800"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-500 hover:text-red-500"
            onClick={() => handleRemoveCredit(index)}
            disabled={disabled}
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
        disabled={disabled}
      >
        <Plus size={12} className="mr-1" /> Add Artist Credit
      </Button>
    </div>
  );
};