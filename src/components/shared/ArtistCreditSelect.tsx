"use client";

import React, { useMemo } from 'react';
import { useMusicStore } from '@/store/useMusicStore';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';
import { Credit } from '../../server/types/music'; // Updated import path
import { cn } from '@/lib/utils';
import { MultiSelectSearch } from '../ui/MultiSelectSearch'; // Import MultiSelectSearch

interface ArtistCreditSelectProps {
  value: Credit[];
  onChange: (credits: Credit[]) => void;
  disabled?: boolean;
}

export const ArtistCreditSelect: React.FC<ArtistCreditSelectProps> = ({ value, onChange, disabled = false }) => {
  const { artists, roleCategories } = useMusicStore();

  const artistOptions = useMemo(() => artists.map(a => ({ value: a.id, label: a.name })), [artists]);
  const roleOptions = useMemo(() => roleCategories.map(rc => ({ value: rc.name, label: rc.name })), [roleCategories]);

  const handleAddCredit = () => {
    onChange([...value, { artistId: '', role: ['Lead artist'] }]); // Default to 'Lead artist' role (as array)
  };

  const handleUpdateCredit = (index: number, field: 'artistId' | 'role', newValue: string | string[]) => {
    const newCredits = [...value];
    if (field === 'artistId') {
      newCredits[index] = { ...newCredits[index], artistId: newValue as string }; // Ensure artistId is a string
    } else if (field === 'role') {
      newCredits[index] = { ...newCredits[index], role: Array.isArray(newValue) ? newValue : [newValue as string] }; // Ensure role is an array of strings
    }
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
            <MultiSelectSearch // Changed to MultiSelectSearch
              options={roleOptions}
              selected={credit.role.map(r => ({ value: r, label: r }))} // Map string[] to selected format
              onSelectedChange={(selectedItems) => handleUpdateCredit(index, 'role', selectedItems.map(item => item.value))} // Map back to string[]
              placeholder="Select role(s)..."
              disabled={disabled}
              className={cn("bg-zinc-900 border-zinc-800", disabled && "bg-zinc-900/50 cursor-not-allowed")}
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
        className="w-full border-zinc-800 bg-zinc-800 hover:bg-zinc-700 text-[10px] font-black uppercase h-9 tracking-widest text-white" // Styled button for dark theme
        onClick={handleAddCredit}
        disabled={disabled}
      >
        <Plus size={12} className="mr-1" /> Add Artist Credit
      </Button>
    </div>
  );
};