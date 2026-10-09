import type { PullResponse, SyncRecord } from '@curator/core';
import type { DeviceSettings } from './settings.ts';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export interface ServerStatus {
  apiVersion: number; cursor: number;
  files: { count: number; bytes: number };
  disk: { free: number; total: number } | Record<string, number>;
}

export class Api {
  constructor(private s: Pick<DeviceSettings, 'serverUrl' | 'token'>) {}

  private url(path: string) { return `${this.s.serverUrl.replace(/\/+$/, '')}${path}`; }

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(this.url(path), {
      ...init,
      headers: { Authorization: `Bearer ${this.s.token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    });
    if (!res.ok) throw new ApiError(res.status, res.status === 401 ? 'Wrong token' : `Server said ${res.status}`);
    return res.json() as Promise<T>;
  }

  health() { return fetch(this.url('/api/health')).then((r) => (r.ok ? r.json() : Promise.reject(new ApiError(r.status, 'No server')))); }
  status() { return this.req<ServerStatus>('/api/status'); }
  pull(since: number, limit = 1000) { return this.req<PullResponse>(`/api/sync/pull?since=${since}&limit=${limit}`); }
  push(records: SyncRecord[]) {
    return this.req<{ applied: number; cursor: number }>('/api/sync/push', { method: 'POST', body: JSON.stringify({ records }) });
  }
  acquire(trackIds?: string[]) { return this.req<{ queued: number }>('/api/acquire', { method: 'POST', body: JSON.stringify({ trackIds }) }); }
  acquireStatus() {
    return this.req<{ queued: number; running: number; done: number; failed: number; failures: { trackId: string; error: string }[] }>('/api/acquire');
  }
  /** `<audio src>` / `<img src>` cannot send headers, hence ?token= */
  fileUrl(hash: string) { return this.url(`/api/files/${hash}?token=${encodeURIComponent(this.s.token)}`); }
}
