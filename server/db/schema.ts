import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  theme: text('theme').notNull().default('dark'),
  accentColor: text('accent_color').notNull().default('#3b82f6'),
  playbackMode: text('playback_mode').notNull().default('local'),
  settings: text('settings'), // JSON: { showUnbalancedFirst: boolean }
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

export const releaseTracks = sqliteTable('release_tracks', {
  releaseId: text('release_id').notNull(),
  trackId: text('track_id').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.releaseId, table.trackId] }),
}));

export const tracks = sqliteTable('tracks', {

  id: text('id').primaryKey(),
  title: text('title').notNull(),
  artistId: text('artist_id').notNull(),
  rating: real('rating').notNull().default(0), // Balanced rating (0-10)
  initialRating: real('initial_rating').notNull().default(0), // Unbalanced rating
  eloScore: real('elo_score').notNull().default(1000), // Internal ELO for calculation
  comparisons: integer('comparisons').notNull().default(0),
  localFilePath: text('local_file_path'),
  spotifyUrl: text('spotify_url'),
  geniusUrl: text('genius_url'),
  soundcloudUrl: text('soundcloud_url'),
  youtubeMusicUrl: text('youtube_music_url'),
  genres: text('genres'), // JSON string array
  producers: text('producers'), // JSON string array
  writers: text('writers'), // JSON string array
  credits: text('credits'), // JSON string array
  bitrate: text('bitrate'),
  bpm: integer('bpm'),
  key: text('key'),
  isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
  queueRules: text('queue_rules'), // JSON: { nextTrackId?: string, forbiddenStandalone?: boolean }
});

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  entityType: text('entity_type').notNull(), // 'artist', 'album', 'track'
  entityId: text('entity_id').notNull(),
  label: text('label'),
  content: text('content').notNull(),
  isLinked: integer('is_linked', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const groups = sqliteTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull().default('thematic'), // 'collective', 'thematic', 'relationship'
});

export const groupMembers = sqliteTable('group_members', {
  groupId: text('group_id').notNull(),
  entityType: text('entity_type').notNull(), // 'artist', 'album', 'track'
  entityId: text('entity_id').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.groupId, table.entityType, table.entityId] }),
}));

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
  sourceType: text('source_type'), // 'album', 'playlist', 'shuffle', 'search'
  sourceId: text('source_id'),
  isSkip: integer('is_skip', { mode: 'boolean' }).notNull().default(false),
});

export const votes = sqliteTable('votes', {
  id: text('id').primaryKey(),
  winnerId: text('winner_id'), // null if equal
  loserId: text('loser_id'),
  trackAId: text('track_a_id').notNull(),
  trackBId: text('track_b_id').notNull(),
  isEqual: integer('is_equal', { mode: 'boolean' }).notNull().default(false),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
});
