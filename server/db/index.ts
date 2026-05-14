import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const dataDir = join(process.cwd(), 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir);
}

const sqlite = new Database(join(dataDir, 'curator.db'));
export const db = drizzle(sqlite, { schema });

// Simple migration/init
import { sql } from 'drizzle-orm';

export function initDb() {
  // In a real app we'd use drizzle-kit push or migrations
  // For simplicity here, we'll just ensure tables exist if they don't
  // This is a bit hacky but works for a local-first setup without complex migration runners
  const tables = [
    `CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, name TEXT NOT NULL, theme TEXT NOT NULL DEFAULT 'dark', accent_color TEXT NOT NULL DEFAULT '#3b82f6', playback_mode TEXT NOT NULL DEFAULT 'local')`,
    `CREATE TABLE IF NOT EXISTS artists (id TEXT PRIMARY KEY, name TEXT NOT NULL, image TEXT, bio TEXT, groups TEXT)`,
    `CREATE TABLE IF NOT EXISTS eras (id TEXT PRIMARY KEY, name TEXT NOT NULL, artist_id TEXT NOT NULL, description TEXT)`,
    `CREATE TABLE IF NOT EXISTS albums (id TEXT PRIMARY KEY, title TEXT NOT NULL, artist_id TEXT NOT NULL, era_id TEXT, covers TEXT, type TEXT NOT NULL DEFAULT 'Full Album')`,
    `CREATE TABLE IF NOT EXISTS releases (id TEXT PRIMARY KEY, album_id TEXT NOT NULL, title TEXT NOT NULL, cover_image TEXT, release_date TEXT, spotify_uri TEXT)`,
    `CREATE TABLE IF NOT EXISTS tracks (id TEXT PRIMARY KEY, title TEXT NOT NULL, artist_id TEXT NOT NULL, rating REAL NOT NULL DEFAULT 0, initial_rating REAL NOT NULL DEFAULT 0, local_file_path TEXT, spotify_uri TEXT, youtube_url TEXT, genres TEXT, producers TEXT, bitrate TEXT)`,
    `CREATE TABLE IF NOT EXISTS album_tracks (album_id TEXT NOT NULL, track_id TEXT NOT NULL, PRIMARY KEY(album_id, track_id))`,
    `CREATE TABLE IF NOT EXISTS playlists (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, cover_image TEXT, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS playlist_tracks (playlist_id TEXT NOT NULL, track_id TEXT NOT NULL, "order" INTEGER NOT NULL, PRIMARY KEY(playlist_id, track_id))`,
    `CREATE TABLE IF NOT EXISTS timeline (id TEXT PRIMARY KEY, type TEXT NOT NULL, timestamp INTEGER NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, entity_id TEXT)`
  ];

  for (const table of tables) {
    sqlite.prepare(table).run();
  }
}
