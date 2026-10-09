import type { AlbumData, Credit, TrackData } from '@curator/core';

/** The role that makes a credit "the artist" of a track or album. Credits are the only place an artist is entered. */
export const LEAD_ROLE = 'Lead artist';
const isLead = (c: Credit) => !!c.artistId && c.role.some((r) => r.toLowerCase() === LEAD_ROLE.toLowerCase());
export const hasLead = (credits: Credit[]) => credits.some(isLead);

/** Distinct lead-artist ids, in credit order. */
export function leadArtistIds(credits: Credit[]): string[] {
  return [...new Set(credits.filter(isLead).map((c) => c.artistId))];
}

/**
 * The primary artist: the first Lead artist credit, else the stored `artistId` (legacy records have the
 * artist only there; trusting it beats promoting e.g. a lone Producer credit), else the first credit.
 * `artistId` on a record is only a cache of this.
 */
export function leadArtistId(credits: Credit[], fallback: string): string {
  return leadArtistIds(credits)[0] || fallback || credits.find((c) => c.artistId)?.artistId || '';
}

/** Credits without blank artist rows (an editor row the user never filled in). */
export const cleanCredits = (credits: Credit[]): Credit[] => credits.filter((c) => c.artistId);

/**
 * For editors: legacy records have the artist only in `artistId`. If there is no lead credit yet, add
 * one from `artistId` (promoting an existing credit for that artist rather than duplicating it).
 */
export function withLeadFallback(credits: Credit[], artistId: string | undefined): Credit[] {
  if (hasLead(credits) || !artistId) return credits;
  const at = credits.findIndex((c) => c.artistId === artistId);
  if (at < 0) return [{ artistId, role: [LEAD_ROLE] }, ...credits];
  return credits.map((c, i) => (i === at ? { ...c, role: [LEAD_ROLE, ...c.role] } : c));
}


/** A complete TrackData for a hand-made track (every field present, so nothing downstream sees undefined). */
export function newTrackData(init: Pick<TrackData, 'title' | 'artistId'> & Partial<TrackData>): TrackData {
  return {
    credits: [{ artistId: init.artistId, role: [LEAD_ROLE] }], genres: [], albums: [], file: null, initialRating: null,
    spotifyUrl: null, geniusUrl: null, youtubeMusicUrl: null, bitrate: null, bpm: null, key: null, memories: 0,
    isFavorite: false, syncWithAlbumCredits: true, queueRules: {}, ...init,
  };
}

export function newAlbumData(init: Pick<AlbumData, 'title' | 'artistId'> & Partial<AlbumData>): AlbumData {
  return { credits: [{ artistId: init.artistId, role: [LEAD_ROLE] }], genres: [], cover: null, eraId: null, defaultReleaseId: null, ...init };
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
