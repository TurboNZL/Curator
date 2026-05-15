import { defineHandler } from "nitro";
import { readBody, createError } from "h3";
import { db } from '../../../db';
import { albums } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing ID' });

  const body = await readBody(event) as any;
  
  const updateData: any = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.artistId !== undefined) updateData.artistId = body.artistId;
  if (body.eraId !== undefined) updateData.eraId = body.eraId;
  if (body.covers !== undefined) updateData.covers = JSON.stringify(body.covers);
  if (body.pendingFiles !== undefined) updateData.pendingFiles = JSON.stringify(body.pendingFiles);
  if (body.defaultReleaseId !== undefined) updateData.defaultReleaseId = body.defaultReleaseId;

  await db.update(albums).set(updateData).where(eq(albums.id, id));
  
  return { success: true };
});