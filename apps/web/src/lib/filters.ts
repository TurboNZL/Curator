import type { Library, Track } from './library.ts';

/**
 * The filter language of the Tracks and Albums pages, in the style of Discord's search: free text plus chips such as
 * `artist: Kendrick`, `before: 2019`, `has: audio`. Chips combine with AND; a chip's own words are matched loosely.
 */
export type FilterKey = 'has' | 'artist' | 'album' | 'era' | 'genre' | 'tag' | 'before' | 'after' | 'rating';

export interface Chip {
  key: FilterKey;
  /** the thing chosen: an id for artist/album/era, else the text */
  value: string;
  /** what the chip shows */
  label: string;
}

/** The lists that have this search box. Singles are tracks, so they filter like tracks. */
export type FilterScope = 'tracks' | 'albums' | 'artists' | 'eras' | 'singles';
const ALL: FilterScope[] = ['tracks', 'albums', 'artists', 'eras', 'singles'];

export const FILTER_DOCS: Record<FilterKey, { hint: string; example: string; scopes: FilterScope[] }> = {
  has: { hint: 'Has audio, a cover, memories or a rating', example: 'has: audio', scopes: ALL },
  artist: { hint: 'Credited artist', example: 'artist: Kendrick Lamar', scopes: ['tracks', 'albums', 'eras', 'singles'] },
  album: { hint: 'On an album', example: 'album: GNX', scopes: ['tracks', 'artists', 'eras'] },
  era: { hint: 'In an era', example: 'era: Summer 2024', scopes: ['tracks', 'albums', 'artists', 'singles'] },
  genre: { hint: 'Has a genre', example: 'genre: Hip hop', scopes: ALL },
  tag: { hint: 'A release has this tag', example: 'tag: vinyl', scopes: ['tracks', 'albums', 'singles'] },
  before: { hint: 'Released before a year or date', example: 'before: 2019-06', scopes: ALL },
  after: { hint: 'Released after a year or date', example: 'after: 2020', scopes: ALL },
  rating: { hint: 'Rating, like >7 or <4 or 8', example: 'rating: >7', scopes: ['tracks', 'albums', 'artists', 'singles'] },
};
export const filterKeys = (scope: FilterScope) => (Object.keys(FILTER_DOCS) as FilterKey[]).filter((k) => FILTER_DOCS[k].scopes.includes(scope));
export const HAS_VALUES = ['audio', 'cover', 'memories', 'rating'] as const;

const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** "2019", "2019-06" or "2019-06-14" as the first and last day it covers, or null when it is not a date. */
export function dateRange(text: string): { from: string; to: string } | null {
  const m = /^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/.exec(text.trim());
  if (!m) return null;
  const y = Number(m[1]), mo = m[2] ? Number(m[2]) : 0, d = m[3] ? Number(m[3]) : 0;
  if (mo && (mo < 1 || mo > 12)) return null;
  if (d && (d < 1 || d > lastDay(y, mo))) return null;
  if (!mo) return { from: `${y}-01-01`, to: `${y}-12-31` };
  if (!d) return { from: `${y}-${pad(mo)}-01`, to: `${y}-${pad(mo)}-${pad(lastDay(y, mo))}` };
  return { from: `${y}-${pad(mo)}-${pad(d)}`, to: `${y}-${pad(mo)}-${pad(d)}` };
}

/** A stored release date ("2024", "2024-06", "2024-06-01") as a comparable range. */
const released = (date: string | null) => (date ? dateRange(date) : null);

/** `>7`, `>=7`, `<4`, `7` or `7-9` as a test on a rating, or null when it is not one. */
export function ratingTest(text: string): ((r: number) => boolean) | null {
  const t = text.trim();
  let m = /^(>=|<=|>|<|=)?\s*(\d+(?:\.\d+)?)$/.exec(t);
  if (m) {
    const n = Number(m[2]);
    switch (m[1]) { case '>': return (r) => r > n; case '>=': return (r) => r >= n; case '<': return (r) => r < n; case '<=': return (r) => r <= n; default: return (r) => Math.abs(r - n) < 0.5; }
  }
  m = /^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/.exec(t);
  return m ? (r) => r >= Number(m![1]) && r <= Number(m![2]) : null;
}

const norm = (s: string) => s.toLowerCase();

/**
 * What a chip is tested against: one track, or an album, artist or era seen through the tracks it holds. An artist or era can
 * span several albums and dates, so those are lists (`before:` / `after:` match when any of them does).
 */
export interface Subject {
  artistIds: string[]; artistNames: string; albumIds: string[]; albumTitles: string; eraIds: string[]; eraNames: string; genres: string[]; tags: string[];
  dates: (string | null)[]; hasAudio: boolean; hasCover: boolean; memories: number; rating: number | null;
}

