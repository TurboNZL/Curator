import type { Command, PlaybackSnapshot, PullResponse, SyncRecord } from '@curator/core';
import type { DeviceSettings } from './settings.ts';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export interface ServerStatus {
  apiVersion: number; cursor: number;
  files: { count: number; bytes: number };
  disk: { free: number; total: number } | Record<string, number>;
  /** versions of the programs YouTube import needs, null when the server cannot run them */
  tools?: { ytdlp: string | null; ffmpeg: string | null; /** a cookies file is configured for yt-dlp */ cookies?: boolean };
}

/** "Update server": the server pulls the newest code, rebuilds the web client and restarts itself (only on a service install of the checkout). */
export interface ServerUpdate {
  available: boolean; restarts: boolean;
  status: 'idle' | 'running' | 'done' | 'error'; log: string[]; restarting: boolean;
}

export interface ImportPreview {
  title: string; artist: string; thumbnail: string | null;
  /** every cover candidate, best first */
  thumbnails?: string[];
  entries: { id: string; title: string; rawTitle: string; url: string; duration: number | null }[];
}

export class Api {
  constructor(private s: Pick<DeviceSettings, 'serverUrl' | 'token'>) {}

  private url(path: string) { return `${this.s.serverUrl.replace(/\/+$/, '')}${path}`; }

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(this.url(path), {
      ...init,
      headers: { Authorization: `Bearer ${this.s.token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    });
    if (!res.ok) {
      const detail = res.status === 401 ? 'Wrong token' : ((await res.json().catch(() => null)) as { error?: string } | null)?.error;
      throw new ApiError(res.status, detail ?? `Server said ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  health() { return fetch(this.url('/api/health')).then((r) => (r.ok ? r.json() : Promise.reject(new ApiError(r.status, 'No server')))); }
  status() { return this.req<ServerStatus>('/api/status'); }
  updateInfo() { return this.req<ServerUpdate>('/api/admin/update'); }
  startUpdate() { return this.req<{ ok: true }>('/api/admin/update', { method: 'POST' }); }
  pull(since: number, limit = 1000) { return this.req<PullResponse>(`/api/sync/pull?since=${since}&limit=${limit}`); }
  push(records: SyncRecord[]) {
    return this.req<{ applied: number; cursor: number }>('/api/sync/push', { method: 'POST', body: JSON.stringify({ records }) });
  }
  async putFile(hash: string, blob: Blob) {
    const res = await fetch(this.url(`/api/files/${hash}`), { method: 'PUT', headers: { Authorization: `Bearer ${this.s.token}`, 'Content-Type': blob.type || 'application/octet-stream' }, body: blob });
    if (!res.ok) throw new ApiError(res.status, `Upload failed (${res.status})`);
  }
  importPreview(url: string) {
    return this.req<ImportPreview>('/api/import/preview', { method: 'POST', body: JSON.stringify({ url }) });
  }
  /** the server tries the links in order and keeps the first image that downloads */
  importCover(urls: string | string[]) { return this.req<{ hash: string; url: string }>('/api/import/cover', { method: 'POST', body: JSON.stringify(Array.isArray(urls) ? { urls } : { url: urls }) }); }
  analyzeAudio(hash: string) { return this.req<{ codec: string; kbps: number; sampleRate: number; durationSec: number; cutoffHz: number; looksLike: number; verdict: 'ok' | 'transcode' | 'unknown' }>('/api/audio/analyze', { method: 'POST', body: JSON.stringify({ hash }) }); }
  // ---- Spotify (server/src/spotify.ts) and YouTube matching (match.ts) ----
  spotifyStatus() { return this.req<{ clientId: string; redirectUri: string; signedIn: boolean; configured: boolean }>('/api/spotify/status'); }
  spotifyConfig(clientId: string, redirectUri?: string) { return this.req<{ clientId: string; redirectUri: string; signedIn: boolean; configured: boolean }>('/api/spotify/config', { method: 'POST', body: JSON.stringify({ clientId, redirectUri }) }); }
  spotifyAuthUrl() { return this.req<{ url: string }>('/api/spotify/auth-url'); }
  spotifyExchange(url: string) { return this.req<{ signedIn: boolean }>('/api/spotify/exchange', { method: 'POST', body: JSON.stringify({ url }) }); }
  spotifySignOut() { return this.req<{ signedIn: boolean }>('/api/spotify/signout', { method: 'POST' }); }
  spotifyPlaylists() { return this.req<{ playlists: { id: string; name: string; tracks: number | null; owner: string; cover: string | null; mine: boolean }[] }>('/api/spotify/playlists'); }
  spotifyPlaylist(id: string) { return this.req<SpotifyList>(`/api/spotify/playlist/${id}`); }
  spotifyResolve(url: string) { return this.req<SpotifyList>('/api/spotify/resolve', { method: 'POST', body: JSON.stringify({ url }) }); }
  spotifyCover(uri: string) { return this.req<{ hash: string; url: string }>('/api/spotify/cover', { method: 'POST', body: JSON.stringify({ uri }) }); }
  match(tracks: MatchTrackReq[], methods: ('odesli' | 'search')[]) { return this.req<{ results: MatchResultRes[] }>('/api/match', { method: 'POST', body: JSON.stringify({ tracks, methods }) }); }
  spotifyDevices() { return this.req<{ devices: SpotifyDeviceInfo[] }>('/api/spotify/player/devices'); }
  spotifyPlayerState() { return this.req<{ state: SpotifyPlayerInfo | null }>('/api/spotify/player/state'); }
  spotifyPlay(uris: string[], deviceId: string, positionMs = 0) { return this.req<{ ok: true }>('/api/spotify/player/play', { method: 'POST', body: JSON.stringify({ uris, deviceId, positionMs }) }); }
  spotifyCommand(type: 'pause' | 'resume' | 'next' | 'previous' | 'seek' | 'volume' | 'shuffle' | 'queue' | 'transfer', deviceId: string, value?: number | boolean | string) { return this.req<{ ok: true }>('/api/spotify/player/command', { method: 'POST', body: JSON.stringify({ type, deviceId, value }) }); }
  spotifySearch(q: string) { return this.req<{ tracks: SpotifyImportTrack[] }>(`/api/spotify/search?q=${encodeURIComponent(q)}`); }
  similarArtists(artist: string) { return this.req<{ artists: { name: string; mbid: string; score: number }[] }>(`/api/recommend/similar?artist=${encodeURIComponent(artist)}`); }
  acquire(trackIds?: string[]) { return this.req<{ queued: number }>('/api/acquire', { method: 'POST', body: JSON.stringify({ trackIds }) }); }
  acquireStatus() {
    return this.req<{ queued: number; running: number; done: number; failed: number; failures: { trackId: string; error: string }[] }>('/api/acquire');
  }
  /** direct download links (the browser saves them to disk without holding them in memory) */
  exportUrl(what: 'database' | 'files') { return this.url(`/api/export/${what}?token=${encodeURIComponent(this.s.token)}`); }
  importDatabase(file: Blob, mode: 'merge' | 'replace') {
    return this.req<{ mode: string; read?: number; applied?: number; written?: number; removed?: number }>(`/api/import/database?mode=${mode}`, { method: 'POST', body: file, headers: { 'Content-Type': 'application/octet-stream' } });
  }
  importFiles(file: Blob) {
    return this.req<{ added: number; existed: number; corrupt: number; ignored: number; bytes: number }>('/api/import/files', { method: 'POST', body: file, headers: { 'Content-Type': 'application/x-tar' } });
  }
  /** Connect: an event stream per device (EventSource cannot send headers, hence ?token=) */
  connectStreamUrl(device: string, name: string, kind: string) {
    return this.url(`/api/connect/stream?device=${encodeURIComponent(device)}&name=${encodeURIComponent(name)}&kind=${kind}&token=${encodeURIComponent(this.s.token)}`);
  }
  connectState(device: string, name: string, state: PlaybackSnapshot | null) { return this.req<{ ok: true }>('/api/connect/state', { method: 'POST', body: JSON.stringify({ device, name, state }) }); }
  connectCommand(from: string, to: string, command: Command) { return this.req<{ ok: true }>('/api/connect/command', { method: 'POST', body: JSON.stringify({ from, to, command }) }); }
  /** `<audio src>` / `<img src>` cannot send headers, hence ?token= */
  fileUrl(hash: string) { return this.url(`/api/files/${hash}?token=${encodeURIComponent(this.s.token)}`); }
}

export interface SpotifyImportTrack { uri: string; id: string; title: string; artists: string[]; album: string; albumUri: string | null; albumArtist: string | null; durationMs: number | null; cover: string | null; releaseDate: string | null; trackNumber: number | null; isrc: string | null }
export interface SpotifyList { kind: 'playlist' | 'album' | 'track'; name: string; description: string | null; cover: string | null; owner: string | null; tracks: SpotifyImportTrack[]; source: 'embed' | 'api' | 'oembed' | 'file'; note?: string }
export interface MatchTrackReq { id: string; title: string; artist: string; album?: string; durationMs?: number | null; spotifyUrl?: string | null }
export interface MatchCandidate { url: string; title: string; channel: string; seconds: number | null; score: number; method: 'odesli' | 'search' }
export interface MatchResultRes { id: string; candidates: MatchCandidate[]; error?: string }

export interface SpotifyDeviceInfo { id: string; name: string; type: string; active: boolean; volume: number | null }
export interface SpotifyPlayerInfo { playing: boolean; progressMs: number; shuffle: boolean; device: { id: string; name: string; volume: number | null }; track: { uri: string; id: string; title: string; artists: string[]; album: string; cover: string | null; durationMs: number } | null }
