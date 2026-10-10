import type { SyncRecord } from '@curator/core';
import { useStore } from './store.ts';
import { BACKUP_FORMAT } from './backupFormat.ts';

/** Everything in the library on this device as one JSON document (the same records the server's database holds). */
export function localBackup(): { name: string; blob: Blob; count: number } {
  const records: SyncRecord[] = [];
  for (const map of Object.values(useStore.getState().rows)) for (const r of map.values()) records.push(r);
  const body = JSON.stringify({ format: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(), records });
  return { name: `curator-database-${new Date().toISOString().slice(0, 10)}.json`, blob: new Blob([body], { type: 'application/json' }), count: records.length };
}

/** Save a Blob through the browser's download flow. */
export function saveBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
