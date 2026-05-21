import { defineEventHandler } from "h3";
import { db } from '../../db';
import { tracks, artists, albums, releases, playlists } from '../../db/schema';
import fs from 'fs/promises';
import path from 'path';

export default defineEventHandler(async () => {
  try {
    const rootUploadDir = path.join(process.cwd(), 'public', 'uploads');
    const musicUploadDir = path.join(rootUploadDir, 'music');
    const imagesUploadDir = path.join(rootUploadDir, 'images');

    // Ensure directories exist before trying to read them
    await fs.mkdir(musicUploadDir, { recursive: true });
    await fs.mkdir(imagesUploadDir, { recursive: true });

    const [allTracks, allArtists, allAlbums, allReleases, allPlaylists] = await Promise.all([
      db.select().from(tracks),
      db.select().from(artists),
      db.select().from(albums),
      db.select().from(releases),
      db.select().from(playlists),
    ]);

    const usedPaths = new Set<string>();

    // Collect all local file paths from tracks
    allTracks.forEach(track => {
      if (track.localFilePath) usedPaths.add(track.localFilePath);
    });

    // Collect all image paths from artists
    allArtists.forEach(artist => {
      if (artist.image) usedPaths.add(artist.image);
    });

    // Collect album primary covers
    allAlbums.forEach(album => {
      if (album.primaryCover) usedPaths.add(album.primaryCover);
    });

    // Collect all cover paths from releases
    allReleases.forEach(release => {
      if (release.coverImage) usedPaths.add(release.coverImage);
    });

    // Collect all cover paths from playlists
    allPlaylists.forEach(playlist => {
      if (playlist.coverImage) usedPaths.add(playlist.coverImage);
    });
    
    // Also include pendingFiles from albums
    allAlbums.forEach(album => {
      const pending = JSON.parse(album.pendingFiles || '[]') as { url: string, name: string }[];
      pending.forEach(file => usedPaths.add(file.url));
    });


    // Get all physical files in the uploads directories
    const getPhysicalFiles = async (dir: string, prefix: string) => {
      const files: string[] = [];
      try {
        const items = await fs.readdir(dir, { withFileTypes: true });
        for (const item of items) {
          if (item.isFile()) {
            files.push(path.posix.join(prefix, item.name)); // Use path.posix for URL-like paths
          }
        }
      } catch (error: any) {
        if (error.code !== 'ENOENT') { // Ignore 'No such file or directory' errors
          console.error(`Error reading directory ${dir}:`, error);
        }
      }
      return files;
    };

    const physicalMusicFiles = await getPhysicalFiles(musicUploadDir, '/uploads/music');
    const physicalImageFiles = await getPhysicalFiles(imagesUploadDir, '/uploads/images');

    const filesToDelete: string[] = [];

    [...physicalMusicFiles, ...physicalImageFiles].forEach(relativePath => {
      if (!usedPaths.has(relativePath)) {
        filesToDelete.push(relativePath);
      }
    });

    const deletedFilePaths: string[] = [];
    for (const relativePath of filesToDelete) {
      const fullPath = path.join(process.cwd(), 'public', relativePath);
      try {
        await fs.unlink(fullPath);
        deletedFilePaths.push(relativePath);
      } catch (error: any) {
        console.error(`Error deleting file ${fullPath}:`, error);
      }
    }

    return { success: true, deletedFiles: deletedFilePaths, message: `Cleaned up ${deletedFilePaths.length} unlinked files.` };
  } catch (error: any) {
    console.error('Failed to clean up files:', error);
    return { success: false, message: `Failed to clean up files: ${error.message}` };
  }
});