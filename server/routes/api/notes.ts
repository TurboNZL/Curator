import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../db';
import { notes } from '../../db/schema';

export default defineHandler(async (event) => {
  const method = event.method;

  if (method === 'GET') {
    return await db.select().from(notes);
  }

  if (method === 'POST') {
    const body = await readBody(event) as any;
    const id = Math.random().toString(36).substring(7);
    
    const newNote = {
      id,
      entityType: body.entityType,
      entityId: body.entityId,
      label: body.label,
      content: body.content,
      isLinked: body.isLinked ? 1 : 0,
      createdAt: new Date(),
    };

    await db.insert(notes).values(newNote);
    return newNote;
  }
});
