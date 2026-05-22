"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Star, GripVertical, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Track }  from '@/../server/types/music'; // Corrected import path
import { useMusicStore } from '@/store/useMusicStore';
import { Button } from './button';
import { toast } from 'sonner';

interface RatingProps {
  track: Track;
  showEditor?: boolean;
  size?: 'sm' | 'md' | 'lg';
  isCleanupContext?: boolean; // New prop to indicate if it's in cleanup context
}

export const Rating: React.FC<RatingProps> = ({ track, showEditor = true, size = 'sm', isCleanupContext = false }) => {
  const { updateTrack, activeProfile } = useMusicStore();
  const [editing, setEditing] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [tempRating, setTempRating] = useState(0);

  const showUnbalancedFirst = activeProfile.settings?.showUnbalancedFirst;

  const currentRating = useMemo(() => {
    // Determine which rating to show based on settings and data availability
    const balanced = (track.comparisons >= 3 || track.memories > 0) && track.rating !== undefined && track.rating !== null && track.rating > 0.001 ? track.rating : null;
    const initial = track.initialRating !== undefined && track.initialRating !== null && track.initialRating > 0.001 ? track.initialRating : null;

    if (balanced !== null && initial !== null) {
      return showUnbalancedFirst ? initial : balanced;
    }
    return balanced !== null ? balanced : (initial !== null ? initial : 0);
  }, [track.rating, track.initialRating, track.comparisons, track.memories, showUnbalancedFirst]);


  useEffect(() => {
    if (!editing) {
      setTempRating(currentRating);
    }
  }, [editing, currentRating]);


  const handleStarClick = (newRating: number) => {
    setTempRating(newRating);
  };

  const handleSave = async () => {
    if (tempRating !== currentRating) {
      // Decide whether to update initialRating or rating based on isCleanupContext or comparisons
      const updateData: Partial<Track> = {};
      if (isCleanupContext || (track.comparisons < 3 && !showUnbalancedFirst)) { // Update initial if in cleanup or not enough comparisons and showing unbalanced
        updateData.initialRating = tempRating;
      } else { // Otherwise, update balanced rating
        updateData.rating = tempRating;
      }

      await updateTrack(track.id, updateData);
      toast.success("Rating updated!");
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setEditing(false);
    setTempRating(currentRating); // Reset to original rating
  };

  const roundedRating = Math.round(currentRating * 2) / 2; // Round to nearest 0.5
  const roundedTempRating = Math.round(tempRating * 2) / 2;
  const displayValue = editing ? roundedTempRating : roundedRating;

  const starSize = size === 'sm' ? 14 : size === 'md' ? 16 : 18;

  return (
    <div className="flex items-center gap-1.5">
      {showEditor && editing ? (
        <>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((starValue) => (
            <Star
              key={starValue}
              size={starSize}
              className={cn(
                "cursor-pointer transition-colors",
                (hoverRating || tempRating) >= starValue ? "text-yellow-400 fill-yellow-400" : "text-zinc-600 fill-transparent"
              )}
              onMouseEnter={() => setHoverRating(starValue)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => handleStarClick(starValue)}
            />
          ))}
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-emerald-500 hover:text-emerald-400" onClick={handleSave}>
            <Check size={14} />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-400" onClick={handleCancel}>
            <X size={14} />
          </Button>
        </>
      ) : (
        <>
          <span className={cn(
            "font-black tracking-tighter",
            size === 'sm' && "text-sm",
            size === 'md' && "text-base",
            size === 'lg' && "text-lg",
            currentRating > 0.001 ? "text-white" : "text-zinc-600"
          )}>
            {currentRating > 0.001 ? currentRating.toFixed(1) : 'N/A'}
          </span>
          {showEditor && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "text-zinc-500 hover:text-yellow-400 transition-colors",
                size === 'sm' && "h-6 w-6",
                size === 'md' && "h-7 w-7",
                size === 'lg' && "h-8 w-8"
              )}
              onClick={() => setEditing(true)}
            >
              <GripVertical size={starSize} />
            </Button>
          )}
        </>
      )}
    </div>
  );
};