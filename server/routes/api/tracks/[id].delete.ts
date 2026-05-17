import { defineHandler } from "nitro";
import { db } from '../../../db';
import { tracks, playbackLogs, groupMembers, notes } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) return { error: 'Missing ID' };

  // Delete related data first
  await db.delete(playbackLogs).where(eq(playbackLogs.trackId, id));
  await db.delete(groupMembers).where(eq(groupMembers.entityId, id).and(eq(groupMembers.entityType, 'track')));
  await db.delete(notes).where(eq(notes.entityId, id).and(eq(notes.entityType, 'track')));
  
  // Delete the track
  await db.delete(tracks).where(eq(tracks.id, id));
  
  return { success: true };
});
