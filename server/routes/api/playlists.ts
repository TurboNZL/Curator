import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../db';
import { playlists, playlistTracks } from '../../db/schema';
import { eq } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const method = event.method;

  if (method === 'GET') {
    const allPlaylists = await db.select().from(playlists);
    const allPlaylistTracks = await db.select().from(playlistTracks);
    
    return allPlaylists.map(p => ({
      ...p,
      trackIds: allPlaylistTracks
        .filter(pt => pt.playlistId === p.id)
        .sort((a, b) => a.order - b.order)
        .map(pt => pt.trackId)
    }));
  }

  if (method === 'POST') {
    const body = await readBody(event) as any;
    const id = Math.random().toString(36).substring(7);
    
    const newPlaylist = {
      id,
      name: body.name,
      description: body.description,
      coverImage: body.coverImage,
      createdAt: new Date(),
    };

    await db.insert(playlists).values(newPlaylist);

    if (body.trackIds && Array.isArray(body.trackIds)) {
      for (let i = 0; i < body.trackIds.length; i++) {
        await db.insert(playlistTracks).values({
          playlistId: id,
          trackId: body.trackIds[i],
          order: i
        });
      }
    }

    return {
      ...newPlaylist,
      trackIds: body.trackIds || []
    };
  }
});
