import type { EraData } from '@turbomusic/core';
import type { Library } from './library.ts';

type Field = 'albumIds' | 'trackIds';

/**
 * Eras are collections, so putting an album (or a single) in eras means editing the eras' lists. Returns what to patch
 * so that exactly `desired` eras contain the item: nothing for eras that already agree.
 */
export function eraPatches(lib: Library, type: 'album' | 'track', id: string, desired: string[]): { id: string; patch: Pick<EraData, Field> | { albumIds: string[] } | { trackIds: string[] } }[] {
  const field: Field = type === 'album' ? 'albumIds' : 'trackIds';
  const out: { id: string; patch: { albumIds: string[] } | { trackIds: string[] } }[] = [];
  for (const era of lib.eras) {
    const has = era[field].includes(id), want = desired.includes(era.id);
    if (has === want) continue;
    out.push({ id: era.id, patch: { [field]: want ? [...era[field], id] : era[field].filter((x) => x !== id) } as never });
  }
  return out;
}
