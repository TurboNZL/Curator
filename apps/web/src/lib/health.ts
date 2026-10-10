import { hasLead } from './defaults.ts';
import type { Library } from './library.ts';

export type HealthKind = 'track' | 'album' | 'artist' | 'genre' | 'role' | 'release' | 'noteCategory';
export interface HealthItem { kind: HealthKind; id: string; label: string; detail?: string }
export interface HealthCheck {
  id: string; title: string; why: string; items: HealthItem[];
  /** only for checks that are safe to fix in one click */
  fix?: { label: string; table: 'artists' | 'genres' | 'roleCategories' | 'noteCategories' };
  /** one-click: write a "Lead artist" credit from the stored artistId onto each item */
  addLead?: { label: string };
  /** paste many links at once, album by album */
  bulk?: 'youtubeMusicUrl' | 'spotifyUrl' | 'geniusUrl';
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Data-quality checks across the whole library (replaces the old "cleanup tasks"). Pure, so it is testable. */
export function computeHealth(lib: Library): HealthCheck[] {
  const t = (x: (typeof lib.tracks)[number], detail?: string): HealthItem => ({ kind: 'track', id: x.id, label: `${x.title} · ${x.artistName}`, detail });

  const usedArtists = new Set<string>();
  for (const x of lib.tracks) { usedArtists.add(x.artistId); x.credits.forEach((c) => usedArtists.add(c.artistId)); }
  for (const a of lib.albums) { usedArtists.add(a.artistId); a.credits.forEach((c) => usedArtists.add(c.artistId)); }
  for (const g of lib.groups) g.members.forEach((m) => m.entityType === 'artist' && usedArtists.add(m.entityId));

  const usedGenres = new Set<string>();
  for (const x of lib.tracks) x.genres.forEach((g) => usedGenres.add(g.toLowerCase()));
  for (const a of lib.albums) a.genres.forEach((g) => usedGenres.add(g.toLowerCase()));

  const usedRoles = new Set<string>();
  for (const x of lib.tracks) x.credits.forEach((c) => c.role.forEach((r) => usedRoles.add(r.toLowerCase())));
  for (const a of lib.albums) a.credits.forEach((c) => c.role.forEach((r) => usedRoles.add(r.toLowerCase())));

  const dupes = new Map<string, typeof lib.tracks>();
  for (const x of lib.tracks) { const k = `${norm(x.title)}|${x.artistId}`; dupes.set(k, [...(dupes.get(k) ?? []), x]); }

  const lowQuality = lib.tracks.filter((x) => x.bitrate && parseInt(x.bitrate) > 0 && parseInt(x.bitrate) < 192);

  return [
    { id: 'no-lead', title: 'No lead artist credit', why: 'The artist comes from the credits: the first credit with the role “Lead artist”. Old records only have it stored separately.',
      addLead: { label: 'Add lead credit from artist' },
      items: [
        ...lib.albums.filter((a) => !hasLead(a.credits ?? [])).map((a) => ({ kind: 'album' as const, id: a.id, label: `${a.title} · ${a.artistName}` })),
        ...lib.tracks.filter((x) => !hasLead(x.credits ?? [])).map((x) => t(x)),
      ] },
    { id: 'no-audio', title: 'Tracks without audio', why: 'They cannot be played. Tracks with a YouTube link can be downloaded from Settings.',
      items: lib.tracks.filter((x) => !x.file).map((x) => t(x, x.youtubeMusicUrl ? 'has a YouTube link' : 'no link either')) },
    { id: 'no-source', title: 'Tracks with no audio and no YouTube link', why: 'Nothing to download from. Add a link in the track editor.',
      items: lib.tracks.filter((x) => !x.file && !x.youtubeMusicUrl).map((x) => t(x)) },
    { id: 'no-youtube', title: 'Tracks without a YouTube Music link', why: 'The link is what lets the server download (or re-download) the audio.', bulk: 'youtubeMusicUrl',
      items: lib.tracks.filter((x) => !x.youtubeMusicUrl).map((x) => t(x, x.file ? 'has audio' : 'no audio')) },
    { id: 'no-spotify', title: 'Tracks without a Spotify link', why: 'Optional, but handy for opening the track elsewhere.', bulk: 'spotifyUrl',
      items: lib.tracks.filter((x) => !x.spotifyUrl).map((x) => t(x)) },
    { id: 'no-genius', title: 'Tracks without a Genius link', why: 'Optional: lyrics and annotations.', bulk: 'geniusUrl',
      items: lib.tracks.filter((x) => !x.geniusUrl).map((x) => t(x)) },
    { id: 'release-no-date', title: 'Releases without a date', why: 'Open the release and set its date.',
      items: lib.releases.filter((r) => !r.releaseDate).map((r) => ({ kind: 'release' as const, id: r.id, label: `${r.title} · ${lib.albumById.get(r.albumId)?.title ?? 'unknown album'}` })) },
    { id: 'album-no-genre', title: 'Albums without a genre', why: 'Tracks that follow the album take their genres from it.',
      items: lib.albums.filter((a) => !a.genres.length).map((a) => ({ kind: 'album' as const, id: a.id, label: `${a.title} · ${a.artistName}` })) },
    { id: 'no-genre', title: 'Tracks without a genre', why: 'They will not show up in genre filters or the genre stats.',
      items: lib.tracks.filter((x) => !x.allGenres.length).map((x) => t(x)) },
    { id: 'low-quality', title: 'Low bitrate tracks (under 192 kbps)', why: 'Worth replacing when a better source exists.',
      items: lowQuality.map((x) => t(x, x.bitrate ?? undefined)) },
    { id: 'duplicates', title: 'Possible duplicate tracks', why: 'Same title and artist more than once. Delete the extra, keep the one with the votes.',
      items: [...dupes.values()].filter((g) => g.length > 1).flatMap((g) => g.map((x) => t(x, `${x.comparisons} comparisons${x.file ? ', has audio' : ''}`))) },
    { id: 'album-no-cover', title: 'Albums without a cover', why: 'Open the album and choose an image.',
      items: lib.albums.filter((a) => !a.cover).map((a) => ({ kind: 'album' as const, id: a.id, label: `${a.title} · ${a.artistName}` })) },
    { id: 'album-empty', title: 'Albums with no tracks', why: 'Probably left over from deleting tracks.',
      items: lib.albums.filter((a) => !a.trackIds.length).map((a) => ({ kind: 'album' as const, id: a.id, label: `${a.title} · ${a.artistName}` })) },
    { id: 'artist-no-image', title: 'Artists without an image', why: 'Artist images were lost with the old uploads folder; add them again.',
      items: lib.artists.filter((a) => !a.image).map((a) => ({ kind: 'artist' as const, id: a.id, label: a.name })) },
    { id: 'artist-unused', title: 'Artists that are not used anywhere', why: 'Not credited on any track or album, not in a bio or note.',
      fix: { label: 'Delete these artists', table: 'artists' },
      items: lib.artists.filter((a) => !usedArtists.has(a.id)).map((a) => ({ kind: 'artist' as const, id: a.id, label: a.name })) },
    { id: 'genre-unused', title: 'Genres that no track or album uses', why: 'Safe to remove; they only clutter the suggestions.',
      fix: { label: 'Delete these genres', table: 'genres' },
      items: lib.genres.filter((g) => !usedGenres.has(g.name.toLowerCase())).map((g) => ({ kind: 'genre' as const, id: g.id, label: g.name })) },
    { id: 'role-unused', title: 'Credit roles that nothing uses', why: 'Checked against every track and album credit, so roles in use are never listed.',
      fix: { label: 'Delete these roles', table: 'roleCategories' },
      items: lib.roles.filter((r) => !usedRoles.has(r.name.toLowerCase())).map((r) => ({ kind: 'role' as const, id: r.id, label: r.name })) },
    { id: 'note-category-unused', title: 'Note categories with no notes', why: 'Categories you made that no note uses any more. Safe to remove.',
      fix: { label: 'Delete these categories', table: 'noteCategories' },
      items: lib.noteCategories.filter((c) => !lib.groups.some((g) => g.categoryId === c.id)).map((c) => ({ kind: 'noteCategory' as const, id: c.id, label: c.name })) },
  ];
}
