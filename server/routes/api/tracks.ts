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
        let genres = [];
        let producers = [];
        
        try {
          genres = typeof track.genres === 'string' ? JSON.parse(track.genres || '[]') : (track.genres || []);
        } catch (e) {
          genres = [];
        }

        try {
          producers = typeof track.producers === 'string' ? JSON.parse(track.producers || '[]') : (track.producers || []);
        } catch (e) {
          producers = [];
        }

        return {
          ...track,
          genres,
          producers,
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
      localFilePath: body.localFilePath,
      spotifyUrl: body.spotifyUrl,
      geniusUrl: body.geniusUrl,
      soundcloudUrl: body.soundcloudUrl,
      youtubeMusicUrl: body.youtubeMusicUrl,
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