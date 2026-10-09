import { useEffect, useState } from 'react';
import type { Api } from './api.ts';
import { getMeta, localDb, setMeta } from './idb.ts';
import { api, useStore } from './store.ts';

export async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Downscale to at most `max` px on the long side and re-encode as JPEG: covers do not need to be 4000 px. */
export async function prepareImage(file: Blob, max = 800): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = new OffscreenCanvas(Math.round(bmp.width * scale), Math.round(bmp.height * scale));
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.88 });
}

/**
 * Store an image on this device under its content hash and queue it for upload. The hash is what entities
 * reference, so the record can sync immediately; the bytes follow whenever the server is reachable.
 */
export async function saveImage(file: Blob): Promise<string> {
  const blob = await prepareImage(file);
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
