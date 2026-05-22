import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../db';
import { genres } from '../../db/schema';

export default defineHandler(async (event) => {
  if (event.method === 'POST') {
    const body = await readBody(event);
    const { name } = body;

    if (!name) {
      throw new Error("Genre name is required");
    }

    const newGenre = {
      id: Math.random().toString(36).substring(7),
      name,
    };

    await db.insert(genres).values(newGenre);
    return newGenre;
  }
});
