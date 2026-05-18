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
    const updateData: any = {
      title: body.title,
      artistId: body.artistId,
      artistIds: JSON.stringify(body.artistIds || []),
      albumIds: JSON.stringify(body.albumIds || []),
      rating: body.rating,
      initialRating: body.initialRating,
      memories: body.memories,
      localFilePath: body.localFilePath,
      spotifyUrl: body.spotifyUrl,
      geniusUrl: body.geniusUrl,
      // Removed soundcloudUrl: body.soundcloudUrl,
      youtubeMusicUrl: body.youtubeMusicUrl,
      bitrate: body.bitrate,
      bpm: body.bpm,
      key: body.key,
      isFavorite: body.isFavorite ? 1 : 0,
      genres: JSON.stringify(body.genres || []),
      producers: JSON.stringify(body.producers || []),
      writers: JSON.stringify(body.writers || []),
      credits: JSON.stringify(body.credits || []),
    };
    await db.update(tracks).set(updateData).where(eq(tracks.id, id));
    return { success: true };
  }

  if (method === 'DELETE') {
    await db.delete(playbackLogs).where(eq(playbackLogs.trackId, id));
    await db.delete(groupMembers).where(and(eq(groupMembers.entityId, id), eq(groupMembers.entityType, 'track')));
    await db.delete(tracks).where(eq(tracks.id, id));
    return { success: true };
  }
});