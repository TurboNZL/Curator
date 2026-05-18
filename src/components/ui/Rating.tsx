import React, { useState } from 'react';
import { Star, Edit2, Check, X } from 'lucide-react';
import { useMusicStore } from '@/store/useMusicStore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Input } from './input';

interface RatingProps {
  trackId: string;
  balanced?: number;
  unbalanced?: number;
  comparisons?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Rating = ({ trackId, balanced, unbalanced, comparisons = 0, className, size = 'sm' }: RatingProps) => {
  const { activeProfile, updateSettings, updateTrack } = useMusicStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(unbalanced?.toString() || '');
  
  const showUnbalancedFirst = activeProfile.settings?.showUnbalancedFirst;

  const togglePreference = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateSettings({ showUnbalancedFirst: !showUnbalancedFirst });
  };

  const handleQuickEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const val = parseFloat(editValue);
    if (!isNaN(val)) {
      await updateTrack(trackId, { initialRating: val });
    }
    setIsEditing(false);
  };

  const iconSize = size === 'sm' ? 12 : size === 'md' ? 16 : 24;
  const primaryRating = showUnbalancedFirst ? unbalanced : balanced;
  const secondaryRating = showUnbalancedFirst ? balanced : unbalanced;
  
  const isPrimaryUnrated = primaryRating === undefined || primaryRating === null || primaryRating === 0;
  const isSecondaryUnrated = secondaryRating === undefined || secondaryRating === null || secondaryRating === 0;

  const primaryColor = showUnbalancedFirst ? 'text-yellow-500 fill-yellow-500' : 'text-blue-500 fill-blue-500';
  const secondaryColor = showUnbalancedFirst ? 'text-blue-500/50 fill-blue-500/50' : 'text-yellow-500/50 fill-yellow-500/50';

  if (isEditing) {
    return (
      <form onSubmit={saveEdit} className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <Input
          autoFocus
          className="h-6 w-12 text-[10px] p-1 bg-zinc-900 border-zinc-800"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
        />
        <button type="submit" className="text-emerald-500 hover:text-emerald-400"><Check size={12} /></button>
        <button type="button" onClick={() => setIsEditing(false)} className="text-red-500 hover:text-red-400"><X size={12} /></button>
      </form>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn("flex items-center gap-2 cursor-pointer group/rating", className)}
            onClick={togglePreference}
          >
            <div className="flex items-center gap-1">
              <Star size={iconSize} className={cn(primaryColor, isPrimaryUnrated && "opacity-20 fill-none")} />
              <span className={cn(
                "font-black tracking-tighter",
                size === 'sm' ? "text-xs" : size === 'md' ? "text-lg" : "text-3xl",
                isPrimaryUnrated && "text-zinc-700"
              )}>
                {!isPrimaryUnrated ? primaryRating!.toFixed(1) : '?'}
              </span>
            </div>
            <div className="flex items-center gap-0.5 opacity-40 group-hover/rating:opacity-100 transition-opacity">
              <Star size={iconSize * 0.7} className={cn(secondaryColor, isSecondaryUnrated && "opacity-20 fill-none")} />
              <span className={cn(
                "font-bold tracking-tighter",
                size === 'sm' ? "text-[10px]" : size === 'md' ? "text-xs" : "text-sm",
                isSecondaryUnrated && "text-zinc-800"
              )}>
                {!isSecondaryUnrated ? secondaryRating!.toFixed(1) : '?'}
              </span>
              <button
                onClick={handleQuickEdit}
                className="ml-1 p-0.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white opacity-0 group-hover/rating:opacity-100 transition-opacity"
              >
                <Edit2 size={10} />
              </button>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-zinc-900 border-zinc-800 text-[10px] font-bold uppercase tracking-widest">
          <p>{comparisons} Comparisons (Balance Factor)</p>
          <p className="text-zinc-500 mt-1">Click to toggle primary display</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
