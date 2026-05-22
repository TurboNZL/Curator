import { defineHandler } from "nitro";
import { db } from '../../../db'; // Corrected path
import { genres, trackGenres, roleCategories, albums, tracks } from '../../../db/schema';
import { inArray, and, eq, sql } from 'drizzle-orm';
import { Credit } from '../../../src/types/music'; // Import Credit type

export default defineHandler(async (event) => {
  if (event.method === 'POST') {
    let cleanupMessages: string[] = [];
    let deletedCount = 0;

    // --- Clean up unused Genres ---
    const allTracks = await db.select().from(tracks);
    const allAlbums = await db.select().from(albums);

    const usedGenreIdsFromTracksResult = await db.select({
      genreId: trackGenres.genreId
    }).from(trackGenres);
    const usedGenreIdsFromTracks = Array.from(new Set(usedGenreIdsFromTracksResult.map(row => row.genreId)));

    // Fetch all genres first to map names to IDs
    const allGenresInDb = await db.select({
      id: genres.id,
      name: genres.name,
    }).from(genres);

    // Extract genre IDs from album.genres (JSON strings) by resolving names to IDs
    const usedGenreIdsFromAlbums = new Set<string>();
    allAlbums.forEach(album => {
      try {
        const albumGenres = JSON.parse(album.genres || '[]') as string[];
        albumGenres.forEach(genreName => {
            const foundGenre = allGenresInDb.find(g => g.name === genreName);
            if (foundGenre) usedGenreIdsFromAlbums.add(foundGenre.id);
        });
      } catch (e) {
        console.warn(`Error parsing genres for album ${album.id}:`, e);
      }
    });

    const allUsedGenreIds = Array.from(new Set([...usedGenreIdsFromTracks, ...Array.from(usedGenreIdsFromAlbums)]));

    const unusedGenres = allGenresInDb.filter(genre => !allUsedGenreIds.includes(genre.id));

    if (unusedGenres.length > 0) {
      const unusedGenreIds = unusedGenres.map(genre => genre.id);
      await db.delete(genres).where(inArray(genres.id, unusedGenreIds));
      deletedCount += unusedGenres.length;
      cleanupMessages.push(`Removed ${unusedGenres.length} unused genres.`);
    } else {
      cleanupMessages.push("No unused genres found.");
    }

    // --- Clean up unused Role Categories (excluding non-removable ones) ---
    const removableRoleCategories = await db.select().from(roleCategories).where(eq(roleCategories.isRemovable, true));
    
    const usedRoleCategoryNames = new Set<string>();

    // Check tracks for used role categories
    allTracks.forEach(track => {
      try {
        const artistCredits = JSON.parse(track.artistCredits || '[]') as Credit[];
        artistCredits.forEach(credit => credit.role.forEach(role => usedRoleCategoryNames.add(role)));
      } catch (e) {
        console.warn(`Error parsing artistCredits for track ${track.id}:`, e);
      }
    });

    // Check albums for used role categories
    allAlbums.forEach(album => {
      try {
        const artistCredits = JSON.parse(album.artistCredits || '[]') as Credit[];
        artistCredits.forEach(credit => credit.role.forEach(role => usedRoleCategoryNames.add(role)));
      } catch (e) {
        console.warn(`Error parsing artistCredits for album ${album.id}:`, e);
      }
    });

    const unusedRemovableRoleCategories = removableRoleCategories.filter(rc => !usedRoleCategoryNames.has(rc.name));

    if (unusedRemovableRoleCategories.length > 0) {
      const unusedRemovableRoleCategoryIds = unusedRemovableRoleCategories.map(rc => rc.id);
      await db.delete(roleCategories).where(inArray(roleCategories.id, unusedRemovableRoleCategoryIds));
      deletedCount += unusedRemovableRoleCategories.length;
      cleanupMessages.push(`Removed ${unusedRemovableRoleCategories.length} unused removable role categories.`);
    } else {
      cleanupMessages.push("No unused removable role categories found.");
    }

    if (deletedCount > 0) {
      return { success: true, message: `Cleanup complete. ${cleanupMessages.join(' ')}` };
    } else {
      return { success: true, message: "No unused categories or genres found for cleanup." };
    }
  }
});