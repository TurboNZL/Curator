import { defineHandler } from "nitro";
import { db } from '../../../server/db';
import { genres, trackGenres } from '../../../server/db/schema';
import { inArray } from 'drizzle-orm';

export default defineHandler(async (event) => {
  if (event.method === 'POST') {
    // Get all genre IDs currently linked to tracks
    const usedGenreIdsResult = await db.select({
      genreId: trackGenres.genreId
    }).from(trackGenres);
    const usedGenreIds = Array.from(new Set(usedGenreIdsResult.map(row => row.genreId)));

    // Get all existing genres
    const allGenres = await db.select({
      id: genres.id,
      name: genres.name,
    }).from(genres);

    // Filter out genres that are not in the usedGenreIds list
    const unusedGenres = allGenres.filter(genre => !usedGenreIds.includes(genre.id));

    if (unusedGenres.length > 0) {
      const unusedGenreIds = unusedGenres.map(genre => genre.id);
      await db.delete(genres).where(inArray(genres.id, unusedGenreIds));
      return { success: true, message: `Removed ${unusedGenres.length} unused genres.` };
    } else {
      return { success: true, message: "No unused genres found." };
    }
  }
});
