import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  theme: text('theme').notNull().default('dark'),
  accentColor: text('accent_color').notNull().default('#3b82f6'),
  playback_mode: text('playback_mode').notNull().default('local'),
  settings: text('settings'), 
  playbackRules: text('playback_rules'), 
});

export const artists = sqliteTable('artists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  image: text('image'),
  groups: text('groups'), 
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
  artistIds: text('artist_ids'), 
  eraId: text('era_id'),
  covers: text('covers'), 
  defaultReleaseId: text('default_release_id'),
  pendingFiles: text('pending_files'), 
  genres: text('genres'), 
  producers: text('producers'), 
  writers: text('writers'), 
  credits: text('credits'), 
});

export const releaseTypes = sqliteTable('release_types', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
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
  track_id: text('track_id').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.releaseId, table.track_id] }),
}));

export const tracks = sqliteTable('tracks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  artistId: text('artist_id').notNull(),
  artistIds: text('artist_ids'), 
  rating: real('rating'), 
  initialRating: real('initial_rating'), 
  eloScore: real('elo_score').notNull().default(1000), 
  comparisons: integer('comparisons').notNull().default(0),
  localFilePath: text('local_file_path'),
  spotifyUrl: text('spotify_url'),
  geniusUrl: text('genius_url'),
  soundcloudUrl: text('soundcloud_url'),
  youtubeMusicUrl: text('youtube_music_url'),
  genres: text('genres'), 
  producers: text('producers'), 
  writers: text('writers'), 
  credits: text('credits'), 
  bitrate: text('bitrate'),
  bpm: integer('bpm'),
  key: text('key'),
  memories: integer('memories').notNull().default(0),
  queueRules: text('queue_rules'), 
  syncWithAlbum: integer('sync_with_album', { mode: 'boolean' }).notNull().default(true),
});

export const groups = sqliteTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  label: text('label'),
  type: text('type').notNull().default('thematic'), 
  isArtistOnly: integer('is_artist_only', { mode: 'boolean' }).notNull().default(false),
  isEra: integer('is_era', { mode: 'boolean' }).notNull().default(false),
  startDate: text('start_date'),
  endDate: text('end_date'),
});

export const groupMembers = sqliteTable('group_members', {
  groupId: text('group_id').notNull(),
  entityType: text('entity_type').notNull(), 
  entityId: text('entity_id').notNull(),
  isVisible: integer('is_visible', { mode: 'boolean' }).notNull().default(true),
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
  type: text('type').notNull().default('track'),
  entries: text('entries'), // JSON array of { type: 'track'|'album', id: string }
  sortConfig: text('sort_config'), // JSON: { field: string, direction: 'asc'|'desc' }
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
  duration: integer('duration'), 
  sourceType: text('source_type'), 
  sourceId: text('source_id'),
  isSkip: integer('is_skip', { mode: 'boolean' }).notNull().default(false),
});

export const votes = sqliteTable('votes', {
  id: text('id').primaryKey(),
  winnerId: text('winner_id'), 
  loserId: text('loser_id'),
  trackAId: text('track_a_id').notNull(),
  trackBId: text('track_b_id').notNull(),
  isEqual: integer('is_equal', { mode: 'boolean' }).notNull().default(false),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
});