import { defineHandler } from "nitro";
import { db } from '../../db';
import { tracks, albums, releases } from '../../db/schema';
import { eq, like } from 'drizzle-orm';

export default defineHandler(async () => {
  const errors: string[] = [];
  const updates: { entity: string, id: string, oldPath: string, newPath: string }[] = [];

  // Update track local file paths
  try {
    const allTracks = await db.select().from(tracks).where(like(tracks.localFilePath, '%/uploads/audio/%'));
    for (const track of allTracks) {
      if (track.localFilePath) {
        const oldPath = track.localFilePath;
        const fileName = oldPath.split('/').pop();
        const newPath = `/music/${fileName}`;
        await db.update(tracks).set({ localFilePath: newPath }).where(eq(tracks.id, track.id));
        updates.push({ entity: 'track', id: track.id, oldPath, newPath });
      }
    }
  } catch (e: any) {
    errors.push(`Error updating track paths: ${e.message}`);
  }

  // Update album cover image paths
  try {
    const allAlbums = await db.select().from(albums).where(like(albums.covers, '%/uploads/image/%'));
    for (const album of allAlbums) {
      if (album.covers) {
        const oldCovers = JSON.parse(album.covers) as string[];
        const newCovers = oldCovers.map(coverPath => {
          if (coverPath.includes('/uploads/image/')) {
            const fileName = coverPath.split('/').pop();
            return `/images/${fileName}`;
          }
          return coverPath;
        });
        const oldCoversString = JSON.stringify(oldCovers);
        const newCoversString = JSON.stringify(newCovers);
        if (oldCoversString !== newCoversString) {
            await db.update(albums).set({ covers: newCoversString }).where(eq(albums.id, album.id));
            updates.push({ entity: 'album', id: album.id, oldPath: oldCoversString, newPath: newCoversString });
        }
      }
    }
  } catch (e: any) {
    errors.push(`Error updating album cover paths: ${e.message}`);
  }

  // Update release cover image paths
  try {
    const allReleases = await db.select().from(releases).where(like(releases.coverImage, '%/uploads/image/%'));
    for (const release of allReleases) {
      if (release.coverImage && release.coverImage.includes('/uploads/image/')) {
        const oldPath = release.coverImage;
        const fileName = oldPath.split('/').pop();
        const newPath = `/images/${fileName}`;
        await db.update(releases).set({ coverImage: newPath }).where(eq(releases.id, release.id));
        updates.push({ entity: 'release', id: release.id, oldPath, newPath });
      }
    }
  } catch (e: any) {
    errors.push(`Error updating release cover paths: ${e.message}`);
  }

  if (errors.length > 0) {
    return { success: false, message: 'Database migration completed with errors', errors, updates };
  }

  return { success: true, message: 'Database paths migrated successfully!', updates };
});