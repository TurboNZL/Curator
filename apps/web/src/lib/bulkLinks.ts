import type { Library, Track } from './library.ts';

export type LinkKind = 'youtubeMusicUrl' | 'spotifyUrl' | 'geniusUrl';
export const LINK_LABEL: Record<LinkKind, string> = { youtubeMusicUrl: 'YouTube Music', spotifyUrl: 'Spotify', geniusUrl: 'Genius' };
const HOSTS: Record<LinkKind, RegExp> = {
  youtubeMusicUrl: /^https?:\/\/(?:[\w-]+\.)?(?:youtube\.com|youtu\.be)\//i,
  spotifyUrl: /^https?:\/\/(?:open\.)?spotify\.com\//i,
  geniusUrl: /^https?:\/\/(?:[\w-]+\.)?genius\.com\//i,
};

/** One album (or the singles) and the tracks that could get a link, in tracklist order. */
export interface LinkGroup { key: string; title: string; subtitle: string; tracks: Track[] }

/** Albums in alphabetical order, each with its tracks in album order; singles last. Only groups with a missing link are returned. */
export function linkGroups(lib: Library, kind: LinkKind): LinkGroup[] {
  const groups: LinkGroup[] = [];
  for (const a of [...lib.albums].sort((x, y) => x.title.localeCompare(y.title))) {
    const tracks = a.trackIds.map((id) => lib.trackById.get(id)!).filter(Boolean);
    if (tracks.some((t) => !t[kind])) groups.push({ key: a.id, title: a.title, subtitle: a.artistName, tracks });
  }
  const singles = lib.singles.filter((t) => !t[kind]).sort((x, y) => x.title.localeCompare(y.title));
  if (singles.length) groups.push({ key: 'singles', title: 'Singles', subtitle: 'tracks that are not on an album', tracks: lib.singles });
  return groups;
}

/** The first link on each line of pasted text; a blank line (or one without a link) is a gap, so the order of the rest is kept. */
export function parseLinks(text: string): string[] {
  return text.split(/\r?\n/).map((line) => line.match(/https?:\/\/[^\s<>"']+/)?.[0] ?? '');
}

export const looksRight = (kind: LinkKind, url: string) => HOSTS[kind].test(url);

/**
 * Lines go to the rows in order. `rows` are the tracks being filled (the ones missing a link, or every track of
 * the album). Returns the link each row would get; rows past the last line, and gaps, get null.
 */
export function assignLinks(rows: { id: string }[], lines: string[]): Map<string, string | null> {
  return new Map(rows.map((r, i) => [r.id, lines[i] || null]));
}
