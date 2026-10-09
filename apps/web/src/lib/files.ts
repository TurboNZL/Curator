import { useEffect, useState } from 'react';
import type { Api } from './api.ts';
import { getMeta, localDb, setMeta } from './idb.ts';
import { coverCrop } from './image.ts';
import { sha256Sync } from './sha256.ts';
import { api, useStore } from './store.ts';

export async function sha256Hex(data: ArrayBuffer): Promise<string> {
  if (!globalThis.crypto?.subtle) return sha256Sync(new Uint8Array(data)); // insecure origin (plain http on the LAN)
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Downscale to at most `max` px on the long side and re-encode as JPEG: covers do not need to be 4000 px. */
export async function prepareImage(file: Blob, max = 800, trimBars = false): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  let src = { x: 0, y: 0, w: bmp.width, h: bmp.height };
  if (trimBars) { // e.g. a YouTube thumbnail: drop the black bars, keep the centre square
    const probe = new OffscreenCanvas(bmp.width, bmp.height);
    const pctx = probe.getContext('2d')!;
    pctx.drawImage(bmp, 0, 0);
    src = coverCrop(pctx.getImageData(0, 0, bmp.width, bmp.height).data, bmp.width, bmp.height);
  }
  const scale = Math.min(1, max / Math.max(src.w, src.h));
  const canvas = new OffscreenCanvas(Math.round(src.w * scale), Math.round(src.h * scale));
  canvas.getContext('2d')!.drawImage(bmp, src.x, src.y, src.w, src.h, 0, 0, canvas.width, canvas.height);
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.88 });
}

/**
 * Store an image on this device under its content hash and queue it for upload. The hash is what entities
 * reference, so the record can sync immediately; the bytes follow whenever the server is reachable.
 */
export async function saveImage(file: Blob, opts: { trimBars?: boolean } = {}): Promise<string> {
  const blob = await prepareImage(file, 800, opts.trimBars);
  const hash = await sha256Hex(await blob.arrayBuffer());
  const db = await localDb();
  await db.put('blobs', blob, hash);
  const pending = new Set(await getMeta<string[]>('pendingUploads', []));
  pending.add(hash);
  await setMeta('pendingUploads', [...pending]);
  useStore.getState().touchFiles();
  void useStore.getState().syncNow();
  return hash;
}

/** Upload everything queued; called at the start of each sync. Failures stay queued. */
export async function flushUploads(a: Api): Promise<void> {
  const pending = await getMeta<string[]>('pendingUploads', []);
  if (!pending.length) return;
  const db = await localDb();
  const left: string[] = [];
  for (const hash of pending) {
    const blob = await db.get('blobs', hash);
    if (!blob) continue;
    try { await a.putFile(hash, blob); } catch { left.push(hash); }
  }
  await setMeta('pendingUploads', left);
}

/** A displayable URL for a file hash: this device's copy if it has one, else the server's. */
export function useFileUrl(hash: string | null | undefined): string | null {
  const configured = useStore((s) => !!s.settings.token);
  const filesRev = useStore((s) => s.filesRev);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoke: string | null = null, live = true;
    setUrl(null);
    if (!hash) return;
    void localDb().then((db) => db.get('blobs', hash)).then((blob) => {
      if (!live) return;
      if (blob) setUrl((revoke = URL.createObjectURL(blob)));
      else if (configured) setUrl(api().fileUrl(hash));
    });
    return () => { live = false; if (revoke) URL.revokeObjectURL(revoke); };
  }, [hash, configured, filesRev]);
  return url;
}

/* ---------- offline audio ---------- */

export interface CacheEntry { size: number; at: number }
export class CacheLimitError extends Error { constructor() { super('Storage limit reached'); } }

export const cacheBytes = (c: Record<string, CacheEntry>) => Object.values(c).reduce((n, e) => n + e.size, 0);

/** Download one audio file to this device. Throws CacheLimitError rather than exceed the user's limit. */
export async function downloadAudio(hash: string): Promise<void> {
  const st = useStore.getState();
  if (st.audioCache[hash]) return;
  const res = await fetch(api().fileUrl(hash));
  if (!res.ok) throw new Error(`Server said ${res.status}`);
  const blob = await res.blob();
  if (cacheBytes(useStore.getState().audioCache) + blob.size > st.settings.storageLimitMb * 1024 * 1024) throw new CacheLimitError();
  const db = await localDb();
  await db.put('blobs', blob, hash);
  const next = { ...useStore.getState().audioCache, [hash]: { size: blob.size, at: Date.now() } };
  await setMeta('audioCache', next);
  useStore.setState({ audioCache: next });
}

export async function removeAudio(hashes: string[]): Promise<void> {
  const db = await localDb();
  const next = { ...useStore.getState().audioCache };
  for (const h of hashes) { if (next[h]) { await db.delete('blobs', h); delete next[h]; } }
  await setMeta('audioCache', next);
  useStore.setState({ audioCache: next });
}

/** URL to play `hash` from: the local copy when kept offline, otherwise streamed from the server. Caller revokes blob: URLs. */
export async function audioSource(hash: string): Promise<{ url: string; local: boolean }> {
  if (useStore.getState().audioCache[hash]) {
    const blob = await (await localDb()).get('blobs', hash);
    if (blob) return { url: URL.createObjectURL(blob), local: true };
  }
  return { url: api().fileUrl(hash), local: false };
}

export interface KeepProgress { running: boolean; done: number; total: number; message: string | null }

/** Copy a set of tracks' audio to this device, in order, stopping cleanly at the storage limit. */
export async function keepOffline(hashes: string[], set: (p: KeepProgress) => void): Promise<void> {
  const todo = hashes.filter((h) => !useStore.getState().audioCache[h]);
  set({ running: true, done: 0, total: todo.length, message: null });
  let done = 0;
  for (const h of todo) {
    try { await downloadAudio(h); } catch (e) {
      set({ running: false, done, total: todo.length, message: e instanceof CacheLimitError ? 'Stopped: storage limit reached. Raise it in Settings.' : 'Stopped: could not reach the server.' });
      return;
    }
    set({ running: true, done: ++done, total: todo.length, message: null });
  }
  set({ running: false, done, total: todo.length, message: null });
}
