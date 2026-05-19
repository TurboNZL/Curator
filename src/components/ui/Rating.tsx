"use client";

import React from 'react';
import { Star, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMusicStore } from '@/store/useMusicStore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RatingProps {
  trackId: string;
  balanced?: number | null;
  unbalanced?: number | null;
  comparisons?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const Rating: React.FC<RatingProps> = ({
  trackId,
  balanced,
  unbalanced,
  comparisons = 0,
  size = 'sm'
}) => {
  const { updateTrack, activeProfile, currentTrackId } = useMusicStore();
  const showUnbalancedFirst = activeProfile.settings?.showUnbalancedFirst ?? false;

  const displayRating = showUnbalancedFirst ? unbalanced : balanced;

  // Determine if it should show '?'
  const showQuestionMark = (unbalanced === undefined || unbalanced === null || unbalanced === 0) && comparisons === 0;

  const handleRatingChange = async (newRating: number) => {
    // For simplicity, directly update initialRating and balanced rating from this component
    // In a real app, this might trigger a vote or specific rating update
    await updateTrack(trackId, { 
      initialRating: newRating,
      rating: newRating // For now, direct set balanced from here too
    });
  };

  const currentRating = showQuestionMark ? null : (displayRating ?? null);
  const formattedRating = currentRating !== null ? currentRating.toFixed(1) : '?';

  const isRated = balanced !== undefined && balanced !== null && balanced > 0;
  const isUnbalancedRated = unbalanced !== undefined && unbalanced !== null && unbalanced > 0;

  const baseClasses = "flex items-center gap-1 font-mono text-[10px] uppercase";
  const badgeClasses = "px-2 py-0.5 rounded-full font-black tracking-widest";

  const sizeStyles = {
    sm: {
      star: 12,
      text: "text-[10px]",
      badgeText: "text-[8px] px-1.5 py-0.5"
    },
    md: {
      star: 14,
      text: "text-xs",
      badgeText: "text-[10px] px-2 py-1"
    },
    lg: {
      star: 16,
      text: "text-sm",
      badgeText: "text-xs px-2.5 py-1"
    }
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div className={cn(baseClasses, sizeStyles[size].text)}>
            <Star 
              size={sizeStyles[size].star} 
              className={cn(
                "transition-colors",
                showQuestionMark 
                  ? "text-zinc-600" 
                  : (balanced && balanced > 0 ? "text-yellow-400" : "text-zinc-600")
              )} 
              fill={showQuestionMark ? "currentColor" : (balanced && balanced > 0 ? "currentColor" : "none")}
            />
            <span className={cn(
              "text-white transition-colors",
              showQuestionMark && "text-zinc-600"
            )}>
              {formattedRating}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-zinc-950 border-zinc-800 text-white text-xs p-3">
          <p className="font-bold mb-2">Track Rating</p>
          <div className="flex items-center justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">Initial Rating:</span>
            <span className="font-mono text-white">{unbalanced?.toFixed(1) ?? 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-zinc-500">Balanced Rating:</span>
            <span className="font-mono text-blue-400">{balanced?.toFixed(1) ?? 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-t border-zinc-900">
            <span className="text-zinc-500">Comparisons:</span>
            <span className="font-mono text-white">{comparisons}</span>
          </div>
          {currentTrackId === trackId && (
            <div className="mt-3 text-center">
              <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500">Currently Playing</span>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};