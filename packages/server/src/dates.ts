import type { SpotifyAccount } from './spotify.ts';

/**
 * When an album came out, for releases that have no date. Three independent sources, tried in this order, the first sure answer wins:
 *  - Spotify (only when the server's Spotify account is signed in): the release date Spotify has for a track of that album;
 *  - iTunes Search (no key): an exact album and artist match;
 *  - MusicBrainz release group (no key, one request a second): the first release date of an exact match scoring 90 or more.
 * A near miss would put a wrong date on a release, so each source answers only for an exact name match. Dates come back as stored
 * everywhere in the app: "2024", "2024-06" or "2024-06-14".
 */
type Fetch = typeof fetch;
const UA = 'MusicCurator/1.0 (personal music library; https://github.com/TurboNZL/Curator)';

export interface DateAnswer { date: string; source: 'spotify' | 'itunes' | 'musicbrainz' }

const plain = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\s*[(\[][^)\]]*[)\]]/g, '').replace(/\s+-\s+(single|ep)$/i, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const sameArtist = (a: string, b: string) => { const x = plain(a), y = plain(b); return !!x && !!y && (x === y || x.includes(y) || y.includes(x)); };

/** Only well-formed dates leave this file. */
export function cleanDate(s: unknown): string | null {
  const m = typeof s === 'string' ? /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/.exec(s.trim()) : null;
  if (!m) return null;
  const year = Number(m[1]);
  if (year < 1900 || year > new Date().getFullYear() + 1) return null;
  return m[3] ? `${m[1]}-${m[2]}-${m[3]}` : m[2] ? `${m[1]}-${m[2]}` : m[1];
}

/** iTunes Search `results`: the release date of the album with exactly this title by this artist. */
export function pickItunesDate(results: unknown, album: string, artist: string): string | null {
  const t = plain(album);
  const hit = (Array.isArray(results) ? results : []).find((r) => plain(String(r?.collectionName ?? '')) === t && sameArtist(String(r?.artistName ?? ''), artist) && cleanDate(r?.releaseDate));
  return hit ? cleanDate(hit.releaseDate) : null;
}

/** MusicBrainz release-group search: the first release date of a strong, exact match. */
export function pickMusicBrainzDate(json: unknown, album: string, artist: string): string | null {
  const groups = ((json as { 'release-groups'?: any[] } | null)?.['release-groups'] ?? []);
  const t = plain(album);
  const hit = groups.find((g) => Number(g?.score ?? 0) >= 90 && plain(String(g?.title ?? '')) === t && cleanDate(g?.['first-release-date'])
    && (g['artist-credit'] ?? []).some((c: any) => sameArtist(String(c?.name ?? c?.artist?.name ?? ''), artist)));
  return hit ? cleanDate(hit['first-release-date']) : null;
}

export async function lookupAlbumDate(q: { album: string; artist: string; track?: string }, o: { fetchImpl?: Fetch; spotify?: Pick<SpotifyAccount, 'search'> | null } = {}): Promise<DateAnswer | null> {
  const f = o.fetchImpl ?? fetch;
  const album = q.album.trim(), artist = q.artist.trim();
  if (!album || !artist || artist === 'Unknown artist') return null;
  if (o.spotify) {
    try {
      const found = await o.spotify.search(`album:"${album.replace(/"/g, '')}" artist:"${artist.replace(/"/g, '')}"`, 10);
      const hit = found.find((t) => plain(t.album) === plain(album) && t.artists.some((a) => sameArtist(a, artist)) && cleanDate(t.releaseDate));
      if (hit) return { date: cleanDate(hit.releaseDate)!, source: 'spotify' };
    } catch { /* not signed in, or rate limited: the open sources next */ }
  }
  try {
    const res = await f(`https://itunes.apple.com/search?${new URLSearchParams({ term: `${artist} ${album}`, entity: 'album', limit: '10' })}`, { signal: AbortSignal.timeout(7000) });
    if (res.ok) { const d = pickItunesDate(((await res.json()) as { results?: unknown }).results, album, artist); if (d) return { date: d, source: 'itunes' }; }
  } catch { /* offline or slow */ }
  try {
    const query = `releasegroup:"${album.replace(/"/g, '')}" AND artist:"${artist.replace(/"/g, '')}"`;
    const res = await f(`https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(query)}&fmt=json&limit=5`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10_000) });
    if (res.ok) { const d = pickMusicBrainzDate(await res.json(), album, artist); if (d) return { date: d, source: 'musicbrainz' }; }
  } catch { /* offline or slow */ }
  return null;
}
