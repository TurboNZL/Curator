import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  theme: text('theme').notNull().default('dark'),
  accentColor: text('accent_color').notNull().default('#3b82f6'),
  playback_mode: text('playback_mode').notNull().default('local'),
  settings: text('settings'), // JSON: { showUnbalancedFirst: boolean, defaultArtistImage?: string, defaultAlbumImage?: string, applyRulesFromAlbum?: boolean }
  playbackRules: text('playback_rules'), // JSON array of { trackAId: string, trackBId: string, playFirstOnShuffle: boolean }
});

export const artists = sqliteTable('artists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  image: text('image'),
  // Removed groups: text('groups'), // JSON string array
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
  artistId: text('artist_id').notNull(), // Primary artist
  // Removed artistIds: text('artist_ids'), // JSON string array for multiple artists
  // Removed credits: text('credits'), // JSON string array for album-level general credits
  artistCredits: text('artist_credits'), // JSON string array for album-level artist-specific credits with roles (role now string[])
  eraId: text('era_id'),
  primaryCover: text('primary_cover'), // New column for the album's primary cover
  defaultReleaseId: text('default_release_id'),
  pendingFiles: text('pending_files'), // JSON string array
  genres: text('genres'), // Added genres to albums
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
  trackId: text('track_id').notNull(),
  order: integer('order').notNull().default(0), // Added order column
}, (table) => ({
  pk: primaryKey({ columns: [table.releaseId, table.trackId] }),
}));

export const tracks = sqliteTable('tracks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  artistId: text('artist_id').notNull(), // Primary artist
  // Removed artistIds: text('artist_ids'), // JSON string array for multiple artists
  artistCredits: text('artist_credits'), // JSON string array for track-level artist-specific credits with roles (role now string[])
  rating: real('rating'), // Balanced rating (0-10), nullable for unrated
  initialRating: real('initial_rating'), // Unbalanced rating, nullable for unrated
  eloScore: real('elo_score').notNull().default(1000), // Internal ELO for calculation
  comparisons: integer('comparisons').notNull().default(0),
  localFilePath: text('local_file_path'),
  spotifyUrl: text('spotify_url'),
  geniusUrl: text('genius_url'),
  youtubeMusicUrl: text('youtube_music_url'),
  bitrate: text('bitrate'),
  bpm: integer('bpm'),
  key: text('key'),
  memories: integer('memories').notNull().default(0),
  queueRules: text('queue_rules'), // JSON: { nextTrackId?: string, forbiddenStandalone?: boolean }
  syncWithAlbumCredits: integer('sync_with_album_credits', { mode: 'boolean' }).notNull().default(true),
  isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
});

export const trackGenres = sqliteTable('track_genres', {
  trackId: text('track_id').notNull(),
  genreId: text('genre_id').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.trackId, table.genreId] }),
}));

export const genres = sqliteTable('genres', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const roleCategories = sqliteTable('role_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  isRemovable: integer('is_removable', { mode: 'boolean' }).notNull().default(true),
});

export const groups = sqliteTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  label: text('label'),
  type: text('type').notNull().default('thematic'), // 'collective', 'thematic', 'relationship'
  isArtistOnly: integer('is_artist_only', { mode: 'boolean' }).notNull().default(false), // Still exists in DB but will be ignored in UI for now
});

export const groupMembers = sqliteTable('group_members', {
  groupId: text('group_id').notNull(),
  entityType: text('entity_type').notNull(), // 'artist', 'album', 'track'
  entityId: text('entity_id').notNull(),
  showOnEntityPage: integer('show_on_entity_page', { mode: 'boolean' }).notNull().default(false), // New column
}, (table) => ({
  pk: primaryKey({ columns: [table.groupId, table.entityType, table.entityId] }),
}));

export const albumTracks = sqliteTable('album_tracks', {
  albumId: text('album_id').notNull(),
  trackId: text('track_id').notNull(),
  order: integer('order').notNull().default(0),
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