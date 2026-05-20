"use client";

import React, { useState } from 'react';
import { Star, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMusicStore } from '@/store/useMusicStore';
import { StatsForNerdsModal } from '../modals/StatsForNerdsModal';

interface RatingProps {
  trackId: string;
  size?: 'sm' | 'md' | 'lg';
  showEditor?: boolean; // New prop to control showing the editor button
  isCleanupContext?: boolean; // New prop for Cleanup page specific display
}

export const Rating: React.FC<RatingProps> = ({ trackId, size = 'md', showEditor = true, isCleanupContext = false }) => {
  const { tracks } = useMusicStore();
  const track = tracks.find(t => t.id === trackId);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  if (!track) return null;

  const isUnratedWithLowComparisons = (track.initialRating === undefined || track.initialRating === null) && track.comparisons < 3;
  const isUnratedByDefinition = (track.initialRating === undefined || track.initialRating === null);

  let displayRating: string;
  let ratingValue: number | undefined;
  let isNewTrack = false;

  if (isCleanupContext && isUnratedByDefinition) {
    displayRating = "NEW";
    isNewTrack = true;
  } else if (track.rating !== undefined && track.rating !== null && track.comparisons >= 3) {
    // Use balanced rating if 3+ comparisons
    ratingValue = track.rating;
    if (ratingValue >= 9.95 && ratingValue < 10) {
      displayRating = '9.9'; // Round down 9.9x to 9.9
    } else if (ratingValue === 10) {
      // For a 10-star rating, display global rank if available.
      // Assuming a global ranking mechanism or a specific display for 10-star items.
      // For now, if rating is exactly 10, display "10.0".
      displayRating = '10.0';
    } else {
      displayRating = ratingValue.toFixed(1);
    }
  } else if (track.initialRating !== undefined && track.initialRating !== null) {
    // Use initial rating if available and less than 3 comparisons
    ratingValue = track.initialRating;
    if (ratingValue >= 9.95 && ratingValue < 10) {
      displayRating = '9.9';
    } else if (ratingValue === 10) {
      displayRating = '10.0';
    } else {
      displayRating = ratingValue.toFixed(1);
    }
  } else {
    // If no initial rating and less than 3 comparisons, it's truly unrated
    displayRating = "?";
  }

  const starSize = size === 'sm' ? 10 : size === 'md' ? 14 : 18;
  const textSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base';
  const padding = size === 'sm' ? 'px-1 py-0.5' : size === 'md' ? 'px-2 py-1' : 'px-3 py-1.5';

  return (
    <div className={cn(
      "flex items-center gap-1.5 font-bold tracking-tight",
      textSize,
      padding,
      "rounded-full border",
      isNewTrack ? "bg-blue-600/10 text-blue-400 border-blue-500/20" :
      displayRating === '?' ? "bg-zinc-800 text-zinc-500 border-zinc-700" :
      (ratingValue && ratingValue >= 8) ? "bg-emerald-600/10 text-emerald-400 border-emerald-500/20" :
      (ratingValue && ratingValue >= 6) ? "bg-yellow-600/10 text-yellow-400 border-yellow-500/20" :
      "bg-red-600/10 text-red-400 border-red-500/20"
    )}>
      {isNewTrack ? (
        <Star size={starSize} fill="currentColor" className="text-blue-500" />
      ) : (
        <Star size={starSize} fill="currentColor" />
      )}
      <span>{displayRating}</span>
      {track.comparisons > 0 && <span className="text-[8px] opacity-50">({track.comparisons})</span>}

      {showEditor && (
        <StatsForNerdsModal track={track} open={isStatsModalOpen} onOpenChange={setIsStatsModalOpen}>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsStatsModalOpen(true); }}
            className="ml-1 text-zinc-500 hover:text-white transition-colors h-4 w-4 flex items-center justify-center rounded-full"
            aria-label="View track stats"
          >
            <CircleDot size={12} />
          </button>
        </StatsForNerdsModal>
      )}
    </div>
  );
};