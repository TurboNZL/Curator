"use client";

import React, { useState, useMemo } from 'react';
import { Star, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMusicStore } from '@/store/useMusicStore';
import { EditTrackModal } from '@/components/modals/EditTrackModal'; // Import EditTrackModal

interface RatingProps {
  trackId: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Rating = ({ trackId, size = 'md' }: RatingProps) => {
  const { tracks, activeProfile } = useMusicStore();
  const track = useMemo(() => tracks.find(t => t.id === trackId), [tracks, trackId]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (!track) return null; // Or some fallback UI

  const { rating, initialRating, comparisons, eloScore } = track;

  const displayQuestionMark = (comparisons < 3) || (comparisons === 0 && (initialRating === undefined || initialRating === null || initialRating === 0)); // Added 0 check for initialRating
  
  let displayValue: React.ReactNode;

  const allRatedTracks = useMemo(() => {
    return tracks
      .filter(t => (t.comparisons && t.comparisons >= 3) || (t.initialRating !== undefined && t.initialRating !== null && t.initialRating > 0)) // Only consider truly rated tracks for rank
      .sort((a, b) => (b.eloScore || 0) - (a.eloScore || 0)); // Sort by eloScore for global rank
  }, [tracks]);

  if (displayQuestionMark) {
    displayValue = (
      <button 
        onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }}
        className="flex items-center gap-1 text-zinc-500 hover:text-white transition-colors cursor-pointer"
        title="Quick edit to rate this track"
      >
        <span className="font-mono text-xs md:text-sm">?</span>
        <Edit2 size={size === 'sm' ? 10 : size === 'md' ? 12 : 14} />
      </button>
    );
  } else if (rating === 10 && comparisons >= 3) {
    const globalRank = allRatedTracks.findIndex(t => t.id === trackId) + 1;
    displayValue = <span className="font-mono text-xs md:text-sm text-yellow-400">#{globalRank}</span>;
  } else if (rating !== undefined && rating !== null) {
    displayValue = <span className="font-mono text-xs md:text-sm">{rating.toFixed(1)}</span>;
  } else {
    // Fallback if none of the above conditions met (should ideally be caught by displayQuestionMark)
    displayValue = <span className="font-mono text-xs md:text-sm">?</span>;
  }

  const baseClasses = "flex items-center gap-1 font-mono"; // Changed font to font-mono
  const iconSize = size === 'sm' ? 10 : size === 'md' ? 12 : 14;
  const textColor = displayQuestionMark ? "text-zinc-500" : (rating === 10 ? "text-yellow-400" : "text-zinc-300"); // Yellow for #ranking

  return (
    <>
      <div className={cn(baseClasses, textColor, `text-${size === 'sm' ? 'xs' : size === 'md' ? 'sm' : 'base'}`)}>
        <Star size={iconSize} className="text-yellow-500" fill="currentColor" />
        {displayValue}
      </div>
      {track && (
        <EditTrackModal 
          track={track} 
          open={isEditModalOpen} 
          onOpenChange={setIsEditModalOpen} 
          children={<></>} // Modal is controlled, so children are not used for trigger
        />
      )}
    </>
  );
};