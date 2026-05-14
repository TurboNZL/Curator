import { defineEventHandler, readBody } from 'nitro/runtime';
import { db } from '../../db';
import { tracks, albumTracks } from '../../db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const method = event.method;

  if (method === 'GET') {
    const allTracks = await db.select().from(tracks);
    const relations = await db.select().from(albumTracks);
    
    return allTracks.map(track => ({
      ...track,
      genres: JSON.parse(track.genres || '[]'),
      producers: JSON.parse(track.producers || '[]'),
      albumIds: relations.filter(r => r.trackId === track.id).map(r => r.albumId)
    }));
  }

  if (method === 'POST') {
    const body = await readBody(event);
    const id = Math.random().toString(36).substring(7);
    
    const newTrack = {
      id,
      title: body.title,
      artistId: body.artistId,
      rating: body.rating || 0,
      initialRating: body.initialRating || 0,
      localFilePath: body.localFilePath,
      genres: JSON.stringify(body.genres || []),
      producers: JSON.stringify(body.producers || []),
      bitrate: body.bitrate,
    };

    await db.insert(tracks).values(newTrack);

    if (body.albumIds && Array.isArray(body.albumIds)) {
      for (const albumId of body.albumIds) {
        await db.insert(albumTracks).values({ albumId, trackId: id });
      }
    }

    return {
      ...newTrack,
      genres: body.genres || [],
      producers: body.producers || [],
      albumIds: body.albumIds || []
    };
  }
});