import { defineHandler } from "nitro";
import { readBody } from "h3";
import { db } from '../../../db';
import { albums, releases, groupMembers, tracks, albumTracks } from '../../../db/schema';
import { eq, and, inArray } from 'drizzle-orm';

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
    // 1. Get all tracks associated with this album
    const associatedAlbumTracks = await db.select().from(albumTracks).where(eq(albumTracks.albumId, id));
    const trackIdsToDelete = associatedAlbumTracks.map(at => at.trackId);

    if (trackIdsToDelete.length > 0) {
      // 2. Delete tracks from the 'tracks' table
      await db.delete(tracks).where(inArray(tracks.id, trackIdsToDelete));

      // 3. Delete entries from the 'albumTracks' join table
      await db.delete(albumTracks).where(eq(albumTracks.albumId, id));
    }
    
    // 4. Delete releases associated with this album
    await db.delete(releases).where(eq(releases.albumId, id));

    // 5. Delete group members where this album is the entity
    await db.delete(groupMembers).where(and(eq(groupMembers.entityId, id), eq(groupMembers.entityType, 'album')));
    
    // 6. Finally, delete the album itself
    await db.delete(albums).where(eq(albums.id, id));
    
    return { success: true };
  }
});