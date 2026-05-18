"use client";

import React, { useMemo } from 'react';
import { Star, StarHalf } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMusicStore } from '@/store/useMusicStore';

interface RatingProps {
  trackId: string;
  balanced?: number;
  unbalanced?: number;
  comparisons?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Rating = ({ trackId, balanced, unbalanced, comparisons = 0, size = 'sm', className }: RatingProps) => {
  const { activeProfile, tracks } = useMusicStore();
  const showUnbalanced = activeProfile.settings?.showUnbalancedFirst;

  const rank = useMemo(() => {
    if (balanced !== 10) return null;
    const tens = tracks
      .filter(t => t.rating === 10)
      .sort((a, b) => b.eloScore - a.eloScore);
    const index = tens.findIndex(t => t.id === trackId);
    return index !== -1 ? index + 1 : null;
  }, [balanced, tracks, trackId]);

  const displayRating = showUnbalanced ? unbalanced : balanced;
  const isUnrated = displayRating === undefined || displayRating === null;

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-6 w-6'
  };

  if (rank !== null) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <div className={cn(
          "font-black uppercase tracking-tighter text-yellow-500",
          size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-xs' : 'text-xl'
        )}>
          #{rank}
        </div>
        <Star className={cn(sizeClasses[size], "fill-yellow-500 text-yellow-500")} />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1 group/rating relative", className)}>
      <div className="flex items-center">
        {isUnrated ? (
          <Star className={cn(sizeClasses[size], "text-zinc-800")} />
        ) : (
          <div className="flex items-center gap-1">
            <span className={cn(
              "font-bold",
              showUnbalanced ? "text-yellow-600" : "text-blue-500",
              size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-xs' : 'text-lg'
            )}>
              {displayRating.toFixed(1)}
            </span>
            <Star className={cn(
              sizeClasses[size],
              showUnbalanced ? "fill-yellow-600 text-yellow-600" : "fill-blue-500 text-blue-500"
            )} />
          </div>
        )}
      </div>

      {/* Hover Tooltip */}
      {!isUnrated && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[8px] font-black uppercase tracking-widest text-zinc-400 opacity-0 group-hover/rating:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
          <div className="flex flex-col gap-0.5">
            <span className="text-blue-400">Balanced: {balanced?.toFixed(2)}</span>
            <span className="text-yellow-600">Initial: {unbalanced?.toFixed(2)}</span>
            <span className="text-zinc-500">Comps: {comparisons}</span>
          </div>
        </div>
      )}
    </div>
  );
};