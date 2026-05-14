import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../db';
import { artists } from '../../db/schema';

export default defineHandler(async (event) => {
  const method = event.method;

  if (method === 'GET') {
    return await db.select().from(artists);
  }

  if (method === 'POST') {
    const body = await readBody(event);
    const id = Math.random().toString(36).substring(7);
    const newArtist = {
      id,
      name: body.name,
      image: body.image,
      bio: body.bio,
      groups: JSON.stringify(body.groups || []),
    };
    await db.insert(artists).values(newArtist);
    return newArtist;
  }
});