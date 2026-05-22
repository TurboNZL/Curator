import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../db';
import { albums } from '../../db/schema';

export default defineHandler(async (event) => {
  const method = event.method;

  if (method === 'GET') {
    return await db.select().from(albums);
  }

  if (method === 'POST') {
    const body = await readBody(event) as any;
    const id = Math.random().toString(36).substring(7);
    const newAlbum = {
      id,
      title: body.title,
      artistId: body.artistId,
      eraId: body.eraId,
      primaryCover: body.primaryCover || null, 
      pendingFiles: JSON.stringify(body.pendingFiles || []),
      credits: JSON.stringify(body.credits || []), // General album credits
      artistIds: JSON.stringify(body.artistIds || []),
      artistCredits: JSON.stringify(body.artistCredits || []), // NEW: Album artist credits
    };

    await db.insert(albums).values(newAlbum);
    return { 
      ...newAlbum, 
      pendingFiles: body.pendingFiles || [],
      credits: body.credits || [],
      artistIds: body.artistIds || [],
      artistCredits: body.artistCredits || [], // Parse back for return
    };
  }
});