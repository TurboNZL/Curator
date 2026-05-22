import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../db';
import { tracks, albumTracks } from '../../db/schema';
import type { InferSelectModel } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const method = event.method;

  if (method === 'GET') {
    try {
      const allTracks = await db.select().from(tracks);
      const relations = await db.select().from(albumTracks);
      
      type TrackSelectWithDbFields = InferSelectModel<typeof tracks> & { is_favorite?: number | boolean, sync_with_album_credits?: number | boolean };

      return allTracks.map((track: TrackSelectWithDbFields) => {
        const parseJson = (val: any) => {
          if (typeof val === 'string') {
            try { return JSON.parse(val || '[]'); } catch (e) { return []; }
          }
          return val || [];
        };

        return {
          ...track,
          genres: parseJson(track.genres),
          producers: parseJson(track.producers),
          writers: parseJson(track.writers),
          credits: parseJson(track.credits),
          queueRules: typeof track.queueRules === 'string' ? JSON.parse(track.queueRules || '{}') : (track.queueRules || {}),
          isFavorite: !!track.is_favorite,
          albumIds: relations.filter(r => r.trackId === track.id).map(r => ({ albumId: r.albumId, order: r.order || 0 })),
          artistIds: parseJson(track.artistIds),
          syncWithAlbumCredits: !!track.sync_with_album_credits, // Parse new field
        };
      });
    } catch (error) {
      console.error('Error fetching tracks:', error);
      throw error;
    }
  }

  if (method === 'POST') {
    const body = await readBody(event) as any;
    const id = Math.random().toString(36).substring(7);
    
    const newTrack = {
      id,
      title: body.title,
      artistId: body.artistId,
      artistIds: JSON.stringify(body.artistIds || []),
      rating: body.rating || 0,
      initialRating: body.initialRating || 0,
      eloScore: body.eloScore || 1000,
      comparisons: body.comparisons || 0,
      localFilePath: body.localFilePath,
      spotifyUrl: body.spotifyUrl,
      geniusUrl: body.geniusUrl,
      youtubeMusicUrl: body.youtubeMusicUrl,
      genres: JSON.stringify(body.genres || []),
      producers: JSON.stringify(body.producers || []),
      writers: JSON.stringify(body.writers || []),
      credits: JSON.stringify(body.credits || []),
      bitrate: body.bitrate || '320kbps',
      bpm: body.bpm,
      key: body.key,
      isFavorite: body.isFavorite ? 1 : 0,
      queueRules: JSON.stringify(body.queueRules || {}),
      syncWithAlbumCredits: body.syncWithAlbumCredits, // Corrected: Pass boolean directly
    };

    await db.insert(tracks).values(newTrack);

    if (body.albumTracks && Array.isArray(body.albumTracks)) {
      for (const albumTrack of body.albumTracks) {
        await db.insert(albumTracks).values({ albumId: albumTrack.albumId, trackId: id, order: albumTrack.order || 0 });
      }
    } else if (body.albumIds && Array.isArray(body.albumIds)) {
      for (const albumRelation of body.albumIds) { 
        await db.insert(albumTracks).values({ albumId: albumRelation.albumId, trackId: id, order: albumRelation.order || 0 });
      }
    }

    return {
      ...newTrack,
      genres: body.genres || [],
      producers: body.producers || [],
      writers: body.writers || [],
      credits: body.credits || [],
      queueRules: body.queueRules || {},
      isFavorite: !!body.isFavorite,
      albumIds: body.albumIds || [],
      artistIds: body.artistIds || [],
      syncWithAlbumCredits: !!body.syncWithAlbumCredits, // Return parsed new field
    };
  }
});