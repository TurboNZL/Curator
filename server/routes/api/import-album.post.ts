import { defineEventHandler, readBody, createError } from "h3";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto"; 
import { db } from "../../db";
import { artists } from "../../db/schema";
import { eq } from 'drizzle-orm';
import { create as createYoutubeDl } from 'youtube-dl-exec'; 
import axios from 'axios';

// Define the path to the locally bundled yt-dlp binary
const ytDlpBinaryPath = path.join(process.cwd(), 'server', 'bin', 'yt-dlp.exe');
// Create a youtube-dl-exec instance that uses our custom binary
const youtubedl = createYoutubeDl(ytDlpBinaryPath);

// Define the directory where ffmpeg and ffprobe executables should reside
const ffmpegAndFfprobeBinDir = path.join(process.cwd(), 'server', 'bin');

const CONCURRENCY_LIMIT = 3; // Number of simultaneous downloads

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

    // Ensure ffmpeg and ffprobe binaries exist in the designated directory
    try {
      await fs.access(path.join(ffmpegAndFfprobeBinDir, 'ffmpeg.exe')); // Assuming Windows executables
      await fs.access(path.join(ffmpegAndFfprobeBinDir, 'ffprobe.exe')); // Assuming Windows executables
      console.log(`ffmpeg and ffprobe binaries found in: ${ffmpegAndFfprobeBinDir}`);
    } catch (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `ffmpeg or ffprobe executables not found in ${ffmpegAndFfprobeBinDir}. Please ensure they are copied there as per instructions.`,
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
    
    // Download album cover from the first entry's thumbnail if available
    if (entries[0] && entries[0].thumbnail) {
      try {
        const response = await axios.get(entries[0].thumbnail, { responseType: 'arraybuffer' });
        const coverFileName = `${randomUUID()}.jpg`; // Use randomUUID for cover
        const coverFilePath = path.join(imagesUploadDir, coverFileName);
        await fs.writeFile(coverFilePath, Buffer.from(response.data));
        suggestedAlbumCover = `/uploads/images/${coverFileName}`;
        console.log(`Album cover downloaded: ${suggestedAlbumCover}`);
      } catch (e) {
        console.warn(`Failed to download album cover:`, e);
      }
    }

    const suggestedTracks: { title: string; youtubeMusicUrl: string; localFilePath: string; thumbnailUrl?: string; }[] = [];
    const downloadErrors: string[] = [];

    // Process entries in chunks to limit concurrency
    for (let i = 0; i < entries.length; i += CONCURRENCY_LIMIT) {
      const chunk = entries.slice(i, i + CONCURRENCY_LIMIT);
      const chunkPromises = chunk.map(async (entry) => {
        if (!entry || !entry.id) return null;

        const trackTitle = (entry.title || "Unknown Track").trim();
        const youtubeMusicUrl = entry.webpage_url || `https://www.youtube.com/watch?v=${entry.id}`;
        const thumbnailUrl = entry.thumbnail;

        // Sanitize filename for local storage
        const cleanTrackTitle = trackTitle.replace(/[^\w\s-]/g, '').trim().substring(0, 100);
        const localFilename = `${cleanTrackTitle}_${randomUUID()}.mp3`; // Use randomUUID for track audio file
        const localFilepathFull = path.join(musicUploadDir, localFilename);
        const relativeLocalFilePath = `/uploads/music/${localFilename}`;

        try {
          await new Promise<void>((resolve, reject) => {
            const childProcess = youtubedl.exec(youtubeMusicUrl, { 
              extractAudio: true,
              audioFormat: 'mp3',
              output: localFilepathFull,
              noWarnings: true,
              preferFreeFormats: true,
              ffmpegLocation: ffmpegAndFfprobeBinDir,
              format: 'bestaudio', 
            });

            childProcess.on('error', (err: any) => reject(new Error(`Failed to download audio for ${trackTitle}: ${err.message}`)));
            childProcess.on('close', (code: number) => {
              if (code === 0) resolve();
              else reject(new Error(`yt-dlp exited with code ${code} for ${trackTitle}`));
            });
          });
          console.log(`Audio downloaded and converted for ${trackTitle}: ${relativeLocalFilePath}`);
          return {
            title: trackTitle,
            youtubeMusicUrl,
            localFilePath: relativeLocalFilePath,
            thumbnailUrl: thumbnailUrl
          };
        } catch (downloadError: any) {
          console.warn(`Skipping track "${trackTitle}" due to download error: ${downloadError.message}`);
          downloadErrors.push(`Skipped "${trackTitle}": ${downloadError.message}`);
          return null;
        }
      });

      const chunkResults = (await Promise.all(chunkPromises)).filter(Boolean);
      suggestedTracks.push(...chunkResults);
    }
    
    if (suggestedTracks.length === 0) {
      if (downloadErrors.length > 0) {
        throw createError({ statusCode: 500, statusMessage: `No tracks could be downloaded from the provided URL. Individual track errors: ${downloadErrors.join('; ')}` });
      }
      throw createError({ statusCode: 500, statusMessage: "No tracks could be downloaded from the provided URL." });
    }

    if (downloadErrors.length > 0) {
      console.warn(`Some tracks failed to download: ${downloadErrors.join('; ')}`);
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