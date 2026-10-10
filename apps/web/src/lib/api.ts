import type { PullResponse, SyncRecord } from '@curator/core';
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
  acquire(trackIds?: string[]) { return this.req<{ queued: number }>('/api/acquire', { method: 'POST', body: JSON.stringify({ trackIds }) }); }
  acquireStatus() {
    return this.req<{ queued: number; running: number; done: number; failed: number; failures: { trackId: string; error: string }[] }>('/api/acquire');
  }
  /** `<audio src>` / `<img src>` cannot send headers, hence ?token= */
  fileUrl(hash: string) { return this.url(`/api/files/${hash}?token=${encodeURIComponent(this.s.token)}`); }
}
