"use client";

import React, { useMemo } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMusicStore } from '@/store/useMusicStore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RatingProps {
  trackId: string;
  balanced?: number | null;
  unbalanced?: number | null;
  comparisons: number;
  size?: 'sm' | 'md' | 'lg';
}

export const Rating = ({ trackId, balanced, unbalanced, comparisons, size = 'sm' }: RatingProps) => {
  const { tracks } = useMusicStore();

  const displayRating = balanced !== undefined && balanced !== null ? balanced : unbalanced;

  const top10Tracks = useMemo(() => {
    // Filter for tracks rated 10, sort them by Elo or initialRating if available, then by title
    return tracks
      .filter(t => t.rating === 10 || t.initialRating === 10)
      .sort((a, b) => {
        // Higher ELO or initialRating means higher rank
        if ((b.eloScore || b.initialRating || 0) !== (a.eloScore || a.initialRating || 0)) {
          return (b.eloScore || b.initialRating || 0) - (a.eloScore || a.initialRating || 0);
        }
        // Fallback to title for consistent ordering
        return a.title.localeCompare(b.title);
      });
  }, [tracks]);

  const rank = useMemo(() => {
    if (displayRating === 10) {
      const index = top10Tracks.findIndex(t => t.id === trackId);
      if (index !== -1) {
        return `#${index + 1}`;
      }
    }
    return null;
  }, [displayRating, trackId, top10Tracks]);

  const ratingClasses = useMemo(() => {
    switch (size) {
      case 'sm': return "text-[10px] h-5 px-1.5";
      case 'md': return "text-xs h-6 px-2";
      case 'lg': return "text-sm h-7 px-2.5";
    }
  }, [size]);

  const starSize = useMemo(() => {
    switch (size) {
      case 'sm': return 10;
      case 'md': return 12;
      case 'lg': return 14;
    }
  }, [size]);

  if (displayRating === undefined || displayRating === null) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-600 font-bold",
              ratingClasses
            )}>
              <Star size={starSize} />
              <span>NR</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-zinc-800 text-white border-zinc-700">
            <p className="text-xs">Not rated yet</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const ratingColor = displayRating >= 8 ? "text-emerald-500" :
                      displayRating >= 6 ? "text-blue-500" :
                      displayRating >= 4 ? "text-yellow-500" :
                      "text-red-500";

  const backgroundColor = displayRating >= 8 ? "bg-emerald-950/20 border-emerald-900/40" :
                          displayRating >= 6 ? "bg-blue-950/20 border-blue-900/40" :
                          displayRating >= 4 ? "bg-yellow-950/20 border-yellow-900/40" :
                          "bg-red-950/20 border-red-900/40";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-1 rounded-full font-bold",
            ratingClasses,
            backgroundColor
          )}>
            <Star size={starSize} className={ratingColor} fill="currentColor" />
            <span className={ratingColor}>{rank || displayRating.toFixed(1)}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-zinc-800 text-white border-zinc-700">
          <p className="text-xs">Rating: {displayRating.toFixed(1)} ({comparisons} comparisons)</p>
          {balanced !== undefined && balanced !== null && balanced !== unbalanced && (
            <p className="text-xs text-zinc-400">Initial: {unbalanced?.toFixed(1)}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};