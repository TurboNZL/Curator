import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../db';
import { tracks, albumTracks } from '../../db/schema';

export default defineHandler(async (event) => {
  const method = event.method;

  if (method === 'GET') {
    try {
      const allTracks = await db.select().from(tracks);
      const relations = await db.select().from(albumTracks);
      
      return allTracks.map(track => {
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
          isFavorite: !!track.isFavorite,
          albumIds: relations.filter(r => r.trackId === track.id).map(r => r.albumId)
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
      rating: body.rating || 0,
      initialRating: body.initialRating || 0,
      eloScore: body.eloScore || 1000,
      comparisons: body.comparisons || 0,
      localFilePath: body.localFilePath,
      spotifyUrl: body.spotifyUrl,
      geniusUrl: body.geniusUrl,
      soundcloudUrl: body.soundcloudUrl,
      youtubeMusicUrl: body.youtubeMusicUrl,
      genres: JSON.stringify(body.genres || []),
      producers: JSON.stringify(body.producers || []),
      writers: JSON.stringify(body.writers || []),
      credits: JSON.stringify(body.credits || []),
      bitrate: body.bitrate,
      bpm: body.bpm,
      key: body.key,
      isFavorite: body.isFavorite ? 1 : 0,
      queueRules: JSON.stringify(body.queueRules || {}),
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
      writers: body.writers || [],
      credits: body.credits || [],
      queueRules: body.queueRules || {},
      isFavorite: !!body.isFavorite,
      albumIds: body.albumIds || []
    };
  }
});
