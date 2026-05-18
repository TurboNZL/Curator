import { defineEventHandler, readBody, createError } from "h3";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../db";
import { artists } from "../../db/schema"; // Only artists schema for lookup, not insertion
import { eq } from 'drizzle-orm';
import { create as createYoutubeDl } from 'youtube-dl-exec'; 
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import axios from 'axios';

// Set the path to the ffmpeg binary
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
} else {
  console.error("FFmpeg static path not found. Ensure ffmpeg-static is correctly installed.");
}

// Define the path to the locally bundled yt-dlp binary
const ytDlpBinaryPath = path.join(process.cwd(), 'server', 'bin', 'yt-dlp.exe');
// Create a youtube-dl-exec instance that uses our custom binary
const youtubedl = createYoutubeDl(ytDlpBinaryPath);

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
    console.log(`Starting import process for URL: ${url}`);
    
    // Ensure yt-dlp binary exists at the specified path before attempting to use it.
    try {
      await fs.access(ytDlpBinaryPath);
      console.log(`Using yt-dlp binary found at: ${ytDlpBinaryPath}`);
    } catch (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `yt-dlp executable not found at ${ytDlpBinaryPath}. Please download it from https://github.com/yt-dlp/yt-dlp/releases (get the 'yt-dlp.exe' for Windows) and place it in the 'server/bin/' folder.`,
      });
    }

    const uploadBaseDir = path.join(process.cwd(), "public", "uploads");
    const musicUploadDir = path.join(uploadBaseDir, "music");
    const imagesUploadDir = path.join(uploadBaseDir, "images");

    await fs.mkdir(musicUploadDir, { recursive: true });
    await fs.mkdir(imagesUploadDir, { recursive: true });

    // 1. Get info about the URL using yt-dlp
    const info: any = await youtubedl(url, { 
      dumpSingleJson: true,
      noWarnings: true,
      preferFreeFormats: true,
      noPlaylistAsChannel: true, // Prevents treating playlist URLs as channel URLs
    });

    let suggestedAlbumTitle = (info.title || "Untitled Album").trim();
    let suggestedArtistName = (info.uploader || info.artist || "Unknown Artist").trim();

    if (!suggestedAlbumTitle) {
      throw createError({ statusCode: 400, statusMessage: "Could not determine album title from the provided URL." });
    }
    if (!suggestedArtistName) {
      throw createError({ statusCode: 400, statusMessage: "Could not determine artist name from the provided URL." });
    }

    let entries: any[] = [];
    if (info._type === 'playlist' && info.entries && info.entries.length > 0) {
      entries = info.entries;
      // For playlists, often the playlist title is the album title and uploader is the artist
      suggestedAlbumTitle = (info.title || suggestedAlbumTitle).trim();
      suggestedArtistName = (info.uploader || suggestedArtistName).trim();
    } else {
      entries = [info]; 
    }

    if (entries.length === 0) {
      throw createError({ statusCode: 404, statusMessage: "No video entries found for the given URL. Please check the URL and try again." });
    }

    // Attempt to find existing artist for pre-selection in the UI
    const existingArtist = await db.query.artists.findFirst({
      where: eq(artists.name, suggestedArtistName),
    });
    const suggestedArtistId = existingArtist ? existingArtist.id : undefined;

    let suggestedAlbumCover = '';
    const suggestedTracks: { title: string; youtubeMusicUrl: string; localFilePath: string; thumbnailUrl?: string; }[] = [];

    // Download album cover from the first entry's thumbnail if available
    if (entries[0] && entries[0].thumbnail) {
      try {
        const response = await axios.get(entries[0].thumbnail, { responseType: 'arraybuffer' });
        const coverFileName = `${uuidv4()}.jpg`;
        const coverFilePath = path.join(imagesUploadDir, coverFileName);
        await fs.writeFile(coverFilePath, Buffer.from(response.data));
        suggestedAlbumCover = `/uploads/images/${coverFileName}`;
        console.log(`Album cover downloaded: ${suggestedAlbumCover}`);
      } catch (e) {
        console.warn(`Failed to download album cover:`, e);
      }
    }


    for (const entry of entries) {
      if (!entry || !entry.id) continue;

      const trackTitle = (entry.title || "Unknown Track").trim();
      const youtubeMusicUrl = entry.webpage_url || `https://www.youtube.com/watch?v=${entry.id}`;
      const thumbnailUrl = entry.thumbnail;

      // Sanitize filename for local storage
      const cleanTrackTitle = trackTitle.replace(/[^\w\s-]/g, '').trim().substring(0, 100);
      const localFilename = `${cleanTrackTitle}_${uuidv4()}.mp3`;
      const localFilepathFull = path.join(musicUploadDir, localFilename);
      const relativeLocalFilePath = `/uploads/music/${localFilename}`;

      // Download audio using yt-dlp and convert to MP3 with ffmpeg
      try {
        await new Promise<void>((resolve, reject) => {
          const childProcess = youtubedl.exec(youtubeMusicUrl, { 
            extractAudio: true,
            audioFormat: 'mp3',
            output: localFilepathFull,
            noWarnings: true,
            preferFreeFormats: true,
            ffmpegLocation: ffmpegStatic || undefined,
            format: 'bestaudio', // Prioritize best audio quality
          });

          childProcess.on('error', (err: any) => reject(new Error(`Failed to download audio for ${trackTitle}: ${err.message}`)));
          childProcess.on('close', (code: number) => {
            if (code === 0) resolve();
            else reject(new Error(`yt-dlp exited with code ${code} for ${trackTitle}`));
          });
        });
        console.log(`Audio downloaded and converted for ${trackTitle}: ${relativeLocalFilePath}`);
      } catch (downloadError: any) {
        console.warn(`Skipping track "${trackTitle}" due to download error: ${downloadError.message}`);
        continue; // Skip this track if download fails
      }
      
      suggestedTracks.push({
        title: trackTitle,
        youtubeMusicUrl,
        localFilePath: relativeLocalFilePath,
        thumbnailUrl: thumbnailUrl
      });
    }

    if (suggestedTracks.length === 0) {
      throw createError({ statusCode: 500, statusMessage: "No tracks could be downloaded from the provided URL." });
    }

    return {
      success: true,
      suggestedAlbumTitle,
      suggestedArtistName,
      suggestedArtistId, // For pre-selecting if artist exists
      suggestedAlbumCover,
      suggestedTracks,
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