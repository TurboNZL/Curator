import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../../db';
import { playlists, playlistTracks } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) return { error: 'Missing ID' };

  const method = event.method;

  if (method === 'PUT') {
    const body = await readBody(event) as any;
    
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.coverImage !== undefined) updateData.coverImage = body.coverImage;

    if (Object.keys(updateData).length > 0) {
      await db.update(playlists)
        .set(updateData)
        .where(eq(playlists.id, id));
    }

    if (body.trackIds && Array.isArray(body.trackIds)) {
      // Delete existing tracks
      await db.delete(playlistTracks).where(eq(playlistTracks.playlistId, id));
      // Insert new tracks with order
      for (let i = 0; i < body.trackIds.length; i++) {
        await db.insert(playlistTracks).values({
          playlistId: id,
          trackId: body.trackIds[i],
          order: i
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
