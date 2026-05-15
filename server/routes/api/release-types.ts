import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../db';
import { releaseTypes } from '../../db/schema';

export default defineHandler(async (event) => {
  const method = event.method;

  if (method === 'GET') {
    return await db.select().from(releaseTypes);
  }

  if (method === 'POST') {
    const body = await readBody(event) as any;
    const id = Math.random().toString(36).substring(7);
    
    const newType = {
      id,
      name: body.name,
    };

    await db.insert(releaseTypes).values(newType);
    return newType;
  }
});
