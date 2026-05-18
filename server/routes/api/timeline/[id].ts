import { defineHandler } from "nitro";
import { db } from '../../../db';
import { timeline } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) return { error: 'Missing ID' };

  const method = event.method;

  if (method === 'DELETE') {
    await db.delete(timeline).where(eq(timeline.id, id));
    return { success: true };
  }
});
