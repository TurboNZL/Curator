import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../../db';
import { notes } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) return { error: 'Missing ID' };

  const method = event.method;

  if (method === 'PUT') {
    const body = await readBody(event) as any;
    await db.update(notes)
      .set({
        label: body.label,
        content: body.content,
        isLinked: body.isLinked ? 1 : 0,
      })
      .where(eq(notes.id, id));
    return { success: true };
  }

  if (method === 'DELETE') {
    await db.delete(notes).where(eq(notes.id, id));
    return { success: true };
  }
});
