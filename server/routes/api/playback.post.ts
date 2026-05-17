import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../db';
import { playbackLogs, tracks } from '../../db/schema';
import { eq, sql } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const body = await readBody(event) as any;
  const id = Math.random().toString(36).substring(7);
  
  const log = {
    id,
    trackId: body.trackId,
    timestamp: new Date(),
    duration: body.duration || 0,
    sourceType: body.sourceType,
    sourceId: body.sourceId,
    isSkip: body.isSkip ? 1 : 0,
  };

  await db.insert(playbackLogs).values(log);

  // Increment memories on the track
  if (!body.isSkip) {
    await db.update(tracks)
      .set({ memories: sql`${tracks.memories} + 1` })
      .where(eq(tracks.id, body.trackId));
  }

  return log;
});
