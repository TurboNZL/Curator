import type { PlaybackLogData, SyncRecord } from '@curator/core';

/** One entry of Spotify's "Extended streaming history" (Streaming_History_Audio_*.json). Only the fields used here. */
export interface SpotifyHistoryEntry {
  ts?: string; platform?: string | null; ms_played?: number; conn_country?: string | null;
  master_metadata_track_name?: string | null; master_metadata_album_artist_name?: string | null; master_metadata_album_album_name?: string | null;
  spotify_track_uri?: string | null; episode_name?: string | null; episode_show_name?: string | null; spotify_episode_uri?: string | null;
  audiobook_title?: string | null; reason_start?: string | null; reason_end?: string | null; shuffle?: boolean | null; skipped?: boolean | null;
  offline?: boolean | null; offline_timestamp?: number | null; incognito_mode?: boolean | null; ip_addr?: string | null; ip_addr_decrypted?: string | null;
}

const ID = /^[A-Za-z0-9]{22}$/;

/** The 22-character Spotify id in a track link (open.spotify.com/track/…, spotify:track:…, with or without ?si=…). */
export function spotifyTrackId(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = /(?:track[/:])([A-Za-z0-9]{22})(?![A-Za-z0-9])/.exec(s);
  return m && ID.test(m[1]) ? m[1] : null;
}

/** Pick `{type, id}` out of any Spotify link or URI (track, album, artist, playlist, episode, show). */
export function parseSpotifyLink(s: string): { type: 'track' | 'album' | 'artist' | 'playlist' | 'episode' | 'show'; id: string } | null {
  const m = /(?:spotify\.com\/(?:intl-[a-z]{2}\/)?|spotify:)(track|album|artist|playlist|episode|show)[/:]([A-Za-z0-9]{22})/.exec(s.split('?')[0].split('#')[0]);
  return m ? { type: m[1] as 'track', id: m[2] } : null;
}

export interface HistoryImport {
  records: SyncRecord[];
  /** entries in the files */
  total: number;
  /** podcasts and audiobooks: not music */
  notMusic: number;
  /** below the minimum length chosen */
  tooShort: number;
  /** earliest and latest play, ms */
  from: number | null; to: number | null;
}

/** The stable id of an imported play, so importing the same file twice (or an overlapping export) never duplicates it. */
export const historyId = (ts: number, uri: string) => `sp-${ts}-${uri.split(':').pop()}`.slice(0, 64);

/** Spotify's entries as library records (playbackLogs). Pure. `deviceId` is only the writer's name on the records. */
export function historyRecords(entries: SpotifyHistoryEntry[], deviceId: string, o: { minMs?: number; now?: number } = {}): HistoryImport {
  const minMs = o.minMs ?? 0, now = o.now ?? Date.now();
  const out = new Map<string, SyncRecord>();
  let notMusic = 0, tooShort = 0, from: number | null = null, to: number | null = null;
  for (const e of entries) {
    const uri = e.spotify_track_uri;
    const ts = e.ts ? Date.parse(e.ts) : NaN;
    if (!uri || !e.master_metadata_track_name || !Number.isFinite(ts)) { notMusic++; continue; }
    const ms = Math.max(0, Math.round(Number(e.ms_played) || 0));
    if (ms < minMs) { tooShort++; continue; }
    const id = historyId(ts, uri);
    const skipped = e.skipped === true || (e.reason_end === 'fwdbtn' && ms < 30_000);
    const data: PlaybackLogData = {
      trackId: '', timestamp: ts, duration: ms / 1000, sourceType: 'spotify', sourceId: null, isSkip: skipped,
      imported: 'spotify', name: e.master_metadata_track_name, artist: e.master_metadata_album_artist_name ?? '', album: e.master_metadata_album_album_name ?? '', uri,
      shuffle: e.shuffle ?? null, platform: e.platform ?? null, reasonStart: e.reason_start ?? null, reasonEnd: e.reason_end ?? null,
    };
    out.set(id, { table: 'playbackLogs', id, updatedAt: now, deviceId, deleted: false, data: data as unknown as Record<string, unknown> });
    from = from === null ? ts : Math.min(from, ts); to = to === null ? ts : Math.max(to, ts);
  }
  return { records: [...out.values()], total: entries.length, notMusic, tooShort, from, to };
}

/** What a play looks like for the exporter. */
export interface ExportPlay {
  ts: number; ms: number; title: string; artist: string; album: string; uri: string | null; skipped: boolean;
  shuffle: boolean | null; platform: string | null; reasonStart: string | null; reasonEnd: string | null;
}

/**
 * Spotify's own file format, so the plays can be uploaded to stats.fm (or any tool that reads Spotify exports) as if they came from
 * Spotify. Plays with no Spotify track link cannot be matched by those tools and are left out (counted in `dropped`). No IP
 * address or other private fields are written.
 */
export function exportSpotifyFormat(plays: ExportPlay[]): { entries: SpotifyHistoryEntry[]; dropped: number } {
  const entries: SpotifyHistoryEntry[] = [];
  let dropped = 0;
  for (const p of [...plays].sort((a, b) => a.ts - b.ts)) {
    if (!p.uri || !p.uri.startsWith('spotify:track:')) { dropped++; continue; }
    entries.push({
      ts: new Date(p.ts).toISOString().replace(/\.\d{3}Z$/, 'Z'), platform: p.platform ?? 'Curator', ms_played: Math.round(p.ms), conn_country: null, ip_addr: null,
      master_metadata_track_name: p.title, master_metadata_album_artist_name: p.artist, master_metadata_album_album_name: p.album || null,
      spotify_track_uri: p.uri, episode_name: null, episode_show_name: null, spotify_episode_uri: null,
      reason_start: p.reasonStart ?? 'trackdone', reason_end: p.reasonEnd ?? (p.skipped ? 'fwdbtn' : 'trackdone'),
      shuffle: p.shuffle ?? false, skipped: p.skipped, offline: false, offline_timestamp: 0, incognito_mode: false,
    });
  }
  return { entries, dropped };
}

/** Spotify splits big exports into several files of up to 10,000 entries. */
export const exportFileName = (i: number, year = new Date().getFullYear()) => `Streaming_History_Audio_${year}_${i}.json`;
export const chunkEntries = <T,>(a: T[], size = 10000): T[][] => Array.from({ length: Math.ceil(a.length / size) }, (_, i) => a.slice(i * size, (i + 1) * size));
