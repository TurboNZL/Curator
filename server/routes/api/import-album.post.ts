import { defineEventHandler, readBody, createError } from "h3";
import pkg from "yt-dlp-exec";
const { exec } = pkg;
import path from "path";
import fs from "fs";
import axios from "axios";
import nodeID3 from "node-id3";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../db";
import { albums, tracks, artists, albumTracks } from "../../db/schema";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { url } = body;

  if (!url) {
    throw createError({
      statusCode: 400,
      statusMessage: "URL is required",
    });
  }

  try {
    console.log(`Starting import for URL: ${url}`);

    // 1. Get metadata using yt-dlp
    const metadata = await exec(url, {
      dumpSingleJson: true,
      noWarnings: true,
      preferFreeFormats: true,
    });

    const info = JSON.parse(metadata.stdout);
    
    // Handle both single video and playlist
    const entries = info._type === 'playlist' ? info.entries : [info];
    
    if (!entries || entries.length === 0) {
      throw new Error("No tracks found in the provided URL");
    }

    const albumTitle = info.title || "Unknown Album";
    const albumArtistName = info.uploader || info.artist || "Unknown Artist";
    const albumId = uuidv4();

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), "public", "uploads", "music");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 2. Find or create artist
    let artistId = uuidv4();
    const existingArtists = await db.select().from(artists);
    const existingArtist = existingArtists.find(a => a.name.toLowerCase() === albumArtistName.toLowerCase());
    
    if (existingArtist) {
      artistId = existingArtist.id;
    } else {
      await db.insert(artists).values({
        id: artistId,
        name: albumArtistName,
      });
    }

    // 3. Create Album
    await db.insert(albums).values({
      id: albumId,
      title: albumTitle,
      artistId: artistId,
      artistIds: JSON.stringify([artistId]),
      covers: JSON.stringify([]),
    });

    // 4. Process each track
    const results = [];
    for (const entry of entries) {
      if (!entry) continue;

      const trackId = uuidv4();
      const trackTitle = entry.title || "Unknown Track";
      const fileName = `${trackId}.mp3`;
      const filePath = path.join(uploadDir, fileName);

      console.log(`Downloading track: ${trackTitle}`);

      // Download and convert to mp3
      await exec(entry.webpage_url || entry.url, {
        extractAudio: true,
        audioFormat: "mp3",
        output: filePath.replace('.mp3', '.%(ext)s'),
      });

      // 5. Add metadata (ID3 tags)
      const tags: any = {
        title: trackTitle,
        artist: albumArtistName,
        album: albumTitle,
      };

      // Download thumbnail if available
      if (entry.thumbnail) {
        try {
          const response = await axios.get(entry.thumbnail, { responseType: 'arraybuffer' });
          tags.image = {
            mime: "image/jpeg",
            type: { id: 3, name: "front cover" },
            description: "Cover",
            imageBuffer: Buffer.from(response.data),
          };
        } catch (e) {
          console.warn(`Failed to download thumbnail for ${trackTitle}`);
        }
      }

      if (fs.existsSync(filePath)) {
        nodeID3.write(tags, filePath);
      }

      // 6. Save to DB
      await db.insert(tracks).values({
        id: trackId,
        title: trackTitle,
        artistId: artistId,
        artistIds: JSON.stringify([artistId]),
        localFilePath: `/uploads/music/${fileName}`,
        youtubeMusicUrl: entry.webpage_url || entry.url,
      });

      await db.insert(albumTracks).values({
        albumId: albumId,
        trackId: trackId,
      });

      results.push({ id: trackId, title: trackTitle });
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
