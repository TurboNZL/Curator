import { defineEventHandler, readBody, createError } from "h3";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import axios from "axios";
import nodeID3 from "node-id3";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../db";
import { albums, tracks, artists, albumTracks } from "../../db/schema";
import { eq } from 'drizzle-orm'; // Imported 'eq'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as any; // Cast body to any
  const { url } = body;

  if (!url) {
    throw createError({
      statusCode: 400,
      statusMessage: "URL is required",
    });
  }

  try {
    console.log(`Starting import for URL: ${url}`);

    const pythonScriptPath = path.join(process.cwd(), "server", "import-tool", "ytmpcli_api_wrapper.py");
    const uploadBaseDir = path.join(process.cwd(), "public", "uploads");

    // Execute the Python script
    const pythonCommand = `python ${pythonScriptPath} "${url}" "${uploadBaseDir}"`;
    console.log(`Executing Python command: ${pythonCommand}`);

    const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      exec(pythonCommand, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Python script execution failed: ${error.message}\nStderr: ${stderr}`));
        }
        resolve({ stdout, stderr });
      });
    });

    if (stderr) {
      console.warn(`Python script stderr: ${stderr}`);
    }

    const pythonOutput = JSON.parse(stdout);

    if (pythonOutput.error) {
      throw new Error(pythonOutput.error);
    }

    const { albumTitle, albumArtistName, tracks: processedTracks } = pythonOutput;
    
    // Create upload directory if it doesn't exist
    const musicUploadDir = path.join(uploadBaseDir, "music");
    if (!fs.existsSync(musicUploadDir)) {
      fs.mkdirSync(musicUploadDir, { recursive: true });
    }

    // 1. Find or create artist
    console.log(`Finding or creating artist: ${albumArtistName}`);
    let artistId = uuidv4();
    const existingArtists = await db.select().from(artists);
    const existingArtist = existingArtists.find(a => a.name.toLowerCase() === albumArtistName.toLowerCase());
    
    if (existingArtist) {
      artistId = existingArtist.id;
      console.log(`Found existing artist: ${albumArtistName} with ID ${artistId}`);
    } else {
      await db.insert(artists).values({
        id: artistId,
        name: albumArtistName,
      });
      console.log(`Created new artist: ${albumArtistName} with ID ${artistId}`);
    }

    // 2. Create Album
    console.log(`Creating album: ${albumTitle}`);
    const albumId = uuidv4();
    await db.insert(albums).values({
      id: albumId,
      title: albumTitle,
      artistId: artistId,
      artistIds: JSON.stringify([artistId]),
      covers: JSON.stringify([]), // Will update with first track thumbnail
    });
    console.log(`Album created with ID: ${albumId}`);

    // 3. Process each track from Python output
    const results = [];
    let firstTrackCover = null;

    for (const entry of processedTracks) {
      const trackId = entry.id;
      const trackTitle = entry.title;
      const localFilePath = entry.localFilePath;
      const youtubeMusicUrl = entry.youtubeMusicUrl;
      const thumbnail_url = entry.thumbnail;

      console.log(`Processing track: ${trackTitle}`);

      // Add metadata (ID3 tags) and download thumbnail
      const tags: any = {
        title: trackTitle,
        artist: albumArtistName,
        album: albumTitle,
      };

      if (thumbnail_url) {
        try {
          const response = await axios.get(thumbnail_url, { responseType: 'arraybuffer' });
          tags.image = {
            mime: "image/jpeg",
            type: { id: 3, name: "front cover" },
            description: "Cover",
            imageBuffer: Buffer.from(response.data),
          };
          if (!firstTrackCover) {
            firstTrackCover = thumbnail_url;
          }
          console.log(`Thumbnail downloaded for ${trackTitle}`);
        } catch (e) {
          console.warn(`Failed to download thumbnail for ${trackTitle}:`, e);
        }
      }

      const fullLocalFilePath = path.join(process.cwd(), "public", localFilePath);
      if (fs.existsSync(fullLocalFilePath)) {
        nodeID3.write(tags, fullLocalFilePath);
        console.log(`ID3 tags written for ${trackTitle}`);
      }

      // Save to DB
      console.log(`Saving track ${trackTitle} to database.`);
      await db.insert(tracks).values({
        id: trackId,
        title: trackTitle,
        artistId: artistId,
        artistIds: JSON.stringify([artistId]),
        localFilePath: localFilePath,
        youtubeMusicUrl: youtubeMusicUrl,
        genres: JSON.stringify([]), // Default empty
        producers: JSON.stringify([]), // Default empty
        writers: JSON.stringify([]), // Default empty
        credits: JSON.stringify([]), // Default empty
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
    console.error(`Import failed: ${error.message}`);
    throw createError({
      statusCode: 500,
      statusMessage: `Import failed: ${error.message}`,
    });
  }
});