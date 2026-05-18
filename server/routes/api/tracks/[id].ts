import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../../db';
import { tracks, playbackLogs, groupMembers } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) return { error: 'Missing ID' };

  const method = event.method;
  console.log(`Track route hit: ${method} ${id}`);

  if (method === 'PUT') {
    const body = await readBody(event) as any;
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.artistId !== undefined) updateData.artistId = body.artistId;
    if (body.artistIds !== undefined) updateData.artistIds = JSON.stringify(body.artistIds);
    if (body.albumIds !== undefined) updateData.albumIds = JSON.stringify(body.albumIds);
    if (body.rating !== undefined) updateData.rating = body.rating;
    if (body.initialRating !== undefined) updateData.initialRating = body.initialRating;
    if (body.memories !== undefined) updateData.memories = body.memories;
    if (body.localFilePath !== undefined) updateData.localFilePath = body.localFilePath;
    if (body.spotifyUrl !== undefined) updateData.spotifyUrl = body.spotifyUrl;
    if (body.geniusUrl !== undefined) updateData.geniusUrl = body.geniusUrl;
    if (body.soundcloudUrl !== undefined) updateData.soundcloudUrl = body.soundcloudUrl;
    if (body.youtubeMusicUrl !== undefined) updateData.youtubeMusicUrl = body.youtubeMusicUrl;
    if (body.bitrate !== undefined) updateData.bitrate = body.bitrate;
    if (body.bpm !== undefined) updateData.bpm = body.bpm;
    if (body.key !== undefined) updateData.key = body.key;
    if (body.isFavorite !== undefined) updateData.isFavorite = body.isFavorite ? 1 : 0;
    if (body.genres !== undefined) updateData.genres = JSON.stringify(body.genres);
    if (body.producers !== undefined) updateData.producers = JSON.stringify(body.producers);
    if (body.writers !== undefined) updateData.writers = JSON.stringify(body.writers);
    if (body.credits !== undefined) updateData.credits = JSON.stringify(body.credits);
    if (body.syncWithAlbum !== undefined) updateData.syncWithAlbum = body.syncWithAlbum ? 1 : 0;

    if (Object.keys(updateData).length > 0) {
      await db.update(tracks).set(updateData).where(eq(tracks.id, id));
    }
    return { success: true };
  }

  if (method === 'DELETE') {
    await db.delete(playbackLogs).where(eq(playbackLogs.trackId, id));
    await db.delete(groupMembers).where(and(eq(groupMembers.entityId, id), eq(groupMembers.entityType, 'track')));
    await db.delete(tracks).where(eq(tracks.id, id));
    return { success: true };
  }
});
