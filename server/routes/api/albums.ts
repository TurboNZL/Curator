import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../db';
import { albums } from '../../db/schema';

export default defineHandler(async (event) => {
  const method = event.method;

  if (method === 'GET') {
    const allAlbums = await db.select().from(albums);
    return allAlbums.map(album => ({
      ...album,
      // Removed credits: JSON.parse(album.credits || '[]'),
      artistCredits: JSON.parse(album.artistCredits || '[]'),
      genres: JSON.parse(album.genres || '[]'), // Parse genres
    }));
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
      // Removed credits: JSON.stringify(body.credits || []), // General album credits
      artistCredits: JSON.stringify(body.artistCredits || []), // Album artist credits (role: string[])
      genres: JSON.stringify(body.genres || []), // Stringify genres for DB
    };

    await db.insert(albums).values(newAlbum);
    return { 
      ...newAlbum, 
      pendingFiles: body.pendingFiles || [],
      // Removed credits: body.credits || [],
      artistCredits: body.artistCredits || [], // Parse back for return
      genres: body.genres || [], // Parse back for return
    };
  }
});