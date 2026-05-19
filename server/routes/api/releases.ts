import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../db';
import { releases, releaseTracks } from '../../db/schema';
import { desc } from 'drizzle-orm';

export default defineHandler(async (event) => {
  const method = event.method;

  if (method === 'GET') {
    const allReleases = await db.select().from(releases);
    const allReleaseTracks = await db.select().from(releaseTracks);
    
    return allReleases.map(r => ({
      ...r,
      trackIds: allReleaseTracks
        .filter(rt => rt.releaseId === r.id)
        .sort((a, b) => a.order - b.order) // Sort by order
        .map(rt => rt.trackId)
    }));
  }

  if (method === 'POST') {
    const body = await readBody(event) as any;
    const id = Math.random().toString(36).substring(7);
    
    const newRelease = {
      id,
      albumId: body.albumId,
      title: body.title,
      coverImage: body.coverImage,
      releaseDate: body.releaseDate,
      spotifyUri: body.spotifyUri,
    };

    await db.insert(releases).values(newRelease);

    if (body.trackIds && Array.isArray(body.trackIds)) {
      for (let i = 0; i < body.trackIds.length; i++) {
        await db.insert(releaseTracks).values({
          releaseId: id,
          trackId: body.trackIds[i],
          order: i // Use index as order
        });
      }
    }

    return {
      ...newRelease,
      trackIds: body.trackIds || []
    };
  }
});