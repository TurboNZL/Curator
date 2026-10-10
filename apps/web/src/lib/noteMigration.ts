import type { GroupData, NoteCategoryData, NoteData } from '@curator/core';

/** Stable id for a category made from an old fixed type, so every device that migrates makes the same record. */
export const categoryIdFor = (name: string) => `cat-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 56)}`;
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export interface NoteMigration {
  categories: { id: string; data: NoteCategoryData }[];
  /** notes to write (an old note becomes a note with one link, under its own id; an old bio loses its fixed type) */
  groups: { id: string; data: GroupData }[];
  /** old per-entity notes that have been turned into notes */
  removeNotes: string[];
}

/**
 * Notes and relational bios are one thing now. Old notes become notes tied to their one entity; the fixed bio "type"
 * becomes the note's own category (except "era": eras are collections, not a kind of bio). Idempotent: running it on
 * migrated data returns nothing to do.
 */
export function planNoteMigration(
  legacyNotes: { id: string; data: NoteData }[],
  groups: { id: string; data: GroupData }[],
  categories: { id: string; data: NoteCategoryData }[],
): NoteMigration {
  const out: NoteMigration = { categories: [], groups: [], removeNotes: [] };
  const known = new Set(categories.map((c) => c.id));
  const ensure = (name: string) => {
    const id = categoryIdFor(name);
    if (!known.has(id)) { known.add(id); out.categories.push({ id, data: { name } }); }
    return id;
  };
  for (const n of legacyNotes) {
    out.groups.push({ id: n.id, data: {
      name: n.data.label || 'Note', description: n.data.content || null, label: null, categoryId: null,
      members: [{ entityType: n.data.entityType as GroupData['members'][number]['entityType'], entityId: n.data.entityId, showOnEntityPage: true }],
      createdAt: n.data.createdAt,
    } });
    out.removeNotes.push(n.id);
  }
  for (const g of groups) {
    if (g.data.type === undefined) continue;
    const { type, ...rest } = g.data;
    const name = (type ?? '').trim();
    const categoryId = rest.categoryId ?? (name && name.toLowerCase() !== 'era' ? ensure(titleCase(name)) : null);
    out.groups.push({ id: g.id, data: { ...rest, categoryId } });
  }
  return out;
}
