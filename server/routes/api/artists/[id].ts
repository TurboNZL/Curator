import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../../db';
import { artists, eras, groupMembers, tracks, albumTracks, albums } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { Credit } from '../../../types/music';

// Helper to safely parse JSON strings into arrays, defaulting to empty array on error or null
const safeParseArray = <T>(jsonString: string | null | undefined): T[] => {
  if (typeof jsonString !== 'string' || !jsonString) return [];
  try {
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("Error parsing JSON string, defaulting to empty array:", e, jsonString);
    return [];
  }
};

export default defineHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) return { error: 'Missing ID' };

  const method = event.method;
  console.log(`Artist route hit: ${method} ${id}`);

  if (method === 'GET') {
    const artist = await db.query.artists.findFirst({
      where: eq(artists.id, id),
    });

    if (!artist) {
      throw createError({ statusCode: 404, statusMessage: 'Artist not found' });
    }

    // Fetch all tracks to filter by artistId or artistCredits
    const allTracks = await db.select().from(tracks);
    const allAlbumTracks = await db.select().from(albumTracks);
    const allAlbums = await db.select().from(albums);

    const artistTracks = allTracks.filter(track => {
      // Check if the artist is the primary artist
      if (track.artistId === id) {
        return true;
      }
      // Check if the artist is in the artistCredits
      const credits = safeParseArray<Credit>(track.artistCredits);
      return credits.some(credit => credit.artistId === id);
    }).map(track => {
        const associatedAlbumIds = allAlbumTracks.filter(r => r.trackId === track.id).map(r => r.albumId);
        let trackGenreNames: string[] = [];

        if (track.syncWithAlbumCredits && associatedAlbumIds.length > 0) {
          const mainAlbum = allAlbums.find(album => album.id === associatedAlbumIds[0]);
          if (mainAlbum && mainAlbum.genres) {
            try {
              trackGenreNames = JSON.parse(mainAlbum.genres);
            } catch (e) {
              console.error('Error parsing album genres:', e);
            }
          }
        }
      return {
        ...track,
        artistCredits: safeParseArray(track.artistCredits),
        genres: trackGenreNames,
        albumIds: allAlbumTracks.filter(r => r.trackId === track.id).map(r => ({ albumId: r.albumId, order: r.order || 0 })),
        isFavorite: !!track.isFavorite,
        syncWithAlbumCredits: !!track.syncWithAlbumCredits,
      };
    });

    return {
      ...artist,
      tracks: artistTracks,
    };
  }

  if (method === 'PUT') {
    const body = await readBody(event) as any;
    const updateData: any = {
      name: body.name,
      image: body.image,
    };
    await db.update(artists).set(updateData).where(eq(artists.id, id));
    return { success: true };
  }

  if (method === 'DELETE') {
    await db.delete(eras).where(eq(eras.artistId, id));
    await db.delete(groupMembers).where(and(eq(groupMembers.entityId, id), eq(groupMembers.entityType, 'artist')));
    await db.delete(artists).where(eq(artists.id, id));
    return { success: true };
  }
});