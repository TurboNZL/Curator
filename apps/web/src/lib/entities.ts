import type { GroupMemberData } from '@curator/core';
import type { Library } from './library.ts';

export type EntityType = GroupMemberData['entityType'];

export interface EntityRef { type: EntityType; id: string; label: string; to: string | null }

/** Resolve a bio/note member to something displayable and linkable (tracks link to their album, releases have no page). */
export function resolveEntity(lib: Library, type: EntityType | string, id: string): EntityRef | null {
  const found = (r: EntityRef | undefined) => r ?? null;
  if (type === 'artist') { const a = lib.artistById.get(id); return found(a && { type, id, label: a.name, to: `/artists/${id}` }); }
  if (type === 'album') { const a = lib.albumById.get(id); return found(a && { type, id, label: a.title, to: `/albums/${id}` }); }
  if (type === 'track') { const t = lib.trackById.get(id); return found(t && { type, id, label: `${t.title} · ${t.artistName}`, to: t.albumId ? `/albums/${t.albumId}` : null }); }
  if (type === 'era') { const e = lib.eraById.get(id); return found(e && { type, id, label: e.name, to: `/eras/${id}` }); }
  if (type === 'release') { const r = lib.releases.find((x) => x.id === id); return found(r && { type, id, label: r.title, to: r.albumId ? `/albums/${r.albumId}` : null }); }
  return null;
}

/** Bios that list this entity and want to appear on its page. */
export function biosFor(lib: Library, type: EntityType, id: string) {
  return lib.groups.filter((g) => g.members.some((m) => m.entityType === type && m.entityId === id && m.showOnEntityPage));
}
