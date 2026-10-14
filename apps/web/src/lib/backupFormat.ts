import { recordSchema, type SyncRecord } from '@turbomusic/core';
import { LEGACY_BACKUP_FORMATS } from './legacyNames.ts';

export const BACKUP_FORMAT = 'turbomusic-database';

/** Records from a backup made by localBackup(); anything that is not a valid record is counted and skipped. */
export function parseBackup(text: string): { records: SyncRecord[]; skipped: number } {
  let doc: unknown;
  try { doc = JSON.parse(text); } catch { throw new Error('That file is not valid JSON'); }
  const list = (doc as { format?: string; records?: unknown }).records;
  const format = (doc as { format?: string }).format ?? '';
  if ((format !== BACKUP_FORMAT && !LEGACY_BACKUP_FORMATS.includes(format)) || !Array.isArray(list)) throw new Error('That is not a TurboMusic database backup');
  const records: SyncRecord[] = [];
  let skipped = 0;
  for (const r of list) { const p = recordSchema.safeParse(r); if (p.success) records.push(p.data); else skipped++; }
  return { records, skipped };
}

