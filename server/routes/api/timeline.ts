import { defineEventHandler, readBody } from 'h3';
import { db } from '../../db';
import { timeline } from '../../db/schema';
import { desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const method = event.method;

  if (method === 'GET') {
    return await db.select().from(timeline).orderBy(desc(timeline.timestamp));
  }

  if (method === 'POST') {
    const body = await readBody(event);
    const id = Math.random().toString(36).substring(7);
    const newEntry = {
      id,
      type: body.type,
      timestamp: new Date(),
      title: body.title,
      description: body.description,
      entityId: body.entityId,
    };
    await db.insert(timeline).values(newEntry);
    return newEntry;
  }
});