import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../../db';
import { artists, eras, groupMembers } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) return { error: 'Missing ID' };

  const method = event.method;
  console.log(`Artist route hit: ${method} ${id}`);

  if (method === 'PUT') {
    const body = await readBody(event) as any;
    const updateData: any = {
      name: body.name,
      image: body.image,
    };
    await db.update(artists).set(updateData).where(eq(artists.id, id));
    return { success: true };
  }

  if (method === 'DELETE') {
    await db.delete(eras).where(eq(eras.artistId, id));
    await db.delete(groupMembers).where(and(eq(groupMembers.entityId, id), eq(groupMembers.entityType, 'artist')));
    await db.delete(artists).where(eq(artists.id, id));
    return { success: true };
  }
});
