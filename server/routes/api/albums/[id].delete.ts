import { defineHandler } from "nitro";
import { db } from '../../../db';
import { albums, tracks, releases, groupMembers, notes } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) return { error: 'Missing ID' };

  await db.delete(releases).where(eq(releases.albumId, id));
  await db.delete(groupMembers).where(and(eq(groupMembers.entityId, id), eq(groupMembers.entityType, 'album')));
  await db.delete(notes).where(and(eq(notes.entityId, id), eq(notes.entityType, 'album')));
  
  // Delete the album
  await db.delete(albums).where(eq(albums.id, id));
  
  return { success: true };
});
