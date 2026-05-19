import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../../db';
import { releases, releaseTracks } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) return { error: 'Missing ID' };

  const body = await readBody(event) as any;
  
  await db.update(releases)
    .set({
      title: body.title,
      coverImage: body.coverImage,
      releaseDate: body.releaseDate,
      spotifyUri: body.spotifyUri,
    })
    .where(eq(releases.id, id));

  if (body.trackIds !== undefined && Array.isArray(body.trackIds)) {
    await db.delete(releaseTracks).where(eq(releaseTracks.releaseId, id));
    for (let i = 0; i < body.trackIds.length; i++) {
      await db.insert(releaseTracks).values({
        releaseId: id,
        trackId: body.trackIds[i],
        order: i
      });
    }
  }

  return { success: true };
});