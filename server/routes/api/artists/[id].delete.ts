import { defineHandler } from "nitro";
import { db } from '../../../db';
import { artists, albums, tracks, eras, groupMembers, notes } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) return { error: 'Missing ID' };

  await db.delete(eras).where(eq(eras.artistId, id));
  await db.delete(groupMembers).where(and(eq(groupMembers.entityId, id), eq(groupMembers.entityType, 'artist')));
  await db.delete(notes).where(and(eq(notes.entityId, id), eq(notes.entityType, 'artist')));
  
  // Delete the artist
  await db.delete(artists).where(eq(artists.id, id));
  
  return { success: true };
});
