import type { Library } from './library.ts';

const fold = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** YouTube's channel names carry decorations: "Drake - Topic", "DrakeVEVO", "Drake Official". */
export const cleanArtistName = (s: string) => s.replace(/\s*-\s*topic$/i, '').replace(/\s*vevo$/i, '').replace(/\s+official(\s+(channel|artist channel))?$/i, '').trim();

/** "Album - Take Care" (YouTube Music's own playlist title) is the album "Take Care". */
export const cleanAlbumTitle = (s: string) => s.replace(/^album\s*-\s*/i, '').replace(/\s*[([]\s*(official\s+)?(full\s+)?(album|audio)\s*[)\]]\s*$/i, '').trim();

/** The library artist a scraped name stands for (accents, case and channel decorations do not matter), or undefined. */
export function matchArtist<T extends { name: string }>(artists: T[], scraped: string): T | undefined {
  const want = fold(cleanArtistName(scraped));
  return want ? artists.find((a) => fold(a.name) === want) : undefined;
}

/** The genres an artist's albums and tracks use most, as the starting genres for something new by them (at most `n`). */
export function genresFor(lib: Library, artistId: string, n = 3): string[] {
  const count = new Map<string, number>();
  const bump = (g: string) => count.set(g, (count.get(g) ?? 0) + 1);
  for (const a of lib.albums) if (a.leads.some((l) => l.id === artistId)) a.genres.forEach(bump);
  for (const t of lib.tracks) if (!t.albumId && t.leads.some((l) => l.id === artistId)) t.allGenres.forEach(bump);
  return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([g]) => g);
}
