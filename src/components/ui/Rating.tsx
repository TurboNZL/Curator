import React from 'react';
import { Star } from 'lucide-react';
import { useMusicStore } from '@/store/useMusicStore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface RatingProps {
  balanced: number;
  unbalanced: number;
  comparisons?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Rating = ({ balanced, unbalanced, comparisons = 0, className, size = 'sm' }: RatingProps) => {
  const { activeProfile, updateSettings } = useMusicStore();
  const showUnbalancedFirst = activeProfile.settings?.showUnbalancedFirst;

  const togglePreference = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateSettings({ showUnbalancedFirst: !showUnbalancedFirst });
  };

  const iconSize = size === 'sm' ? 12 : size === 'md' ? 16 : 24;
  const primaryRating = showUnbalancedFirst ? unbalanced : balanced;
  const secondaryRating = showUnbalancedFirst ? balanced : unbalanced;
  const primaryColor = showUnbalancedFirst ? 'text-yellow-500 fill-yellow-500' : 'text-blue-500 fill-blue-500';
  const secondaryColor = showUnbalancedFirst ? 'text-blue-500/50 fill-blue-500/50' : 'text-yellow-500/50 fill-yellow-500/50';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn("flex items-center gap-2 cursor-pointer group/rating", className)}
            onClick={togglePreference}
          >
            <div className="flex items-center gap-1">
              <Star size={iconSize} className={primaryColor} />
              <span className={cn(
                "font-black tracking-tighter",
                size === 'sm' ? "text-xs" : size === 'md' ? "text-lg" : "text-3xl"
              )}>
                {primaryRating.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center gap-0.5 opacity-40 group-hover/rating:opacity-100 transition-opacity">
              <Star size={iconSize * 0.7} className={secondaryColor} />
              <span className={cn(
                "font-bold tracking-tighter",
                size === 'sm' ? "text-[10px]" : size === 'md' ? "text-xs" : "text-sm"
              )}>
                {secondaryRating.toFixed(1)}
              </span>
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
