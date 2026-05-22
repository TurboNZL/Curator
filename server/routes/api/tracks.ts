import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../db';
import { tracks, albumTracks, genres, trackGenres } from '../../db/schema';
import { InferSelectModel, eq } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const method = event.method;

  if (method === 'GET') {
    try {
      const allTracks = await db.select().from(tracks);
      const relations = await db.select().from(albumTracks);
      const allTrackGenres = await db.select().from(trackGenres);
      const allGenres = await db.select().from(genres);
      
      type TrackSelectWithDbFields = InferSelectModel<typeof tracks> & { is_favorite?: number | boolean, sync_with_album_credits?: number | boolean };

      return allTracks.map((track: TrackSelectWithDbFields) => {
        const parseJson = (val: any) => {
          if (typeof val === 'string') {
            try { return JSON.parse(val || '[]'); } catch (e) { return []; }
          }
          return val || [];
        };

        const trackGenreIds = allTrackGenres.filter(tg => tg.trackId === track.id).map(tg => tg.genreId);
        const trackGenreNames = allGenres.filter(g => trackGenreIds.includes(g.id)).map(g => g.name);

        return {
          ...track,
          genres: trackGenreNames, // Use fetched genre names
          artistCredits: parseJson(track.artistCredits), // Parse artistCredits (role: string[])
          isFavorite: !!track.is_favorite,
          albumIds: relations.filter(r => r.trackId === track.id).map(r => ({ albumId: r.albumId, order: r.order || 0 })),
          // Removed artistIds parsing
          syncWithAlbumCredits: !!track.syncWithAlbumCredits, 
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
      // Removed artistIds: JSON.stringify(body.artistIds || []),
      artistCredits: JSON.stringify(body.artistCredits || []), // Store artistCredits (role: string[])
      rating: body.rating || 0,
      initialRating: body.initialRating || 0,
      eloScore: body.eloScore || 1000,
      comparisons: body.comparisons || 0,
      localFilePath: body.localFilePath,
      spotifyUrl: body.spotifyUrl,
      geniusUrl: body.geniusUrl,
      youtubeMusicUrl: body.youtubeMusicUrl,
      bitrate: body.bitrate || '320kbps',
      bpm: body.bpm,
      key: body.key,
      isFavorite: !!body.isFavorite,
      queueRules: JSON.stringify(body.queueRules || {}),
      syncWithAlbumCredits: body.syncWithAlbumCredits, 
    };

    await db.insert(tracks).values(newTrack);

    // Handle genres
    if (body.genres && Array.isArray(body.genres)) {
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
      artistCredits: body.artistCredits || [], // Return artistCredits (role: string[])
      queueRules: body.queueRules || {},
      isFavorite: !!newTrack.isFavorite, 
      albumIds: body.albumIds || [],
      // Removed artistIds from return
      syncWithAlbumCredits: !!body.syncWithAlbumCredits, 
    };
  }
});