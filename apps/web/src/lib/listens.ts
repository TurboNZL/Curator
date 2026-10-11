import type { Library } from './library.ts';
import { spotifyTrackId } from './spotify.ts';

/** One play, from Curator's own player or imported from Spotify, with the track resolved to the library when it can be. */
export interface Listen {
  id: string;
  /** when it ended, ms */
  ts: number;
  /** how long it was heard, ms */
  ms: number;
  /** the library track, if there is one */
  trackId: string | null;
  title: string;
  /** the main artist (first lead for library tracks, Spotify's album artist otherwise) */
  artist: string;
  album: string;
  uri: string | null;
  skipped: boolean;
  shuffle: boolean | null;
  platform: string | null;
  reasonEnd: string | null;
  source: 'spotify' | 'curator';
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

/** Which library tracks a Spotify play belongs to: by the track's Spotify link first, then by title and main artist. */
export function trackMatcher(lib: Library) {
  const byId = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const t of lib.tracks) {
    const id = spotifyTrackId(t.spotifyUrl);
    if (id) byId.set(id, t.id);
    const key = `${norm(t.title)}|${norm(t.leads[0]?.name ?? t.artistName)}`;
    if (!byName.has(key)) byName.set(key, t.id);
  }
  return (uri: string | null | undefined, name: string, artist: string): string | null =>
    (uri && byId.get(spotifyTrackId(uri) ?? '')) || byName.get(`${norm(name)}|${norm(artist)}`) || null;
}

const cache = new WeakMap<Library, Listen[]>();

/** Every play, oldest first. Cached per library snapshot. */
export function buildListens(lib: Library): Listen[] {
  const hit = cache.get(lib);
  if (hit) return hit;
  const match = trackMatcher(lib);
  const out: Listen[] = [];
  for (const l of lib.logs) {
    if (l.imported === 'spotify') {
      const trackId = l.trackId || match(l.uri, l.name ?? '', l.artist ?? '');
      const t = trackId ? lib.trackById.get(trackId) : undefined;
      out.push({ id: l.id, ts: l.timestamp, ms: Math.round((l.duration ?? 0) * 1000), trackId: t?.id ?? null, title: t?.title ?? l.name ?? '', artist: t ? (t.leads[0]?.name ?? t.artistName) : l.artist ?? '',
        album: t?.albumTitle ?? l.album ?? '', uri: l.uri ?? null, skipped: !!l.isSkip, shuffle: l.shuffle ?? null, platform: l.platform ?? null, reasonEnd: l.reasonEnd ?? null, source: 'spotify' });
    } else {
      const t = lib.trackById.get(l.trackId);
      if (!t) continue;
      out.push({ id: l.id, ts: l.timestamp, ms: Math.round((l.duration ?? 0) * 1000), trackId: t.id, title: t.title, artist: t.leads[0]?.name ?? t.artistName, album: t.albumTitle ?? '',
        uri: spotifyTrackId(t.spotifyUrl) ? `spotify:track:${spotifyTrackId(t.spotifyUrl)}` : null, skipped: !!l.isSkip, shuffle: null, platform: 'Curator', reasonEnd: null, source: 'curator' });
    }
  }
  out.sort((a, b) => a.ts - b.ts);
  cache.set(lib, out);
  return out;
}
