import { defineHandler } from "nitro";
import { db } from '../../../db';
import { tracks, playbackLogs, groupMembers, notes } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) return { error: 'Missing ID' };

  // Delete related data first
  await db.delete(playbackLogs).where(eq(playbackLogs.trackId, id));
  await db.delete(groupMembers).where(and(eq(groupMembers.entityId, id), eq(groupMembers.entityType, 'track')));
  await db.delete(notes).where(and(eq(notes.entityId, id), eq(notes.entityType, 'track')));
  
  // Delete the track
  await db.delete(tracks).where(eq(tracks.id, id));
  
  return { success: true };
});
