import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../db';
import { groups } from '../../db/schema';

export default defineHandler(async (event) => {
  const method = event.method;

  if (method === 'GET') {
    return await db.select().from(groups);
  }

  if (method === 'POST') {
    const body = await readBody(event) as any;
    const id = Math.random().toString(36).substring(7);
    
    const newGroup = {
      id,
      name: body.name,
      description: body.description,
      type: body.type || 'thematic',
    };

    await db.insert(groups).values(newGroup);
    return newGroup;
  }
});
