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


/** True when two credit lists name the same artists with the same roles (order does not matter). */
export function sameCredits(a: Credit[], b: Credit[]): boolean {
  const key = (cs: Credit[]) => cs.filter((c) => c.artistId).map((c) => `${c.artistId}:${[...c.role].map((r) => r.toLowerCase()).sort().join(',')}`).sort().join('|');
  return key(a) === key(b);
}

/**
 * What a track added to an album inherits. Credits identical to the album's mean the track follows the album
 * (its credits, genres and cover come from it, now and when the album changes). Credits the user changed make
 * the track's own, which start with a copy of the album's genres.
 */
export function inheritFromAlbum(album: { credits: Credit[]; artistId: string; genres: string[] } | undefined, credits: Credit[]): Pick<TrackData, 'syncWithAlbumCredits' | 'genres'> {
  if (!album) return { syncWithAlbumCredits: false, genres: [] };
  const follows = hasLead(album.credits ?? []) && sameCredits(credits, album.credits);
  return { syncWithAlbumCredits: follows, genres: follows ? [] : [...(album.genres ?? [])] };
}

/** A complete TrackData for a hand-made track (every field present, so nothing downstream sees undefined). */
export function newTrackData(init: Pick<TrackData, 'title' | 'credits'> & Partial<TrackData>): TrackData {
  return {
    genres: [], albums: [], file: null, cover: null, eraId: null, initialRating: null,
    spotifyUrl: null, geniusUrl: null, youtubeMusicUrl: null, bitrate: null, bpm: null, key: null, memories: 0,
    syncWithAlbumCredits: true, queueRules: {}, ...init,
  };
}

export function newAlbumData(init: Pick<AlbumData, 'title' | 'credits'> & Partial<AlbumData>): AlbumData {
  return { genres: [], cover: null, eraId: null, defaultReleaseId: null, ...init };
}

/** A lead-artist-only credit list. */
export const leadCredit = (artistId: string): Credit[] => [{ artistId, role: [LEAD_ROLE] }];

/**
 * The old single-artist field is gone: a record that still has `artistId` gets it as a Lead artist credit
 * (promoting an existing credit for that artist rather than duplicating it) and loses the field.
 * Returns null when there is nothing to migrate.
 */
export function withoutLegacyArtist<T extends { artistId?: string; credits?: Credit[] }>(data: T): Omit<T, 'artistId'> | null {
  if (!('artistId' in data)) return null;
  const { artistId, ...rest } = data;
  return { ...rest, credits: withLeadFallback(data.credits ?? [], artistId) };
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

/** A track title from a file name: no extension, no leading track number ("01 ", "3 - "; a bare "7 Rings" is kept), underscores as spaces. */
export function titleFromFilename(name: string): string {
  const base = name.replace(/^.*[\\/]/, '').replace(/\.[A-Za-z0-9]{2,5}$/, '');
  const tidy = (x: string) => x.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  const cleaned = tidy(base.replace(/^\s*(?:\d{1,3}\s*[-.)_]\s*|0\d{1,2}[\s_]+(?=[^\d\s_]))/, ''));
  return cleaned || tidy(base);
}

const AUDIO_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac', ogg: 'audio/ogg', oga: 'audio/ogg',
  opus: 'audio/ogg', wav: 'audio/wav', webm: 'audio/webm',
};
export const AUDIO_ACCEPT = Object.keys(AUDIO_TYPES).map((e) => `.${e}`).join(',') + ',audio/*';

/** The browser's own type when it gave one, else a guess from the extension (so the server and <audio> agree). */
export function audioMime(name: string, type: string): string {
  if (type.startsWith('audio/')) return type;
  return AUDIO_TYPES[name.split('.').pop()?.toLowerCase() ?? ''] ?? 'audio/mpeg';
}