function chipMatches(c: Chip, s: Subject): boolean {
  const v = norm(c.value);
  // a chip that found exactly one artist/album/era holds its id (value differs from the label): match by id only; otherwise the typed words
  const byId = c.value !== c.label;
  switch (c.key) {
    case 'has':
      return c.value === 'audio' ? s.hasAudio : c.value === 'cover' ? s.hasCover : c.value === 'memories' ? s.memories > 0 : c.value === 'rating' ? s.rating !== null : true;
    case 'artist': return byId ? s.artistIds.includes(c.value) : norm(s.artistNames).includes(v);
    case 'album': return byId ? s.albumIds.includes(c.value) : norm(s.albumTitles).includes(v);
    case 'era': return byId ? s.eraIds.includes(c.value) : norm(s.eraNames).includes(v);
    case 'tag': return s.tags.some((g) => norm(g) === v || norm(g).includes(v));
    case 'genre': return s.genres.some((g) => norm(g) === v || norm(g).includes(v));
    case 'before': { const r = dateRange(c.value); return !!r && s.dates.some((x) => { const d = released(x); return !!d && d.to < r.from; }); }
    case 'after': { const r = dateRange(c.value); return !!r && s.dates.some((x) => { const d = released(x); return !!d && d.from > r.to; }); }
    case 'rating': { const test = ratingTest(c.value); return !!test && s.rating !== null && test(s.rating); }
  }
}

const eraNames = (lib: Library, ids: string[]) => ids.map((e) => lib.eraById.get(e)?.name ?? '').join(' ');

/** the tags of the releases an album has, and of the releases a track is on (cached per library snapshot) */
const tagCache = new WeakMap<Library, { album: Map<string, string[]>; track: Map<string, string[]> }>();
function tagIndex(lib: Library) {
  let c = tagCache.get(lib);
  if (!c) {
    c = { album: new Map(), track: new Map() };
    for (const r of lib.releases) {
      if (!r.tags?.length) continue;
      c.album.set(r.albumId, [...new Set([...(c.album.get(r.albumId) ?? []), ...r.tags])]);
      for (const id of r.trackIds) c.track.set(id, [...new Set([...(c.track.get(id) ?? []), ...r.tags])]);
    }
    tagCache.set(lib, c);
  }
  return c;
}
const tagsOfAlbum = (lib: Library, id: string) => tagIndex(lib).album.get(id) ?? [];
const tagsOfTrack = (lib: Library, id: string) => tagIndex(lib).track.get(id) ?? [];

const namesOfArtists = (lib: Library, ids: string[]) => ids.map((id) => lib.artistById.get(id)?.name ?? '').join(' ');
const sum = (xs: number[]) => xs.reduce((n, x) => n + x, 0);
/** the mean of the ratings that exist, else null */
const meanRating = (tracks: Track[]) => { const r = tracks.filter((t) => t.effectiveRating > 0.001).map((t) => t.effectiveRating); return r.length ? sum(r) / r.length : null; };

export function trackSubject(lib: Library, t: Track): Subject {
  const artistIds = [...new Set([t.artistId, ...t.leads.map((l) => l.id), ...t.credits.map((c) => c.artistId)])];
  return {
    artistIds, artistNames: namesOfArtists(lib, artistIds), albumIds: t.albumId ? [t.albumId] : [], albumTitles: t.albumTitle ?? '',
    eraIds: t.eraIds, eraNames: eraNames(lib, t.eraIds), genres: t.allGenres, tags: tagsOfTrack(lib, t.id), dates: [t.releaseDate], hasAudio: !!t.file, hasCover: !!t.cover,
    memories: t.memories ?? 0, rating: t.effectiveRating > 0.001 ? t.effectiveRating : null,
  };
}

export function albumSubject(lib: Library, a: Library['albums'][number]): Subject {
  const tracks = a.trackIds.map((id) => lib.trackById.get(id)).filter((t): t is Track => !!t);
  const artistIds = [...new Set([...a.leads.map((l) => l.id), ...a.credits.map((c) => c.artistId), ...tracks.flatMap((t) => t.credits.map((c) => c.artistId))])];
  return {
    artistIds, artistNames: namesOfArtists(lib, artistIds), albumIds: [a.id], albumTitles: a.title, eraIds: a.eraIds, eraNames: eraNames(lib, a.eraIds),
    genres: a.genres, tags: tagsOfAlbum(lib, a.id), dates: [a.releaseDate], hasAudio: tracks.some((t) => t.file), hasCover: !!a.cover, memories: sum(tracks.map((t) => t.memories ?? 0)), rating: a.rating,
  };
}

