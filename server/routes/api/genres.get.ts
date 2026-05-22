import { defineHandler } from "nitro";
import { db } from '../../db';
import { genres } from '../../db/schema'; // Import the new genres table
import { asc } from 'drizzle-orm';

export default defineHandler(async (event) => {
  if (event.method === 'GET') {
    // Fetch all genres from the new genres table
    const allGenres = await db.select().from(genres).orderBy(asc(genres.name));
    return allGenres.map(genre => genre.name);
  }
});
