import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../db';
import { playlists, playlistTracks } from '../../db/schema';
import { eq, sql } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const method = event.method;

  if (method === 'GET') {
    const allPlaylists = await db.select().from(playlists);
    const allPlaylistTracks = await db.select().from(playlistTracks);

    return allPlaylists.map(playlist => {
      const tracks = allPlaylistTracks
        .filter(pt => pt.playlistId === playlist.id)
        .sort((a, b) => a.order - b.order)
        .map(pt => pt.trackId);

      return {
        ...playlist,
        trackIds: tracks,
      };
    });
  }

  if (method === 'POST') {
    const body = await readBody(event) as any;
    const id = Math.random().toString(36).substring(7);
    const createdAt = new Date();

    const newPlaylist = {
      id,
      name: body.name,
      description: body.description || null,
      coverImage: body.coverImage || null,
      createdAt,
    };

    await db.insert(playlists).values(newPlaylist);

    if (body.trackIds && Array.isArray(body.trackIds)) {
      for (let i = 0; i < body.trackIds.length; i++) {
        await db.insert(playlistTracks).values({
          playlistId: id,
          trackId: body.trackIds[i],
          order: i,
        });
      }
    }

    return { ...newPlaylist, trackIds: body.trackIds || [] };
  }
});