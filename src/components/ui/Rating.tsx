"use client";

import React from 'react';
import { Star as StarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMusicStore } from '@/store/useMusicStore';
import { Track } from '@/types/music';

interface RatingProps {
  track: Track;
  showEditor?: boolean;
  size?: 'sm' | 'md' | 'lg';
  isCleanupContext?: boolean;
}

export const Rating = ({ track, showEditor = true, size = 'md', isCleanupContext = false }: RatingProps) => {
  const { updateTrack } = useMusicStore();
  const [hoverRating, setHoverRating] = React.useState(0);

  const currentRating = (track.comparisons >= 3 && track.rating !== undefined && track.rating !== null)
    ? track.rating
    : (isCleanupContext && track.initialRating !== undefined && track.initialRating !== null)
      ? track.initialRating
      : 0; // Default to 0 if no rating

  const displayRating = hoverRating > 0 ? hoverRating : currentRating;
  const isBalanced = (track.comparisons >= 3 && track.rating !== undefined && track.rating !== null);

  const handleStarClick = async (newRating: number) => {
    // Round to one decimal place to prevent floating point issues on display
    const roundedRating = Math.round(newRating * 10) / 10;
    await updateTrack(track.id, { initialRating: roundedRating });
  };

  const starSize = size === 'sm' ? 12 : size === 'md' ? 16 : 20;

  const stars = Array.from({ length: 10 }).map((_, i) => {
    const starValue = i + 1;
    const filled = displayRating >= starValue;
    const halfFilled = displayRating > i && displayRating < starValue;

    return (
      <StarIcon
        key={i}
        size={starSize}
        className={cn(
          "transition-colors duration-200",
          filled || halfFilled
            ? isBalanced
              ? "text-yellow-400" // Balanced rating color
              : "text-zinc-400"   // Unbalanced/Initial rating color
            : "text-zinc-700",
          showEditor ? "cursor-pointer" : "cursor-default" // Explicitly set cursor
        )}
        fill={filled || halfFilled ? "currentColor" : "none"}
        onMouseEnter={showEditor ? () => setHoverRating(starValue) : undefined}
        onMouseLeave={showEditor ? () => setHoverRating(0) : undefined}
        onClick={showEditor ? () => handleStarClick(starValue) : undefined}
      />
    );
  });

  return (
    <div className={cn("flex items-center gap-1", showEditor ? "cursor-pointer" : "cursor-default")} onMouseLeave={showEditor ? () => setHoverRating(0) : undefined}>
      {stars}
      {showEditor && displayRating > 0 && (
        <span className="text-[10px] text-zinc-500 ml-1 font-mono">{displayRating.toFixed(1)}</span>
      )}
    </div>
  );
};