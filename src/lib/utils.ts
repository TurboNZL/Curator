import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Album, Release, Track } from '../../server/types/music'; // Corrected import path

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

// Helper to resolve album cover display logic
export const getAlbumDisplayCover = (
  album: Album | undefined,
  allReleases: Release[], // Pass all releases to resolve potential default/first
  defaultImageFallback: string = '/placeholder.svg' // Provide a fallback from settings
): string => {
  if (!album) return defaultImageFallback;

  // 1. Manual override wins
  if (album.primaryCover) return album.primaryCover;

  // Filter releases belonging to this album
  const albumReleases = allReleases.filter(r => r.albumId === album.id);

  // 2. Default release cover (if set)
  if (album.defaultReleaseId) {
    const defaultRelease = albumReleases.find(r => r.id === album.defaultReleaseId);
    if (defaultRelease?.coverImage) return defaultRelease.coverImage;
  }

  // 3. First available release cover
  const firstReleaseWithCover = albumReleases.find(r => r.coverImage);
  if (firstReleaseWithCover?.coverImage) return firstReleaseWithCover.coverImage;
  
  // 4. Fallback to provided default image
  return defaultImageFallback;
};