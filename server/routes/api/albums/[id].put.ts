import { defineHandler } from "nitro";
import { readBody, createError } from "h3";
import { db } from '../../../db';
import { albums } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing ID' });

  const body = await readBody(event) as any;
  
  const updateData: any = {
    title: body.title,
    artistId: body.artistId,
    eraId: body.eraId,
    type: body.type,
  };

  if (body.covers) updateData.covers = JSON.stringify(body.covers);

  await db.update(albums).set(updateData).where(eq(albums.id, id));
  
  return { success: true };
});