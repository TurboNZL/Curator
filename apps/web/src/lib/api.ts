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
