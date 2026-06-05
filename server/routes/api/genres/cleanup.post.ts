import { defineHandler } from "nitro";
import { db } from '../../db'; 
import { genres, roleCategories, albums, tracks } from '../../db/schema';
import { inArray, and, eq, sql } from 'drizzle-orm';
import { Credit } from '../../types/music'; // Updated import path

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
  if (event.method === 'POST') {
    let cleanupMessages: string[] = [];
    let deletedCount = 0;

    // --- Clean up unused Genres ---
    const allTracks = await db.select().from(tracks);
    const allAlbums = await db.select().from(albums);


    // Fetch all genres first to map names to IDs
    const allGenresInDb = await db.select({
      id: genres.id,
      name: genres.name,
    }).from(genres);

    // Extract genre IDs from album.genres (JSON strings) by resolving names to IDs
    const usedGenreIdsFromAlbums = new Set<string>();
    allAlbums.forEach(album => {
      // Use safeParseArray for album.genres
      const albumGenres = safeParseArray<string>(album.genres);
      albumGenres.forEach(genreName => {
        const foundGenre = allGenresInDb.find(g => g.name === genreName);
        if (foundGenre) usedGenreIdsFromAlbums.add(foundGenre.id);
      });
    });

    const allUsedGenreIds = Array.from(usedGenreIdsFromAlbums);

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
      // Use safeParseArray for track.artistCredits
      const artistCredits = safeParseArray<Credit>(track.artistCredits);
      artistCredits.forEach(credit => credit.role.forEach(role => usedRoleCategoryNames.add(role)));
    });

    // Check albums for used role categories
    allAlbums.forEach(album => {
      // Use safeParseArray for album.artistCredits
      const artistCredits = safeParseArray<Credit>(album.artistCredits);
      artistCredits.forEach(credit => credit.role.forEach(role => usedRoleCategoryNames.add(role)));
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
  return { success: false, message: 'Method Not Allowed' };
});