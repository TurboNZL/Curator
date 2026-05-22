import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../../db';
import { tracks, playbackLogs, groupMembers, albumTracks, genres, trackGenres } from '../../../db/schema';
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
      rating: body.rating,
      initialRating: body.initialRating,
      memories: body.memories,
      localFilePath: body.localFilePath,
      spotifyUrl: body.spotifyUrl,
      geniusUrl: body.geniusUrl,
      youtubeMusicUrl: body.youtubeMusicUrl,
      bitrate: body.bitrate === undefined ? undefined : body.bitrate || '320kbps',
      bpm: body.bpm,
      key: body.key,
      isFavorite: body.isFavorite ? 1 : 0,
      // genres are handled separately
      producers: JSON.stringify(body.producers || []),
      writers: JSON.stringify(body.writers || []),
      credits: JSON.stringify(body.credits || []),
      syncWithAlbumCredits: body.syncWithAlbumCredits ? 1 : 0, 
    };
    await db.update(tracks).set(updateData).where(eq(tracks.id, id));

    // Handle genres update
    if (body.genres !== undefined && Array.isArray(body.genres)) {
      // Delete existing genre links for this track
      await db.delete(trackGenres).where(eq(trackGenres.trackId, id));

      // Insert new genre links
      for (const genreName of body.genres) {
        let genre = await db.select().from(genres).where(eq(genres.name, genreName)).limit(1);
        let genreId: string;

        if (genre.length > 0) {
          genreId = genre[0].id;
        } else {
          genreId = Math.random().toString(36).substring(7);
          await db.insert(genres).values({ id: genreId, name: genreName });
        }
        await db.insert(trackGenres).values({ trackId: id, genreId });
      }
    }

    if (body.albumIds !== undefined && Array.isArray(body.albumIds)) {
      await db.delete(albumTracks).where(eq(albumTracks.trackId, id));
      for (const albumRelation of body.albumIds) {
        await db.insert(albumTracks).values({ albumId: albumRelation.albumId, trackId: id, order: albumRelation.order || 0 });
      }
    } else if (body.albumId === null || body.albumId === 'none') {
      await db.delete(albumTracks).where(eq(albumTracks.trackId, id));
    }

    return { success: true };
  }

  if (method === 'DELETE') {
    await db.delete(playbackLogs).where(eq(playbackLogs.trackId, id));
    await db.delete(groupMembers).where(and(eq(groupMembers.entityId, id), eq(groupMembers.entityType, 'track')));
    await db.delete(albumTracks).where(eq(albumTracks.trackId, id));
    await db.delete(trackGenres).where(eq(trackGenres.trackId, id)); // Delete genre links
    await db.delete(tracks).where(eq(tracks.id, id));
    return { success: true };
  }
});
