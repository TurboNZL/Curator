import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../../db';
import { tracks, playbackLogs, groupMembers, albumTracks } from '../../../db/schema'; // Import albumTracks
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
      // albumIds: JSON.stringify(body.albumIds || []), // Removed direct update of albumIds on tracks table
      rating: body.rating,
      initialRating: body.initialRating,
      memories: body.memories,
      localFilePath: body.localFilePath,
      spotifyUrl: body.spotifyUrl,
      geniusUrl: body.geniusUrl,
      youtubeMusicUrl: body.youtubeMusicUrl,
      // Change Start
      bitrate: body.bitrate === undefined ? undefined : body.bitrate || '320kbps', // Changed: handle undefined vs blank
      // Change End
      bpm: body.bpm,
      key: body.key,
      isFavorite: body.isFavorite ? 1 : 0,
      genres: JSON.stringify(body.genres || []),
      producers: JSON.stringify(body.producers || []),
      writers: JSON.stringify(body.writers || []),
      credits: JSON.stringify(body.credits || []),
    };
    await db.update(tracks).set(updateData).where(eq(tracks.id, id));

    // Handle albumTracks relationship separately
    if (body.albumIds !== undefined && Array.isArray(body.albumIds)) {
      await db.delete(albumTracks).where(eq(albumTracks.trackId, id)); // Clear existing album relations
      for (const albumRelation of body.albumIds) {
        await db.insert(albumTracks).values({ albumId: albumRelation.albumId, trackId: id, order: albumRelation.order || 0 });
      }
    } else if (body.albumId === null || body.albumId === 'none') { // If album is explicitly unselected
      await db.delete(albumTracks).where(eq(albumTracks.trackId, id));
    }


    return { success: true };
  }

  if (method === 'DELETE') {
    await db.delete(playbackLogs).where(eq(playbackLogs.trackId, id));
    await db.delete(groupMembers).where(and(eq(groupMembers.entityId, id), eq(groupMembers.entityType, 'track')));
    await db.delete(albumTracks).where(eq(albumTracks.trackId, id)); // Also delete from albumTracks
    await db.delete(tracks).where(eq(tracks.id, id));
    return { success: true };
  }
});