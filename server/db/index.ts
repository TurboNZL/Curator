import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const dataDir = join(process.cwd(), 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = join(dataDir, 'curator.db');
const client = createClient({
  url: `file:${dbPath}`,
});

export const db = drizzle(client, { schema });

export async function initDb() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, name TEXT NOT NULL, theme TEXT NOT NULL DEFAULT 'dark', accent_color TEXT NOT NULL DEFAULT '#3b82f6', playback_mode TEXT NOT NULL DEFAULT 'local', settings TEXT, playback_rules TEXT)`,
    `CREATE TABLE IF NOT EXISTS artists (id TEXT PRIMARY KEY, name TEXT NOT NULL, image TEXT, groups TEXT)`,
    `CREATE TABLE IF NOT EXISTS eras (id TEXT PRIMARY KEY, name TEXT NOT NULL, artist_id TEXT NOT NULL, description TEXT)`,
    // Updated albums table creation to remove 'covers' column
    `CREATE TABLE IF NOT EXISTS albums (id TEXT PRIMARY KEY, title TEXT NOT NULL, artist_id TEXT NOT NULL, artist_ids TEXT, era_id TEXT, primary_cover TEXT, default_release_id TEXT, pending_files TEXT, credits TEXT)`,

    `CREATE TABLE IF NOT EXISTS release_types (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE)`,
    `CREATE TABLE IF NOT EXISTS releases (id TEXT PRIMARY KEY, album_id TEXT NOT NULL, title TEXT NOT NULL, cover_image TEXT, release_date TEXT, spotify_uri TEXT)`,
    `CREATE TABLE IF NOT EXISTS release_tracks (release_id TEXT NOT NULL, track_id TEXT NOT NULL, "order" INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(release_id, track_id))`,
    `CREATE TABLE IF NOT EXISTS tracks (id TEXT PRIMARY KEY, title TEXT NOT NULL, artist_id TEXT NOT NULL, artist_ids TEXT, rating REAL, initial_rating REAL, elo_score REAL NOT NULL DEFAULT 1000, comparisons INTEGER NOT NULL DEFAULT 0, local_file_path TEXT, spotify_url TEXT, genius_url TEXT, youtube_music_url TEXT, genres TEXT, producers TEXT, writers TEXT, credits TEXT, bitrate TEXT, bpm INTEGER, key TEXT, memories INTEGER NOT NULL DEFAULT 0, queue_rules TEXT, sync_with_album_credits INTEGER NOT NULL DEFAULT TRUE)`,
    `CREATE TABLE IF NOT EXISTS album_tracks (album_id TEXT NOT NULL, track_id TEXT NOT NULL, "order" INTEGER NOT NULL, PRIMARY KEY(album_id, track_id))`,
    `CREATE TABLE IF NOT EXISTS playlists (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, cover_image TEXT, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS playlist_tracks (playlist_id TEXT NOT NULL, track_id TEXT NOT NULL, "order" INTEGER NOT NULL, PRIMARY KEY(playlist_id, track_id))`,
    `CREATE TABLE IF NOT EXISTS timeline (id TEXT PRIMARY KEY, type TEXT NOT NULL, timestamp INTEGER NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, entity_id TEXT)`,
    `CREATE TABLE IF NOT EXISTS playback_logs (id TEXT PRIMARY KEY, track_id TEXT NOT NULL, timestamp INTEGER NOT NULL, duration INTEGER, source_type TEXT, source_id TEXT, is_skip INTEGER NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS votes (id TEXT PRIMARY KEY, winner_id TEXT, loser_id TEXT, track_a_id TEXT NOT NULL, track_b_id TEXT NOT NULL, is_equal INTEGER NOT NULL DEFAULT 0, timestamp INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS groups (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, label TEXT, type TEXT NOT NULL DEFAULT 'thematic', is_artist_only INTEGER NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS group_members (group_id TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, PRIMARY KEY(group_id, entity_type, entity_id))`

  ];

  for (const table of tables) {
    try {
      await client.execute(table);
    } catch (e) {
      console.error(`Error creating table: ${e}`);
    }
  }

  // Migration: Ensure new columns exist
  const migrations = [
    // Removed ALTER TABLE for 'covers' column
    `ALTER TABLE profiles ADD COLUMN settings TEXT`,
    `ALTER TABLE tracks ADD COLUMN elo_score REAL NOT NULL DEFAULT 1000`,
    `ALTER TABLE tracks ADD COLUMN comparisons INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE tracks ADD COLUMN spotify_url TEXT`,
    `ALTER TABLE tracks ADD COLUMN genius_url TEXT`,
    `ALTER TABLE tracks ADD COLUMN youtube_music_url TEXT`,
    `ALTER TABLE tracks ADD COLUMN bpm INTEGER`,
    `ALTER TABLE tracks ADD COLUMN key TEXT`,
    `ALTER TABLE tracks ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE tracks ADD COLUMN writers TEXT`,
    `ALTER TABLE tracks ADD COLUMN credits TEXT`,
    `ALTER TABLE tracks ADD COLUMN queue_rules TEXT`,
    `ALTER TABLE playback_logs ADD COLUMN source_type TEXT`,
    `ALTER TABLE playback_logs ADD COLUMN source_id TEXT`,
    `ALTER TABLE playback_logs ADD COLUMN is_skip INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE albums ADD COLUMN default_release_id TEXT`,
    `ALTER TABLE albums ADD COLUMN pending_files TEXT`,
    `ALTER TABLE tracks ADD COLUMN memories INTEGER NOT NULL DEFAULT 0`,

    `ALTER TABLE profiles ADD COLUMN playback_rules TEXT`,
    `ALTER TABLE groups ADD COLUMN is_artist_only INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE groups ADD COLUMN label TEXT`,
    `ALTER TABLE albums ADD COLUMN artist_ids TEXT`,
    `ALTER TABLE tracks ADD COLUMN artist_ids TEXT`,
    `ALTER TABLE group_members ADD COLUMN show_on_entity_page INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE albums ADD COLUMN credits TEXT`,
    `ALTER TABLE album_tracks ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE releases ADD COLUMN release_type_id TEXT`,
    `ALTER TABLE tracks ADD COLUMN sync_with_album_credits INTEGER NOT NULL DEFAULT TRUE`,
    `ALTER TABLE release_tracks ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE albums ADD COLUMN primary_cover TEXT`,
  ];

  for (const migration of migrations) {
    try {
      await client.execute(migration);
    } catch (e) {
      // Ignore errors if columns already exist
    }
  }
}