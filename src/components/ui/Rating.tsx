"use client";

import React from 'react';
import { Star } from 'lucide-react';
import { useMusicStore } from '@/store/useMusicStore';
import { cn } from '@/lib/utils';
import { Track } from '@/types/music';

interface RatingProps {
  track: Track;
  showEditor?: boolean;
  size?: 'sm' | 'md' | 'lg';
  isCleanupContext?: boolean; // New prop to indicate cleanup context
}

export const Rating = ({ track, showEditor = false, size = 'md', isCleanupContext = false }: RatingProps) => {
  const { updateTrack, vote, getRankedTenStarTracks } = useMusicStore();

  const getEffectiveRating = (t: Track) => {
    if (t.comparisons >= 3 && t.rating !== undefined && t.rating !== null && t.rating > 0.001) {
      return t.rating;
    }
    if (t.initialRating !== undefined && t.initialRating !== null && t.initialRating > 0.001) {
      return t.initialRating;
    }
    return 0; // Treat as 0 if truly unrated or 0.0
  };

  const effectiveRating = getEffectiveRating(track);

  const isTenStar = effectiveRating >= 9.9999 && track.comparisons > 0;
  const isUnratedOrZero = effectiveRating < 0.001;

  const displayValue = React.useMemo(() => {
    if (isUnratedOrZero && track.comparisons < 3) {
      return '?'; // Show '?' for truly unrated tracks with few comparisons
    }
    if (isTenStar) {
      const rankedTenStarTracks = getRankedTenStarTracks();
      const rank = rankedTenStarTracks.findIndex(t => t.id === track.id) + 1;
      return rank > 0 ? `#${rank}` : '10.0'; // Should always find a rank if it's 10-star
    }
    return effectiveRating.toFixed(1);
  }, [track, effectiveRating, isUnratedOrZero, isTenStar, getRankedTenStarTracks]);

  const textColorClass = React.useMemo(() => {
    if (isUnratedOrZero) return 'text-zinc-500'; // Grey for 0.0
    if (isTenStar) return 'text-blue-400'; // Blue for 10/10 ranked
    if (effectiveRating >= 7) return 'text-emerald-400'; // Green for 7-9.9
    if (effectiveRating >= 4) return 'text-yellow-400'; // Yellow for 4-6.9
    return 'text-red-400'; // Red for 0.1-3.9
  }, [effectiveRating, isUnratedOrZero, isTenStar]);

  const buttonClass = cn(
    "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold transition-colors",
    "bg-zinc-900 border border-zinc-800",
    textColorClass,
    size === 'sm' && "h-6 px-2 text-[10px]",
    size === 'md' && "h-7 px-2.5 text-xs",
    size === 'lg' && "h-8 px-3 text-sm",
    (isCleanupContext && !showEditor) && "pointer-events-none" // Disable interactions in cleanup context if not an editor
  );

  const starSize = size === 'sm' ? 10 : size === 'md' ? 12 : 14;
  const comparisonSize = size === 'sm' ? 'text-[8px]' : 'text-[10px]';

  return (
    <div className="flex items-center gap-1">
      <button className={buttonClass}>
        <Star size={starSize} fill="currentColor" className={cn(textColorClass, "text-opacity-50")} />
        <span>{displayValue}</span>
        {track.comparisons > 0 && (
          <span className={cn("ml-1 text-zinc-600 font-mono", comparisonSize)}>{track.comparisons}</span>
        )}
      </button>
      {/* Removed +1/-1 buttons, as the prompt specified not to change them visually but remove the interaction */}
    </div>
  );
};