import { defineEventHandler, readBody, createError } from "h3";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../db";
import { albums, tracks, artists, albumTracks } from "../../db/schema";
import { eq } from 'drizzle-orm';
import youtubeDl from 'youtube-dl-exec'; // Correctly import the default export (the function itself)
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import axios from 'axios';

// Set the path to the ffmpeg binary
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
} else {
  console.error("FFmpeg static path not found. Ensure ffmpeg-static is correctly installed.");
}

// Removed: const ytdl = new YoutubeDlWrap(); // This was the source of the "not a constructor" error.

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as { url: string };
  const { url } = body;

  if (!url) {
    throw createError({
      statusCode: 400,
      statusMessage: "URL is required",
    });
  }

  try {
    console.log(`Starting import for URL: ${url}`);
    
    // Ensure yt-dlp binary is downloaded and available by calling the static method on the imported function
    // Using 'as any' here to bypass potential TypeScript inference issues for static properties.
    await (youtubeDl as any).download(); 
    console.log("yt-dlp binary ensured.");

    const uploadBaseDir = path.join(process.cwd(), "public", "uploads");
    const musicUploadDir = path.join(uploadBaseDir, "music");

    await fs.mkdir(musicUploadDir, { recursive: true });

    // 1. Get info about the URL using yt-dlp by calling the youtubeDl function directly
    const info: any = await youtubeDl(url, { 
      dumpSingleJson: true,
      noWarnings: true,
      preferFreeFormats: true,
    });

    let albumTitle = info.title || "Unknown Album";
    let albumArtistName = info.uploader || info.artist || "Unknown Artist";

    let entries: any[] = [];
    if (info._type === 'playlist' && info.entries) {
      entries = info.entries;
      albumTitle = info.title;
      albumArtistName = info.uploader;
    } else {
      entries = [info]; 
    }

    if (entries.length === 0) {
      throw createError({ statusCode: 404, statusMessage: "No video entries found for the given URL. Please check the URL and try again." });
    }

    // 2. Find or create artist
    console.log(`Finding or creating artist: ${albumArtistName}`);
    let artistId: string;
    const existingArtist = await db.query.artists.findFirst({
      where: eq(artists.name, albumArtistName),
    });
    
    if (existingArtist) {
      artistId = existingArtist.id;
      console.log(`Found existing artist: ${albumArtistName} with ID ${artistId}`);
    } else {
      artistId = uuidv4();
      await db.insert(artists).values({
        id: artistId,
        name: albumArtistName,
      });
      console.log(`Created new artist: ${albumArtistName} with ID ${artistId}`);
    }

    // 3. Create Album
    console.log(`Creating album: ${albumTitle}`);
    const albumId = uuidv4();
    await db.insert(albums).values({
      id: albumId,
      title: albumTitle,
      artistId: artistId,
      artistIds: JSON.stringify([artistId]),
      covers: JSON.stringify([]),
      pendingFiles: JSON.stringify([])
    });
    console.log(`Album created with ID: ${albumId}`);

    // 4. Process each track
    const results = [];
    let firstTrackCover = null;

    for (const entry of entries) {
      if (!entry || !entry.id) continue;

      const trackId = uuidv4();
      const trackTitle = entry.title || "Unknown Track";
      const youtubeMusicUrl = entry.webpage_url || `https://www.youtube.com/watch?v=${entry.id}`;
      const thumbnail_url = entry.thumbnail;

      console.log(`Processing track: ${trackTitle}`);

      // Sanitize filename for local storage
      const cleanTrackTitle = trackTitle.replace(/[^\w\s-]/g, '').trim().substring(0, 100);
      const localFilename = `${cleanTrackTitle}_${uuidv4()}.mp3`;
      const localFilepathFull = path.join(musicUploadDir, localFilename);
      const relativeLocalFilePath = `/uploads/music/${localFilename}`;

      // Download audio using yt-dlp and convert to MP3 with ffmpeg by calling the youtubeDl function directly
      try {
        await new Promise<void>((resolve, reject) => {
          // Explicitly capture the ChildProcess object for chaining .on()
          const childProcess = youtubeDl(youtubeMusicUrl, { 
            extractAudio: true,
            audioFormat: 'mp3',
            output: localFilepathFull,
            noWarnings: true,
            preferFreeFormats: true,
            ffmpegLocation: ffmpegStatic || undefined,
            format: 'bestaudio',
          });

          childProcess.on('error', (err: any) => reject(new Error(`Failed to download audio for ${trackTitle}: ${err.message}`)));
          childProcess.on('close', () => resolve());
        });
        console.log(`Audio downloaded and converted for ${trackTitle}`);
      } catch (downloadError: any) {
        console.warn(downloadError.message);
        continue; 
      }
      
      // Download thumbnail if available and not yet set for the album
      if (thumbnail_url && !firstTrackCover) {
        try {
          const response = await axios.get(thumbnail_url, { responseType: 'arraybuffer' });
          const coverFilePath = path.join(uploadBaseDir, "images", `${uuidv4()}.jpg`);
          await fs.mkdir(path.dirname(coverFilePath), { recursive: true });
          await fs.writeFile(coverFilePath, Buffer.from(response.data));
          firstTrackCover = `/uploads/images/${path.basename(coverFilePath)}`;
          console.log(`Thumbnail downloaded for ${trackTitle}`);
        } catch (e) {
          console.warn(`Failed to download thumbnail for ${trackTitle}:`, e);
        }
      }

      // Save to DB
      console.log(`Saving track ${trackTitle} to database.`);
      await db.insert(tracks).values({
        id: trackId,
        title: trackTitle,
        artistId: artistId,
        artistIds: JSON.stringify([artistId]),
        localFilePath: relativeLocalFilePath,
        youtubeMusicUrl: youtubeMusicUrl,
        genres: JSON.stringify([]),
        producers: JSON.stringify([]),
        writers: JSON.stringify([]),
        credits: JSON.stringify([]),
        eloScore: 1000,
        comparisons: 0,
        memories: 0,
        queueRules: JSON.stringify({})
      });
      console.log(`Track ${trackTitle} saved to tracks table.`);

      await db.insert(albumTracks).values({
        albumId: albumId,
        trackId: trackId,
      });
      console.log(`Track ${trackTitle} associated with album ${albumTitle}.`);

      results.push({ id: trackId, title: trackTitle });
    }

    // Update album with the first track's cover image if available
    if (firstTrackCover) {
      await db.update(albums)
        .set({ covers: JSON.stringify([firstTrackCover]) })
        .where(eq(albums.id, albumId));
      console.log(`Album ${albumTitle} cover updated with first track thumbnail.`);
    }

    return {
      success: true,
      message: `Imported album "${albumTitle}" with ${results.length} tracks`,
      albumId,
      tracks: results,
    };

  } catch (error: any) {
    console.error("Full import error object:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw createError({
      statusCode: 500,
      statusMessage: `Import failed: ${errorMessage || 'An unexpected error occurred during import.'}`,
    });
  }
});