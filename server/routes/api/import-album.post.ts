import { defineEventHandler, readBody, createError } from "h3";
import pkg from "yt-dlp-exec";
const { exec } = pkg;
import path from "path";
import fs from "fs";
import axios from "axios";
import nodeID3 from "node-id3";
import { db } from "../../db";
import { albums, tracks, artists, albumTracks } from "../../db/schema";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { url } = body;

  if (!url) throw createError({ statusCode: 400, statusMessage: "URL is required" });

  try {
    const metadata = await exec(url, { dumpSingleJson: true, noWarnings: true, preferFreeFormats: true });
    const info = JSON.parse(metadata.stdout);
    const entries = info._type === 'playlist' ? info.entries : [info];
    
    if (!entries || entries.length === 0) throw new Error("No tracks found");

    const albumTitle = info.title || "Unknown Album";
    const albumArtistName = info.uploader || info.artist || "Unknown Artist";
    const albumId = Math.random().toString(36).substring(7);

    const uploadDir = path.join(process.cwd(), "public", "uploads", "music");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    let artistId = Math.random().toString(36).substring(7);
    const existingArtists = await db.select().from(artists);
    const existingArtist = existingArtists.find(a => a.name.toLowerCase() === albumArtistName.toLowerCase());
    if (existingArtist) artistId = existingArtist.id;
    else await db.insert(artists).values({ id: artistId, name: albumArtistName });

    await db.insert(albums).values({ id: albumId, title: albumTitle, artistId: artistId, artistIds: JSON.stringify([artistId]), covers: JSON.stringify([]) });

    for (const entry of entries) {
      if (!entry) continue;
      const trackId = Math.random().toString(36).substring(7);
      const trackTitle = entry.title || "Unknown Track";
      const fileName = `${trackId}.mp3`;
      const filePath = path.join(uploadDir, fileName);

      await exec(entry.webpage_url || entry.url, { extractAudio: true, audioFormat: "mp3", output: filePath.replace('.mp3', '.%(ext)s') });

      const tags: any = { title: trackTitle, artist: albumArtistName, album: albumTitle };
      if (entry.thumbnail) {
        try {
          const response = await axios.get(entry.thumbnail, { responseType: 'arraybuffer' });
          tags.image = { mime: "image/jpeg", type: { id: 3, name: "front cover" }, description: "Cover", imageBuffer: Buffer.from(response.data) };
        } catch (e) {}
      }
      if (fs.existsSync(filePath)) nodeID3.write(tags, filePath);

      await db.insert(tracks).values({ id: trackId, title: trackTitle, artistId: artistId, artistIds: JSON.stringify([artistId]), localFilePath: `/uploads/music/${fileName}`, youtubeMusicUrl: entry.webpage_url || entry.url, eloScore: 1000, comparisons: 0, memories: 0, syncWithAlbum: true });
      await db.insert(albumTracks).values({ albumId: albumId, trackId: trackId });
    }

    return { success: true, albumId };
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: `Import failed: ${error.message}` });
  }
});