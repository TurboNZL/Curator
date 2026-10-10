import { existsSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import type {
  SyncRecord, RecordTable, Credit, ArtistData, AlbumData, ReleaseData, TrackData, PlaylistData,
  GroupData, NoteData, GenreData, RoleCategoryData, TimelineData, VoteData, PlaybackLogData, ProfileData,
} from '@curator/core';
import type { Store } from './db.ts';
import { ingestFile } from './files.ts';

const { DatabaseSync } = process.getBuiltinModule('node:sqlite');

type Row = Record<string, any>;

export interface MigrationReport {
  counts: Record<string, number>;
  /** legacy rows dropped because they pointed at things that no longer exist */
  dropped: Record<string, number>;
  /** artists created because a legacy column held a name with no artist record */
  createdArtists: string[];
  /** files referenced by the DB that could not be found under the legacy public dir */
  missingFiles: string[];
  files: { ingested: number; bytes: number };
}

export interface MigrateOptions {
  legacyDb: string;
  /** the legacy app's `public/` directory (contains uploads/music, uploads/images). Optional: without it, no files are copied. */
  publicDir?: string;
  store: Store;
  dataDir: string;
  now?: number;
}

const MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.flac': 'audio/flac', '.ogg': 'audio/ogg', '.opus': 'audio/ogg',
  '.wav': 'audio/wav', '.aac': 'audio/aac',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
};
export const mimeFor = (path: string) => MIME[extname(path).toLowerCase()] ?? 'application/octet-stream';

/**
 * The legacy app JSON.stringify'd values in the client AND again on the server, so a column can hold
 * an array, a string holding an array, or a string holding a string holding an array - and rows
 * written at different times hold different depths. Unwrap until it stops being a string.
 */
export function unwrapJson<T>(value: unknown, fallback: T): T {
  let v: unknown = value;
  for (let i = 0; i < 5 && typeof v === 'string'; i++) {
    try { v = JSON.parse(v); } catch { return fallback; }
  }
  if (v === null || v === undefined || typeof v === 'string') return fallback;
  if (Array.isArray(fallback) !== Array.isArray(v)) return fallback;
  return v as T;
}

const seconds = (n: unknown) => (typeof n === 'number' ? Math.round(n * 1000) : 0);
const str = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v : null);

function cleanCredits(v: unknown): Credit[] {
  return unwrapJson<unknown[]>(v, [])
    .filter((c): c is Row => !!c && typeof c === 'object' && typeof (c as Row).artistId === 'string')
    .map((c) => ({
      artistId: c.artistId as string,
      role: (Array.isArray(c.role) ? c.role : typeof c.role === 'string' ? [c.role] : []).filter((r: unknown) => typeof r === 'string'),
    }));
}

