import { spotifyTrackId } from './spotify.ts';

type WithLinks = { spotifyUrl?: string | null; spotifyUrls?: string[] | null };

/** Every Spotify link of a song, the played one first, each Spotify track once. A single and its album version are two Spotify tracks of one song. */
export function allSpotifyUrls(t: WithLinks | null | undefined): string[] {
  if (!t) return [];
  const seen = new Set<string>(), out: string[] = [];
  for (const u of [t.spotifyUrl, ...(t.spotifyUrls ?? [])]) {
    const id = spotifyTrackId(u);
    if (!u || !id || seen.has(id)) continue;
    seen.add(id); out.push(u.trim());
  }
  return out;
}

export const allSpotifyIds = (t: WithLinks | null | undefined): string[] => allSpotifyUrls(t).flatMap((u) => spotifyTrackId(u) ?? []);

/** The stored fields for a list of links: the first is the played one, the rest are alternates. Anything that is not a track link is dropped. */
export function linkFields(urls: string[]): { spotifyUrl: string | null; spotifyUrls: string[] } {
  const all = allSpotifyUrls({ spotifyUrl: null, spotifyUrls: urls });
  return { spotifyUrl: all[0] ?? null, spotifyUrls: all.slice(1) };
}

/** `t` with one more link, unless that Spotify track is already one of its links. Returns the fields to store, or null when nothing changes. */
export function withLink(t: WithLinks, url: string): { spotifyUrl: string | null; spotifyUrls: string[] } | null {
  const id = spotifyTrackId(url);
  if (!id || allSpotifyIds(t).includes(id)) return null;
  return linkFields([...allSpotifyUrls(t), url]);
}
