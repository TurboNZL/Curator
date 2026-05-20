"use client";

import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMusicStore } from '@/store/useMusicStore';
import { Slider } from './slider';
import { Button } from './button';
import { toast } from 'sonner';

interface RatingProps {
  trackId: string;
  size?: 'sm' | 'md' | 'lg';
  showEditor?: boolean;
  isCleanupContext?: boolean; // New prop for cleanup page context
  rank?: string; // New prop for 10/10 ranking
}

export const Rating: React.FC<RatingProps> = ({ trackId, size = 'sm', showEditor = true, isCleanupContext = false, rank }) => {
  const { tracks, updateTrack, vote, fetchData } = useMusicStore();
  const track = tracks.find(t => t.id === trackId);
  const [editing, setEditing] = React.useState(false);
  const [tempRating, setTempRating] = React.useState(0);
  
  const effectiveRating = React.useMemo(() => {
    if (!track) return null;
    // If comparisons are insufficient or rating is null, use initialRating
    if (track.comparisons < 3 || track.rating === undefined || track.rating === null || track.rating === 0) {
      return track.initialRating;
    }
    return track.rating;
  }, [track]);

  const displayRating = React.useMemo(() => {
    if (!track) return 'N/A';

    const currentRating = effectiveRating;
    const comparisons = track.comparisons;

    // Condition for '?'
    if (comparisons >= 3 && (currentRating === undefined || currentRating === null || currentRating <= 0.0001)) {
      return '?';
    }

    // Condition for 10/10 with rank
    if (currentRating !== null && currentRating !== undefined && currentRating >= 9.9999999 && comparisons > 0) {
      return rank || '10.0'; // Display rank if provided, otherwise 10.0
    }

    if (currentRating === undefined || currentRating === null) return '0.0'; // Default for truly unrated (not '?' condition)
    
    // Round up 0.0000001 to 0.1
    const roundedRating = currentRating > 0 && currentRating < 0.1 ? 0.1 : currentRating;

    return roundedRating.toFixed(1);
  }, [track, effectiveRating, rank]);

  const ratingColor = React.useMemo(() => {
    if (!track || displayRating === '?' || parseFloat(displayRating) === 0) return 'text-zinc-500 bg-zinc-900/50 border-zinc-800';

    const currentRating = parseFloat(displayRating);

    if (rank) return 'text-blue-500 bg-blue-500/10 border-blue-500/20'; // Blue for ranked 10/10
    if (currentRating >= 7) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (currentRating >= 4) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    if (currentRating >= 0.1) return 'text-red-500 bg-red-500/10 border-red-500/20';
    return 'text-zinc-500 bg-zinc-900/50 border-zinc-800';
  }, [track, displayRating, rank]);

  React.useEffect(() => {
    if (track) setTempRating(effectiveRating || 0);
  }, [effectiveRating, track]);

  if (!track) return null;

  const handleRatingChange = async () => {
    if (!track || tempRating === effectiveRating) {
      setEditing(false);
      return;
    }

    // If it's a new initial rating or first comparison vote, don't update `rating` directly.
    // Instead, if comparisons < 3, it updates initialRating.
    // Otherwise, it implies a more direct rating action outside of comparison.
    // For now, let's assume `updateTrack` handles `initialRating` and `rating` directly.
    
    // The user's prompt implies manual rating directly updates the initialRating,
    // which then affects `rating` after enough comparisons.
    await updateTrack(track.id, {
      initialRating: tempRating,
      // If manually setting a rating, and it's 10.0, ensure it's recorded correctly
      // Also reset comparisons if manually rating a previously compared track
      ...(track.comparisons < 3 && { rating: tempRating }), // Only update 'rating' if it hasn't been balanced yet
      comparisons: 0 // Reset comparisons if user explicitly sets a new initial rating
    });
    toast.success(`Rating for "${track.title}" updated to ${tempRating.toFixed(1)}`);
    setEditing(false);
    fetchData(); // Re-fetch to ensure all calculations are fresh
  };

  const currentSizeClasses = {
    sm: 'h-6 text-[9px] px-2 py-0.5',
    md: 'h-8 text-[10px] px-3 py-1',
    lg: 'h-10 text-xs px-4 py-1.5'
  };

  const starSize = {
    sm: 10,
    md: 12,
    lg: 14
  };

  return (
    <div className={cn(
      "flex items-center gap-1",
      isCleanupContext ? "cursor-default" : "cursor-pointer" // No editing on cleanup page by default
    )}>
      {editing && showEditor && !isCleanupContext ? (
        <div className="flex items-center gap-2">
          <Slider 
            value={[tempRating]} 
            max={10} 
            step={0.1} 
            onValueChange={([val]) => setTempRating(val)} 
            className="w-24"
          />
          <Button variant="outline" size="sm" onClick={handleRatingChange} className="h-7 text-[10px] font-bold">Save</Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="h-7 text-[10px] text-zinc-500">Cancel</Button>
        </div>
      ) : (
        <div 
          className={cn(
            "flex items-center gap-1 font-black uppercase tracking-widest rounded-full border",
            ratingColor,
            currentSizeClasses[size],
            showEditor && !isCleanupContext && "hover:bg-zinc-800/50" // Only show hover if editable
          )}
          onClick={showEditor && !isCleanupContext ? () => setEditing(true) : undefined}
        >
          <Star size={starSize[size]} fill="currentColor" />
          <span>{displayRating}</span>
          {track.comparisons > 0 && (
            <span className="ml-1 text-zinc-500 text-[8px] font-normal tracking-tight">({track.comparisons})</span>
          )}
        </div>
      )}
    </div>
  );
};