export async function migrateLegacy(opts: MigrateOptions): Promise<MigrationReport> {
  const now = opts.now ?? Date.now();
  const db = new DatabaseSync(opts.legacyDb, { readOnly: true });
  const all = (sql: string): Row[] => db.prepare(sql).all() as Row[];
  const tableExists = (name: string) => !!db.prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name=?`).get(name);
  const rows = (name: string) => (tableExists(name) ? all(`SELECT * FROM "${name}"`) : []);

  const report: MigrationReport = { counts: {}, dropped: {}, createdArtists: [], missingFiles: [], files: { ingested: 0, bytes: 0 } };
  const out: SyncRecord[] = [];
  const emit = <T extends object>(table: RecordTable, id: string, data: T, updatedAt = now) => {
    out.push({ table, id, updatedAt, deviceId: 'migration', deleted: false, data: data as Record<string, unknown> });
    report.counts[table] = (report.counts[table] ?? 0) + 1;
  };
  const drop = (what: string, n = 1) => { report.dropped[what] = (report.dropped[what] ?? 0) + n; };

  // ---- files: legacy server-relative path -> content hash ----
  const fileCache = new Map<string, string | null>();
  const fileRef = async (path: unknown): Promise<string | null> => {
    const p = str(path);
    if (!p) return null;
    if (fileCache.has(p)) return fileCache.get(p)!;
    let hash: string | null = null;
    if (opts.publicDir) {
      const full = normalize(join(opts.publicDir, p));
      const root = normalize(opts.publicDir) + sep;
      if (full.startsWith(root) && existsSync(full)) { // refuse paths that escape the public dir
        const r = await ingestFile(opts.dataDir, full);
        opts.store.addFile(r.hash, r.size, mimeFor(full));
        hash = r.hash;
        report.files.ingested++; report.files.bytes += r.size;
      } else report.missingFiles.push(p);
    }
    fileCache.set(p, hash);
    return hash;
  };

  // ---- artists ----
  const artists = rows('artists');
  const artistIds = new Set(artists.map((a) => a.id as string));
  const artistByName = new Map(artists.map((a) => [a.name as string, a.id as string]));
  for (const a of artists) emit<ArtistData>('artists', a.id, { name: a.name, image: await fileRef(a.image) });

  /** legacy columns sometimes hold a name instead of an id; resolve, or create the missing artist */
  const resolveArtist = (ref: string): string => {
    if (artistIds.has(ref)) return ref;
    const byName = artistByName.get(ref);
    if (byName) return byName;
    const id = `legacy-${Buffer.from(ref).toString('base64url').slice(0, 16)}`;
    artistIds.add(id); artistByName.set(ref, id);
    report.createdArtists.push(ref);
    emit<ArtistData>('artists', id, { name: ref, image: null });
    return id;
  };

  // ---- tracks (collect first; albums reference them) ----
  const trackRows = rows('tracks');
  const trackIds = new Set(trackRows.map((t) => t.id as string));

  const albumLinks = new Map<string, { albumId: string; order: number }[]>();
  const albumIds = new Set(rows('albums').map((a) => a.id as string));
  for (const l of rows('album_tracks')) {
    if (!trackIds.has(l.track_id) || !albumIds.has(l.album_id)) { drop('album_tracks (dangling)'); continue; }
    (albumLinks.get(l.track_id) ?? albumLinks.set(l.track_id, []).get(l.track_id)!).push({ albumId: l.album_id, order: l.order ?? 0 });
  }

  const genreName = new Map(rows('genres').map((g) => [g.id as string, g.name as string]));
  const trackGenres = new Map<string, string[]>();
  for (const tg of rows('track_genres')) {
    const name = genreName.get(tg.genre_id);
    if (!name || !trackIds.has(tg.track_id)) { drop('track_genres (dangling)'); continue; }
    (trackGenres.get(tg.track_id) ?? trackGenres.set(tg.track_id, []).get(tg.track_id)!).push(name);
  }

  for (const t of trackRows) {
    // legacy `artist_ids` mirrors the primary artist on most rows; anything else is a featured artist that
    // the old API silently ignored, so keep it as a credit (ids or bare names both occur)
    const credits = cleanCredits(t.artist_credits);
    for (const ref of unwrapJson<string[]>(t.artist_ids, [])) {
      const id = resolveArtist(ref);
      if (id !== t.artist_id && !credits.some((c) => c.artistId === id)) credits.push({ artistId: id, role: ['Lead artist'] });
    }
    emit<TrackData>('tracks', t.id, {
      title: t.title,
      artistId: t.artist_id,
      credits,
      genres: [...new Set([...unwrapJson<string[]>(t.genres, []), ...(trackGenres.get(t.id) ?? [])])],
      albums: (albumLinks.get(t.id) ?? []).sort((a, b) => a.order - b.order),
      file: await fileRef(t.local_file_path),
      initialRating: typeof t.initial_rating === 'number' && t.initial_rating > 0 ? t.initial_rating : null,
      spotifyUrl: str(t.spotify_url), geniusUrl: str(t.genius_url), youtubeMusicUrl: str(t.youtube_music_url),
      bitrate: str(t.bitrate), bpm: t.bpm ?? null, key: str(t.key),
      memories: t.memories ?? 0,
      syncWithAlbumCredits: !!t.sync_with_album_credits,
      queueRules: unwrapJson<Record<string, unknown>>(t.queue_rules, {}),
    });
  }

  // ---- albums ----
  for (const a of rows('albums')) {
    const covers = unwrapJson<string[]>(a.covers, []);
    // legacy `artist_ids` held extra artist refs (ids or names); fold any not already credited into credits
    const credits = cleanCredits(a.artist_credits);
    for (const ref of unwrapJson<string[]>(a.artist_ids, [])) {
      const id = resolveArtist(ref);
      if (id !== a.artist_id && !credits.some((c) => c.artistId === id)) credits.push({ artistId: id, role: ['Lead artist'] });
    }
    emit<AlbumData>('albums', a.id, {
      title: a.title, artistId: a.artist_id, credits,
      genres: unwrapJson<string[]>(a.genres, []),
      cover: await fileRef(str(a.primary_cover) ?? covers[0]),
      eraId: a.era_id ?? null, defaultReleaseId: a.default_release_id ?? null,
    });
  }

  // ---- releases ----
  const releaseIds = new Set(rows('releases').map((r) => r.id as string));
  const releaseTracks = new Map<string, { id: string; order: number }[]>();
  for (const l of rows('release_tracks')) {
    if (!trackIds.has(l.track_id) || !releaseIds.has(l.release_id)) { drop('release_tracks (dangling)'); continue; }
    (releaseTracks.get(l.release_id) ?? releaseTracks.set(l.release_id, []).get(l.release_id)!).push({ id: l.track_id, order: l.order ?? 0 });
  }
  for (const r of rows('releases')) {
    if (!albumIds.has(r.album_id)) { drop('releases (no album)'); continue; }
    emit<ReleaseData>('releases', r.id, {
      albumId: r.album_id, title: r.title, cover: await fileRef(r.cover_image), releaseDate: str(r.release_date),
      trackIds: (releaseTracks.get(r.id) ?? []).sort((a, b) => a.order - b.order).map((x) => x.id),
    });
  }

  // ---- playlists ----
  const plTracks = new Map<string, { id: string; order: number }[]>();
  for (const l of rows('playlist_tracks')) {
    if (!trackIds.has(l.track_id)) { drop('playlist_tracks (dangling)'); continue; }
    (plTracks.get(l.playlist_id) ?? plTracks.set(l.playlist_id, []).get(l.playlist_id)!).push({ id: l.track_id, order: l.order ?? 0 });
  }
  for (const p of rows('playlists')) {
    emit<PlaylistData>('playlists', p.id, {
      name: p.name, description: str(p.description), cover: await fileRef(p.cover_image),
      createdAt: seconds(p.created_at),
      trackIds: (plTracks.get(p.id) ?? []).sort((a, b) => a.order - b.order).map((x) => x.id),
    });
  }

  // ---- groups ("relational bios") ----
  const entityExists = (type: string, id: string) =>
    type === 'artist' ? artistIds.has(id) : type === 'album' ? albumIds.has(id) : type === 'track' ? trackIds.has(id) : releaseIds.has(id);
  const members = new Map<string, GroupData['members']>();
  for (const m of rows('group_members')) {
    if (!entityExists(m.entity_type, m.entity_id)) { drop('group_members (dangling)'); continue; }
    (members.get(m.group_id) ?? members.set(m.group_id, []).get(m.group_id)!).push({
      entityType: m.entity_type, entityId: m.entity_id, showOnEntityPage: !!m.show_on_entity_page,
    });
  }
  for (const g of rows('groups')) {
    emit<GroupData>('groups', g.id, {
      name: g.name, description: str(g.description), label: str(g.label), type: g.type ?? 'relationship',
      members: members.get(g.id) ?? [],
    });
  }

  // ---- small tables ----
  for (const n of rows('notes')) {
    emit<NoteData>('notes', n.id, {
      entityType: n.entity_type, entityId: n.entity_id, label: n.label ?? '', content: n.content ?? '',
      isLinked: !!n.is_linked, createdAt: seconds(n.created_at),
    }, seconds(n.created_at) || now);
  }
  for (const g of rows('genres')) emit<GenreData>('genres', g.id, { name: g.name });
  for (const r of rows('role_categories')) emit<RoleCategoryData>('roleCategories', r.id, { name: r.name, isRemovable: !!r.is_removable });
  for (const t of rows('timeline')) {
    emit<TimelineData>('timeline', t.id, {
      type: t.type, title: t.title, description: t.description ?? '', entityId: t.entity_id ?? null, timestamp: seconds(t.timestamp),
    }, seconds(t.timestamp));
  }
  for (const p of rows('profiles')) {
    emit<ProfileData>('profiles', p.id, {
      name: p.name, theme: p.theme ?? 'dark', accentColor: p.accent_color ?? '#3b82f6', playbackMode: p.playback_mode ?? 'local',
      settings: unwrapJson<Record<string, unknown>>(p.settings, {}),
      playbackRules: unwrapJson(p.playback_rules, []),
    });
  }

  // ---- the logs. Votes are kept in full (even against deleted tracks): replaying them reproduces the stored Elo exactly. ----
  for (const v of rows('votes')) {
    emit<VoteData>('votes', v.id, {
      trackAId: v.track_a_id, trackBId: v.track_b_id,
      winnerId: v.is_equal ? null : v.winner_id ?? null, isEqual: !!v.is_equal, timestamp: seconds(v.timestamp),
    }, seconds(v.timestamp));
  }
  for (const l of rows('playback_logs')) {
    if (!trackIds.has(l.track_id)) { drop('playback_logs (deleted track)'); continue; }
    emit<PlaybackLogData>('playbackLogs', l.id, {
      trackId: l.track_id, timestamp: seconds(l.timestamp), duration: l.duration ?? null,
      sourceType: str(l.source_type), sourceId: str(l.source_id), isSkip: !!l.is_skip,
    }, seconds(l.timestamp));
  }

  db.close();
  for (let i = 0; i < out.length; i += 2000) opts.store.push(out.slice(i, i + 2000));
  return report;
}
