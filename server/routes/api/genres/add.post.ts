import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../../db';
import { genres } from '../../../db/schema';
import { z } from "zod";

const addGenreInput = z.object({
    name: z.string(),
});

export default defineHandler(async (event) => {
    if (event.method === 'POST') {
        try {
            const body = await readBody(event);
            const input = addGenreInput.parse(body);

            // Check if genre already exists
            const existingGenre = await db.query.genres.findFirst({
                where: (genre, { eq }) => eq(genre.name, input.name),
            });
            if (existingGenre) {
                return { success: false, message: 'Genre already exists.' };
            }

            const newGenre = await db.insert(genres).values({ 
                id: Math.random().toString(36).substring(7), // Generate a unique ID
                name: input.name 
            }).returning({
                id: genres.id,
                name: genres.name,
            });

            return { success: true, message: 'Genre added successfully.', data: newGenre[0] };
        } catch (error) {
            console.error("Error adding genre:", error);
            return { success: false, message: 'Failed to add genre.', error: error };
        }
    }
    return { success: false, message: 'Method Not Allowed' };
});