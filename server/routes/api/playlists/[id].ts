import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../../db';
import { playlists, playlistTracks } from '../../../db/schema';
import { eq, sql } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) return { error: 'Missing ID' };

  const method = event.method;

  if (method === 'PUT') {
    const body = await readBody(event) as any;
    
    // Update playlist metadata
    const updateData: any = {
      name: body.name,
      description: body.description,
      coverImage: body.coverImage,
    };

    await db.update(playlists).set(updateData).where(eq(playlists.id, id));

    // Update tracks if provided
    if (body.trackIds !== undefined && Array.isArray(body.trackIds)) {
      await db.delete(playlistTracks).where(eq(playlistTracks.playlistId, id)); // Clear existing tracks
      for (let i = 0; i < body.trackIds.length; i++) {
        await db.insert(playlistTracks).values({
          playlistId: id,
          trackId: body.trackIds[i],
          order: i,
        });
      }
    }

    return { success: true };
  }

  if (method === 'DELETE') {
    await db.delete(playlistTracks).where(eq(playlistTracks.playlistId, id));
    await db.delete(playlists).where(eq(playlists.id, id));
    return { success: true };
  }
});