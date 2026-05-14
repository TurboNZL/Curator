import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../db';
import { playbackLogs } from '../../db/schema';

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
  return log;
});
