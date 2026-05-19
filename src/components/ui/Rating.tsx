"use client";

import React, { useState } from 'react';
import { Star, Check, Trash2 } from 'lucide-react'; // Added Check and Trash2 imports
import { cn } from '@/lib/utils';
import { useMusicStore } from '@/store/useMusicStore';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface RatingProps {
  trackId: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Rating: React.FC<RatingProps> = ({ trackId, size = 'sm' }) => {
  const { tracks, updateTrack } = useMusicStore();
  const track = tracks.find(t => t.id === trackId);

  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  if (!track) return null;

  const currentRating = (track.rating !== undefined && track.rating !== null && track.comparisons >= 3)
    ? Math.round(track.rating) // Balanced rating if enough comparisons
    : (track.initialRating !== undefined && track.initialRating !== null ? Math.round(track.initialRating) : null); // Otherwise initial rating

  const handleRatingClick = async (newRating: number) => {
    if (track.initialRating === newRating) {
      // If clicking current initial rating, set to null (unrated)
      await updateTrack(track.id, { initialRating: null, rating: 0 });
      toast.info(`"${track.title}" is now unrated.`);
    } else {
      await updateTrack(track.id, { initialRating: newRating, rating: newRating });
      toast.success(`Rated "${track.title}" ${newRating}/10!`);
    }
  };

  const starSize = size === 'sm' ? 12 : size === 'md' ? 16 : 20;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((starValue) => {
        const isFilled = starValue <= (hoveredRating !== null ? hoveredRating : (currentRating || 0));
        return (
          <DropdownMenu key={starValue}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-auto w-auto p-0 group-hover:opacity-100 transition-opacity"
                onMouseEnter={() => setHoveredRating(starValue)}
                onMouseLeave={() => setHoveredRating(null)}
                onClick={(e) => { e.stopPropagation(); }} // Prevent opening the context menu
              >
                <Star
                  size={starSize}
                  className={cn(
                    "cursor-pointer transition-colors",
                    isFilled ? "text-yellow-400 fill-yellow-400" : "text-zinc-600 hover:text-yellow-300"
                  )}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-950 border-zinc-800 text-white">
              <DropdownMenuItem onClick={() => handleRatingClick(starValue)} className="text-xs font-bold flex items-center gap-2">
                Rate {starValue}/10
                {currentRating === starValue && <Check size={12} className="text-emerald-500 ml-auto" />}
              </DropdownMenuItem>
              {currentRating === starValue && (
                <DropdownMenuItem onClick={() => handleRatingClick(0)} className="text-xs font-bold text-red-500 flex items-center gap-2">
                  <Trash2 size={12} className="mr-2" /> Clear Rating
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </div>
  );
};