"use client";

import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMusicStore } from '@/store/useMusicStore';

interface RatingProps {
  trackId: string;
  size?: 'sm' | 'md' | 'lg';
  showEditor?: boolean;
  isCleanupContext?: boolean; // New prop to control editable rating for cleanup page
}

export const Rating = ({ trackId, size = 'sm', showEditor = false, isCleanupContext = false }: RatingProps) => {
  const { tracks, updateTrack } = useMusicStore();
  const track = tracks.find(t => t.id === trackId);

  if (!track) return null;

  const handleRatingChange = async (newRating: number) => {
    // Only allow editing if not in cleanup context or if showEditor is explicitly true
    if (!isCleanupContext && !showEditor) return; 

    // If changing from an unrated state, set initialRating as well
    const updatedData: Partial<typeof track> = { rating: newRating };
    if ((track.initialRating === undefined || track.initialRating === null || track.initialRating === 0) && newRating > 0) {
      updatedData.initialRating = newRating;
    }
    await updateTrack(track.id, updatedData);
  };

  const currentRating = track.rating;
  const initialRating = track.initialRating;
  const comparisons = track.comparisons || 0;
  const eloScore = track.eloScore || 1000;

  // Determine display rating based on comparisons and existence of initial rating
  let displayRating: string | number = '?';
  let ratingValue: number | null = null; // Numeric value for comparison ranges

  if (comparisons > 3 && currentRating !== undefined && currentRating !== null && currentRating > 0) {
    ratingValue = currentRating;
    displayRating = currentRating.toFixed(1);
  } else if (initialRating !== undefined && initialRating !== null && initialRating > 0) {
    ratingValue = initialRating;
    displayRating = initialRating.toFixed(1);
  } else if (comparisons > 3 && currentRating !== undefined && currentRating !== null) {
     // If more than 3 comparisons but currentRating is 0 or null, still show 0.0
    ratingValue = currentRating;
    displayRating = currentRating.toFixed(1);
  } else if (comparisons <= 3 && (initialRating === undefined || initialRating === null || initialRating === 0)) {
    // For unrated or 0.0 with <=3 comparisons, show '?'
    displayRating = '?';
    ratingValue = null;
  } else if (initialRating === 0 && comparisons > 0) {
    // If initial rating is 0, display 0.0
    displayRating = '0.0';
    ratingValue = 0;
  }

  let colorClass = 'text-zinc-500'; // Default grey for '?' or 0.0

  if (ratingValue !== null) {
    if (ratingValue >= 9.9999999) {
      colorClass = 'text-blue-400';
    } else if (ratingValue >= 7) {
      colorClass = 'text-emerald-500';
    } else if (ratingValue >= 4) {
      colorClass = 'text-yellow-500';
    } else if (ratingValue > 0) { // Round up to 0.1 for display
      colorClass = 'text-red-500';
      if (ratingValue < 0.1) displayRating = '0.1'; // Ensure minimum 0.1 if > 0
    } else if (ratingValue === 0) {
      colorClass = 'text-zinc-500';
    }
  }

  // Calculate global rank for 10/10 tracks
  const tenStarTracks = tracks
    .filter(t => {
      const effectiveRating = (t.comparisons >= 3 && t.rating !== undefined && t.rating !== null)
          ? t.rating
          : (t.initialRating !== undefined && t.initialRating !== null)
              ? t.initialRating
              : null;
      return effectiveRating !== null && effectiveRating >= 9.9999999 && t.comparisons > 0;
    })
    .sort((a, b) => (b.eloScore || 0) - (a.eloScore || 0));

  const isTenStarTrack = ratingValue !== null && ratingValue >= 9.9999999 && comparisons > 0;
  const globalRank = isTenStarTrack ? tenStarTracks.findIndex(t => t.id === track.id) + 1 : null;

  const starSize = size === 'sm' ? 12 : size === 'md' ? 16 : 20;
  const textSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base';
  const comparisonTextSize = size === 'sm' ? 'text-[8px]' : 'text-[10px]';

  return (
    <div className={cn("flex items-center gap-1", colorClass)}>
      {isTenStarTrack && globalRank !== null ? (
        <span className={cn("font-black uppercase tracking-tight", textSize)}>#{globalRank}</span>
      ) : (
        <>
          <Star size={starSize} fill="currentColor" className={cn(colorClass, displayRating === '?' ? 'opacity-30' : '')}/>
          <span className={cn("font-bold", textSize, displayRating === '?' ? 'italic' : '')}>
            {displayRating}
          </span>
        </>
      )}
      <span className={cn("ml-1 text-zinc-600 font-mono", comparisonTextSize)}>({comparisons})</span>
    </div>
  );
};