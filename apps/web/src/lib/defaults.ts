import type { AlbumData, TrackData } from '@curator/core';

/** A complete TrackData for a hand-made track (every field present, so nothing downstream sees undefined). */
export function newTrackData(init: Pick<TrackData, 'title' | 'artistId'> & Partial<TrackData>): TrackData {
  return {
    credits: [{ artistId: init.artistId, role: ['Lead artist'] }], genres: [], albums: [], file: null, initialRating: null,
    spotifyUrl: null, geniusUrl: null, youtubeMusicUrl: null, bitrate: null, bpm: null, key: null, memories: 0,
    isFavorite: false, syncWithAlbumCredits: true, queueRules: {}, ...init,
  };
}

export function newAlbumData(init: Pick<AlbumData, 'title' | 'artistId'> & Partial<AlbumData>): AlbumData {
  return { credits: [{ artistId: init.artistId, role: ['Lead artist'] }], genres: [], cover: null, eraId: null, defaultReleaseId: null, ...init };
}

/**
 * Pure helpers for editing an album's track list. They return the new full order (and never mutate),
 * so the caller writes it to `album.trackOrder`.
 */
export const moveTrack = (order: string[], from: number, to: number): string[] => {
  if (to < 0 || to >= order.length || from === to) return order;
  const next = [...order];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
};
export const removeTrack = (order: string[], id: string) => order.filter((x) => x !== id);
export const appendTrack = (order: string[], id: string) => (order.includes(id) ? order : [...order, id]);
