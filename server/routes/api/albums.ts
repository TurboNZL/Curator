import { db } from '../../db';
import { albums } from '../../db/schema';

export default defineEventHandler(async (event) => {
  const method = event.method;

  if (method === 'GET') {
    return await db.select().from(albums);
  }

  if (method === 'POST') {
    const body = await readBody(event);
    const id = Math.random().toString(36).substring(7);
    const newAlbum = {
      id,
      title: body.title,
      artistId: body.artistId,
      eraId: body.eraId,
      covers: JSON.stringify(body.covers || []),
      type: body.type || 'Full Album',
    };
    await db.insert(albums).values(newAlbum);
    return newAlbum;
  }
});
