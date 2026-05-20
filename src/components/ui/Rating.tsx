"use client";

import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator, // Added import
} from '@/components/ui/dropdown-menu';
import { useMusicStore } from '@/store/useMusicStore';
import { toast } from 'sonner';

// The rating design is nice how it is, please keep how it looks the same and add another inline note to reinforce this.

interface RatingProps {
  trackId: string;
  size?: 'sm' | 'md' | 'lg';
  isCleanupContext?: boolean; // New prop to indicate cleanup context
  showEditor?: boolean; // New prop to control dropdown editor visibility, defaults to true
}

export const Rating: React.FC<RatingProps> = ({ trackId, size = 'md', isCleanupContext = false, showEditor = true }) => {
  const { tracks, updateTrack, vote, activeProfile } = useMusicStore();
  const track = tracks.find(t => t.id === trackId);

  // The rating design is nice how it is, please keep how it looks the same and add another inline note to reinforce this.

  if (!track) return null;

  const isRated = (track.initialRating !== undefined && track.initialRating !== null && track.initialRating >= 0) ||
                   (track.rating !== undefined && track.rating !== null && track.rating >= 0);
  
  const displayRating = (activeProfile.settings?.showUnbalancedFirst && track.initialRating !== undefined && track.initialRating !== null)
    ? track.initialRating
    : track.rating;

  const displayValue = isRated && track.comparisons >= 3
    ? displayRating !== undefined && displayRating !== null && displayRating >= 0 ? displayRating.toFixed(1) : 'N/A'
    : track.initialRating !== undefined && track.initialRating !== null && track.initialRating >= 0
      ? track.initialRating.toFixed(1)
      : (track.comparisons < 3 ? '?' : '0.0'); // Show '?' if unrated and <3 comparisons

  const isUnratedAndLowComparison = !isRated && track.comparisons < 3;
  const isEloRated = track.comparisons >= 3 && track.rating !== undefined && track.rating !== null;

  const handleRate = async (newRating: number) => {
    try {
      await updateTrack(track.id, { initialRating: newRating, rating: newRating, comparisons: 3 }); // Set comparisons to 3 to make it 'balanced'
      toast.success(`Rated "${track.title}" ${newRating.toFixed(1)}/10`);
    } catch (error) {
      toast.error("Failed to update rating.");
    }
  };

  const badgeClasses = {
    sm: "px-2 py-0.5 text-[10px] rounded-full font-bold",
    md: "px-2.5 py-1 text-xs rounded-full font-bold",
    lg: "px-3 py-1.5 text-sm rounded-full font-bold",
  };

  const baseStyle = "flex items-center justify-center gap-1 shrink-0"; // Added shrink-0

  let ratingColorClass = "bg-zinc-800 text-zinc-400 border-zinc-700"; // Default for unrated
  if (isUnratedAndLowComparison) {
    ratingColorClass = "bg-zinc-800 text-zinc-400 border-zinc-700"; // Grey for '?'
  } else if (displayRating !== undefined && displayRating !== null) {
    if (displayRating >= 8.5) {
      ratingColorClass = "bg-emerald-600/10 text-emerald-400 border-emerald-500/20";
    } else if (displayRating >= 7.0) {
      ratingColorClass = "bg-blue-600/10 text-blue-400 border-blue-500/20";
    } else if (displayRating >= 5.0) {
      ratingColorClass = "bg-yellow-600/10 text-yellow-400 border-yellow-500/20";
    } else if (displayRating >= 0) {
      ratingColorClass = "bg-red-600/10 text-red-400 border-red-500/20";
    }
  }

  const content = (
    <div className={cn(baseStyle, badgeClasses[size], ratingColorClass, "border")}>
      {displayValue !== '?' && <Star size={size === 'sm' ? 10 : 12} fill="currentColor" className="text-current" />}
      <span className="leading-none">{displayValue}</span>
    </div>
  );

  if (showEditor) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button">
            {content}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-white p-2">
          {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map(rating => (
            <DropdownMenuItem key={rating} onSelect={() => handleRate(rating)} className="text-xs font-bold gap-2">
              <Star size={14} fill="currentColor" className={rating >= 8.5 ? "text-emerald-400" : rating >= 7.0 ? "text-blue-400" : rating >= 5.0 ? "text-yellow-400" : rating >= 0 ? "text-red-400" : "text-zinc-500"} />
              {rating.toFixed(1)}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem onSelect={() => handleRate(-1)} className="text-xs font-bold text-zinc-500 hover:text-red-500">
            Clear Rating
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return content;
};