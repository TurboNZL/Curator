import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../db';
import { releases } from '../../db/schema';

export default defineHandler(async (event) => {
  const method = event.method;

  if (method === 'GET') {
    return await db.select().from(releases);
  }

  if (method === 'POST') {
    const body = await readBody(event) as any;
    const id = Math.random().toString(36).substring(7);
    const newRelease = {
      id,
      albumId: body.albumId,
      title: body.title,
      coverImage: body.coverImage,
      releaseDate: body.releaseDate,
      spotifyUri: body.spotifyUri,
    };
    await db.insert(releases).values(newRelease);
    return newRelease;
  }
});