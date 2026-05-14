import { defineHandler } from "nitro";
import { db } from '../../db';
import { playbackLogs } from '../../db/schema';
import { desc } from 'drizzle-orm';

export default defineHandler(async (event) => {
  return await db.select().from(playbackLogs).orderBy(desc(playbackLogs.timestamp));
});