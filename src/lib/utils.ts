import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Track } from '@/types/music'; // Import Track type

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Compatibility helper for track.albumIds
export const trackHasAlbum = (track: Track, albumId: string): boolean => {
  if (!track || !track.albumIds) return false;
  return track.albumIds.some(a =>
    typeof a === 'string' // Old format: array of strings
      ? a === albumId
      : a.albumId === albumId // New format: array of objects { albumId: string, order: number }
  );
};