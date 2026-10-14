import { trackPath } from './trackPath.ts';
import { statsPath } from './entityStats.ts';
import type { GroupMemberData } from '@turbomusic/core';
import type { Library } from './library.ts';

export type EntityType = GroupMemberData['entityType'];

export interface EntityRef { type: EntityType; id: string; label: string; to: string | null; /** the picture that stands for it (an artist's photo, an album's cover), when it has one */ image?: string | null }

/** Resolve a note's link to something displayable and linkable (tracks link to their album, releases have no page). */
export function resolveEntity(lib: Library, type: EntityType | string, id: string): EntityRef | null {
  const found = (r: EntityRef | undefined) => r ?? null;
  if (type === 'artist') { const a = lib.artistById.get(id); return found(a && { type, id, label: a.name, to: `/artists/${id}`, image: a.image }); }
  if (type === 'album') { const a = lib.albumById.get(id); return found(a && { type, id, label: a.title, to: `/albums/${id}`, image: a.cover }); }
  if (type === 'track') { const t = lib.trackById.get(id); return found(t && { type, id, label: `${t.title} · ${t.artistName}`, to: t.albumId ? trackPath(t) : statsPath('track', id), image: t.cover }); } // a single has no album page: its stats page is where it opens
  if (type === 'era') { const e = lib.eraById.get(id); return found(e && { type, id, label: e.name, to: `/eras/${id}`, image: e.cover }); }
  if (type === 'release') { const r = lib.releases.find((x) => x.id === id); return found(r && { type, id, label: r.title, to: r.albumId ? `/albums/${r.albumId}` : null, image: r.cover }); }
  if (type === 'playlist') { const p = lib.playlists.find((x) => x.id === id); return found(p && { type, id, label: p.name, to: `/playlists`, image: p.cover }); }
  return null;
}

/** Notes tied to this entity that want to appear on its page. */
export function notesFor(lib: Library, type: EntityType, id: string) {
  return lib.groups.filter((g) => g.members.some((m) => m.entityType === type && m.entityId === id && m.showOnEntityPage));
}

/**
 * Things can be dropped into a note's text as `{{artist:<id>}}` (also album, track, release, era, playlist). The note's page draws them
 * as chips with their picture; everywhere else a note is shown they read as "ARTIST · Name".
 */
export const NOTE_TOKEN = /\{\{(artist|album|track|release|era|playlist):([^}\s]+)\}\}/g;
export const noteToken = (type: EntityType, id: string) => `{{${type}:${id}}}`;

export type NotePart = { text: string } | { ref: EntityRef | null; type: EntityType; id: string };
/** The text of a note split into plain pieces and embedded things (a thing that no longer exists has `ref: null`). */
export function noteParts(lib: Library, text: string): NotePart[] {
  const out: NotePart[] = [];
  let last = 0;
  for (const m of text.matchAll(NOTE_TOKEN)) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index) });
    out.push({ ref: resolveEntity(lib, m[1], m[2]), type: m[1] as EntityType, id: m[2] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** The text with every embedded thing written out as "ARTIST · Name", for places that show only text (search, cards). */
export function noteTextPlain(lib: Library, text: string): string {
  return noteParts(lib, text).map((p) => ('text' in p ? p.text : p.ref ? `${p.type.toUpperCase()} · ${p.ref.label}` : '')).join('');
}
