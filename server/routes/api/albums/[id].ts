import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../../db';
import { albums, releases, groupMembers } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) return { error: 'Missing ID' };

  const method = event.method;
  console.log(`Album route hit: ${method} ${id}`);

  if (method === 'PUT') {
    const body = await readBody(event) as any;
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.artistId !== undefined) updateData.artistId = body.artistId;
    if (body.artistIds !== undefined) updateData.artistIds = JSON.stringify(body.artistIds);
    if (body.eraId !== undefined) updateData.eraId = body.eraId;
    if (body.covers !== undefined) updateData.covers = JSON.stringify(body.covers);
    if (body.defaultReleaseId !== undefined) updateData.defaultReleaseId = body.defaultReleaseId;
    if (body.pendingFiles !== undefined) updateData.pendingFiles = JSON.stringify(body.pendingFiles);
    if (body.genres !== undefined) updateData.genres = JSON.stringify(body.genres);
    if (body.producers !== undefined) updateData.producers = JSON.stringify(body.producers);
    if (body.writers !== undefined) updateData.writers = JSON.stringify(body.writers);
    if (body.credits !== undefined) updateData.credits = JSON.stringify(body.credits);

    if (Object.keys(updateData).length > 0) {
      await db.update(albums).set(updateData).where(eq(albums.id, id));
    }
    return { success: true };
  }

  if (method === 'DELETE') {
    await db.delete(releases).where(eq(releases.albumId, id));
    await db.delete(groupMembers).where(and(eq(groupMembers.entityId, id), eq(groupMembers.entityType, 'album')));
    await db.delete(albums).where(eq(albums.id, id));
    return { success: true };
  }
});
