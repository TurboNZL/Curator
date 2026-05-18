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
    const updateData: any = {
      title: body.title,
      artistId: body.artistId,
      artistIds: JSON.stringify(body.artistIds || []),
      covers: JSON.stringify(body.covers || []),
      pendingFiles: JSON.stringify(body.pendingFiles || []),
    };
    await db.update(albums).set(updateData).where(eq(albums.id, id));
    return { success: true };
  }

  if (method === 'DELETE') {
    await db.delete(releases).where(eq(releases.albumId, id));
    await db.delete(groupMembers).where(and(eq(groupMembers.entityId, id), eq(groupMembers.entityType, 'album')));
    await db.delete(albums).where(eq(albums.id, id));
    return { success: true };
  }
});
