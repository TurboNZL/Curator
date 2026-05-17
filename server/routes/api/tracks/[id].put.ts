import { defineHandler } from "nitro";
import { readBody, createError } from "h3";
import { db } from '../../../db';
import { tracks, albumTracks } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing ID' });

  const body = await readBody(event) as any;
  
  const updateData: any = {
    title: body.title,
    rating: body.rating,
    initialRating: body.initialRating,
    memories: body.memories,
    localFilePath: body.localFilePath,
    spotifyUrl: body.spotifyUrl,
    geniusUrl: body.geniusUrl,
    soundcloudUrl: body.soundcloudUrl,
    youtubeMusicUrl: body.youtubeMusicUrl,
    bitrate: body.bitrate,
    bpm: body.bpm,
    key: body.key,
    isFavorite: body.isFavorite ? 1 : 0,
  };

  if (body.genres) updateData.genres = JSON.stringify(body.genres);
  if (body.producers) updateData.producers = JSON.stringify(body.producers);
  if (body.writers) updateData.writers = JSON.stringify(body.writers);
  if (body.credits) updateData.credits = JSON.stringify(body.credits);
  if (body.queueRules) updateData.queueRules = JSON.stringify(body.queueRules);

  await db.update(tracks).set(updateData).where(eq(tracks.id, id));

  // Update album relations if provided
  if (body.albumIds && Array.isArray(body.albumIds)) {
    await db.delete(albumTracks).where(eq(albumTracks.trackId, id));
    for (const albumId of body.albumIds) {
      await db.insert(albumTracks).values({ albumId, trackId: id });
    }
  }
  
  return { success: true };
});