/** An artist through everything they are a lead on (their tracks, and the albums those are on). */
export function artistSubject(lib: Library, artistId: string): Subject {
  const tracks = lib.tracks.filter((t) => t.leads.some((l) => l.id === artistId));
  const albums = [...new Set(tracks.flatMap((t) => (t.albumId ? [t.albumId] : [])))];
  return {
    artistIds: [artistId], artistNames: lib.artistById.get(artistId)?.name ?? '', albumIds: albums, albumTitles: albums.map((id) => lib.albumById.get(id)?.title ?? '').join(' '),
    eraIds: [...new Set(tracks.flatMap((t) => t.eraIds))], eraNames: eraNames(lib, [...new Set(tracks.flatMap((t) => t.eraIds))]),
    genres: [...new Set(tracks.flatMap((t) => t.allGenres))], tags: [], dates: tracks.map((t) => t.releaseDate), hasAudio: tracks.some((t) => t.file),
    hasCover: !!lib.artistById.get(artistId)?.image, memories: sum(tracks.map((t) => t.memories ?? 0)), rating: meanRating(tracks),
  };
}

/** An era through its albums' tracks and its singles. */
export function eraSubject(lib: Library, e: Library['eras'][number]): Subject {
  const albums = e.albumIds.flatMap((id) => lib.albumById.get(id) ?? []);
  const tracks = [...albums.flatMap((a) => a.trackIds.flatMap((id) => lib.trackById.get(id) ?? [])), ...e.trackIds.flatMap((id) => lib.trackById.get(id) ?? [])];
  const artistIds = [...new Set(tracks.flatMap((t) => t.leads.map((l) => l.id)))];
  return {
    artistIds, artistNames: namesOfArtists(lib, artistIds), albumIds: albums.map((a) => a.id), albumTitles: albums.map((a) => a.title).join(' '), eraIds: [e.id], eraNames: e.name,
    genres: [...new Set(tracks.flatMap((t) => t.allGenres))], tags: [], dates: [...albums.map((a) => a.releaseDate), ...e.trackIds.map((id) => lib.trackById.get(id)?.releaseDate ?? null)],
    hasAudio: tracks.some((t) => t.file), hasCover: !!(e.cover || albums.some((a) => a.cover)), memories: sum(tracks.map((t) => t.memories ?? 0)), rating: meanRating(tracks),
  };
}

export const matchesAll = (chips: Chip[], s: Subject) => chips.every((c) => chipMatches(c, s));

/**
 * Turns what was typed after `key:` into a chip: an artist, album or era by name (its id when exactly one matches), a date or
 * rating that must parse, a `has:` value from the fixed list. Returns null when it is not valid yet.
 */
export function makeChip(lib: Library, key: FilterKey, typed: string): Chip | null {
  const text = typed.trim();
  if (!text) return null;
  const find = <T extends { id: string }>(list: T[], name: (x: T) => string) => {
    const exact = list.filter((x) => norm(name(x)) === norm(text));
    const hits = exact.length ? exact : list.filter((x) => norm(name(x)).includes(norm(text)));
    return hits.length === 1 ? { value: hits[0].id, label: name(hits[0]) } : { value: text, label: text };
  };
  switch (key) {
    case 'has': { const v = HAS_VALUES.find((x) => x === norm(text)); return v ? { key, value: v, label: v } : null; }
    case 'artist': return { key, ...find(lib.artists, (a) => a.name) };
    case 'album': return { key, ...find(lib.albums, (a) => a.title) };
    case 'era': return { key, ...find(lib.eras, (e) => e.name) };
    case 'tag': { const all = [...new Set(lib.releases.flatMap((r) => r.tags ?? []))]; const g = all.find((x) => norm(x) === norm(text)); return { key, value: g ?? text, label: g ?? text }; }
    case 'genre': { const g = lib.genres.find((x) => norm(x.name) === norm(text)); return { key, value: g?.name ?? text, label: g?.name ?? text }; }
    case 'before': case 'after': return dateRange(text) ? { key, value: text, label: text } : null;
    case 'rating': return ratingTest(text) ? { key, value: text, label: text } : null;
  }
}

/** "artist: Kendrick" typed as one string: the key and the rest, or null when it is just words. */
export function splitTyped(text: string, scope?: FilterScope): { key: FilterKey; rest: string } | null {
  const m = /^\s*(has|artist|album|era|genre|tag|before|after|rating)\s*:\s*(.*)$/i.exec(text);
  if (!m) return null;
  const key = m[1].toLowerCase() as FilterKey;
  return !scope || FILTER_DOCS[key].scopes.includes(scope) ? { key, rest: m[2] } : null;
}
