import { defineHandler } from "nitro";
import { readBody, createError } from "h3";
import { db } from '../../../db';
import { artists } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing ID' });

  const body = await readBody(event) as any;
  
  const updateData: any = {
    name: body.name,
    image: body.image,
    bio: body.bio,
  };

  if (body.groups) updateData.groups = JSON.stringify(body.groups);

  await db.update(artists).set(updateData).where(eq(artists.id, id));
  
  return { success: true };
});