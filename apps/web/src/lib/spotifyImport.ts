import type { SpotifyImportTrack, SpotifyList } from './api.ts';
import type { Library } from './library.ts';
import { trackMatcher } from './listens.ts';

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** Spotify's own "Account data" download: Playlist1.json (playlists) and YourLibrary.json (liked songs). Pure, defensive about missing fields. */
export function parseAccountData(json: unknown): SpotifyList[] {
  const out: SpotifyList[] = [];
  const j = json as { playlists?: unknown[]; tracks?: unknown[] } | null;
  const idOf = (uri: unknown) => (typeof uri === 'string' ? /spotify:track:([A-Za-z0-9]{22})/.exec(uri)?.[1] ?? null : null);
  for (const p of Array.isArray(j?.playlists) ? j!.playlists : []) {
    const pl = p as { name?: string; description?: string | null; items?: { track?: { trackName?: string; artistName?: string; albumName?: string; trackUri?: string } | null }[] };
    const tracks: SpotifyImportTrack[] = [];
    for (const it of pl.items ?? []) {
      const t = it?.track; const id = idOf(t?.trackUri);
      if (!t || !id || !t.trackName) continue;
      tracks.push({ uri: `spotify:track:${id}`, id, title: t.trackName, artists: t.artistName ? [t.artistName] : [], album: t.albumName ?? '', albumUri: null, albumArtist: t.artistName ?? null, durationMs: null, cover: null, releaseDate: null, trackNumber: null, isrc: null });
    }
    out.push({ kind: 'playlist', name: pl.name || 'Untitled playlist', description: pl.description || null, cover: null, owner: null, tracks, source: 'file' });
  }
  if (Array.isArray(j?.tracks)) {
    const tracks: SpotifyImportTrack[] = [];
    for (const t of j!.tracks as { artist?: string; album?: string; track?: string; uri?: string }[]) {
      const id = idOf(t?.uri);
      if (!id || !t.track) continue;
      tracks.push({ uri: `spotify:track:${id}`, id, title: t.track, artists: t.artist ? [t.artist] : [], album: t.album ?? '', albumUri: null, albumArtist: t.artist ?? null, durationMs: null, cover: null, releaseDate: null, trackNumber: null, isrc: null });
    }
    out.push({ kind: 'playlist', name: 'Liked Songs', description: 'Imported from Spotify', cover: null, owner: null, tracks, source: 'file' });
  }
  return out.filter((l) => l.tracks.length);
}

/** One line per track: "Artist - Title" (also "Title - Artist" is NOT guessed). Blank lines and "#" comments are skipped. */
export function parseTextList(text: string): SpotifyImportTrack[] {
  const out: SpotifyImportTrack[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const m = /^(.+?)\s+[-–—]\s+(.+)$/.exec(line);
    if (!m) return;
    out.push({ uri: `text:${i}`, id: `text${i}`, title: m[2].trim(), artists: [m[1].trim()], album: '', albumUri: null, albumArtist: m[1].trim(), durationMs: null, cover: null, releaseDate: null, trackNumber: null, isrc: null });
  });
  return out;
}

export interface PlannedTrack { src: SpotifyImportTrack; existingTrackId: string | null; albumKey: string }
export interface PlannedAlbum {
  key: string; title: string; artist: string;
  /** an album already in the library with this title and artist: the tracks join it instead of making a new one */
  existingAlbumId: string | null;
  cover: string | null; releaseDate: string | null; albumUri: string | null;
  /** where the album name came from: 'spotify' (the source said), 'history' (found in your imported Spotify history), 'title' (nothing known: named after the track) */
  nameFrom: 'spotify' | 'history' | 'title';
  tracks: PlannedTrack[];
}
export interface ImportPlan { name: string; description: string | null; cover: string | null; albums: PlannedAlbum[]; tracks: PlannedTrack[]; reused: number }

/**
 * What importing a list would do. Tracks already in the library (by Spotify link, then title and artist) are reused, never duplicated.
 * The rest are grouped by album (Spotify's album name and album artist). When the source does not say which album a track is on (a public
 * playlist page), the listening history imported from Spotify is asked; failing that the album is named after the track, to be completed
 * later with a YouTube album link. Pure; tested.
 */
export function planImport(lib: Library, list: SpotifyList): ImportPlan {
  const match = trackMatcher(lib);
  const history = new Map<string, { album: string; artist: string }>();
  for (const l of lib.logs) if (l.imported === 'spotify' && l.uri && l.album) history.set(l.uri, { album: l.album, artist: l.artist ?? '' });
  const albumByKey = new Map(lib.albums.map((a) => [`${norm(a.title)}|${norm(a.leads[0]?.name ?? a.artistName)}`, a.id]));
  const albums = new Map<string, PlannedAlbum>();
  const tracks: PlannedTrack[] = [];
  let reused = 0;
  for (const src of list.tracks) {
    const existing = match(src.uri, src.title, src.artists[0] ?? '');
    const h = history.get(src.uri);
    const title = src.album || h?.album || src.title;
    const artist = src.albumArtist || h?.artist || src.artists[0] || 'Unknown artist';
    const key = `${norm(title)}|${norm(artist)}`;
    const planned: PlannedTrack = { src, existingTrackId: existing, albumKey: key };
    tracks.push(planned);
    if (existing) { reused++; continue; }
    const a = albums.get(key) ?? { key, title, artist, existingAlbumId: albumByKey.get(key) ?? null, cover: src.cover, releaseDate: src.releaseDate, albumUri: src.albumUri, nameFrom: src.album ? 'spotify' : h?.album ? 'history' : 'title', tracks: [] } satisfies PlannedAlbum;
    a.tracks.push(planned);
    if (!a.cover && src.cover) a.cover = src.cover;
    albums.set(key, a);
  }
  return { name: list.name, description: list.description, cover: list.cover, albums: [...albums.values()], tracks, reused };
}
