import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  theme: text('theme').notNull().default('dark'),
  accentColor: text('accent_color').notNull().default('#3b82f6'),
  playbackMode: text('playback_mode').notNull().default('local'),
});

export const artists = sqliteTable('artists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  image: text('image'),
  bio: text('bio'),
  groups: text('groups'), // JSON string array
});

export const eras = sqliteTable('eras', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  artistId: text('artist_id').notNull(),
  description: text('description'),
});

export const albums = sqliteTable('albums', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  artistId: text('artist_id').notNull(),
  eraId: text('era_id'),
  covers: text('covers'), // JSON string array
  type: text('type').notNull().default('Full Album'),
});

export const releases = sqliteTable('releases', {
  id: text('id').primaryKey(),
  albumId: text('album_id').notNull(),
  title: text('title').notNull(),
  coverImage: text('cover_image'),
  releaseDate: text('release_date'),
  spotifyUri: text('spotify_uri'),
});

export const tracks = sqliteTable('tracks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  artistId: text('artist_id').notNull(),
  rating: real('rating').notNull().default(0),
  initialRating: real('initial_rating').notNull().default(0),
  localFilePath: text('local_file_path'),
  spotifyUrl: text('spotify_url'),
  geniusUrl: text('genius_url'),
  soundcloudUrl: text('soundcloud_url'),
  youtubeMusicUrl: text('youtube_music_url'),
  genres: text('genres'), // JSON string array
  producers: text('producers'), // JSON string array
  bitrate: text('bitrate'),
});

export const albumTracks = sqliteTable('album_tracks', {
  albumId: text('album_id').notNull(),
  trackId: text('track_id').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.albumId, table.trackId] }),
}));

export const playlists = sqliteTable('playlists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  coverImage: text('cover_image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const playlistTracks = sqliteTable('playlist_tracks', {
  playlistId: text('playlist_id').notNull(),
  trackId: text('track_id').notNull(),
  order: integer('order').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.playlistId, table.trackId] }),
}));

export const timeline = sqliteTable('timeline', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  entityId: text('entity_id'),
});

export const playbackLogs = sqliteTable('playback_logs', {
  id: text('id').primaryKey(),
  trackId: text('track_id').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  duration: integer('duration'), // seconds played
});