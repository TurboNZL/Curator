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
      // Removed 'covers' from insertion
      primaryCover: body.primaryCover || null, 
      pendingFiles: JSON.stringify(body.pendingFiles || []),
      credits: JSON.stringify(body.credits || []), // Ensure credits are stringified for DB
      artistIds: JSON.stringify(body.artistIds || []) // Ensure artistIds are stringified for DB
    };

    await db.insert(albums).values(newAlbum);
    // Return the new album with parsed fields for consistency
    return { 
      ...newAlbum, 
      pendingFiles: body.pendingFiles || [],
      credits: body.credits || [],
      artistIds: body.artistIds || []
    };
  }
});