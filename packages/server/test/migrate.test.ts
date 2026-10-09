import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { replayVotes } from '@curator/core';
import { Store } from '../src/db.ts';
import { migrateLegacy, unwrapJson } from '../src/migrate-legacy.ts';

const { DatabaseSync } = process.getBuiltinModule('node:sqlite');
const twice = (v: unknown) => JSON.stringify(JSON.stringify(v));
let dir: string, store: Store;

function legacyDb(path: string) {
  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE artists (id TEXT PRIMARY KEY, name TEXT, image TEXT, bio TEXT, "groups" TEXT);
    CREATE TABLE albums (id TEXT PRIMARY KEY, title TEXT, artist_id TEXT, era_id TEXT, covers TEXT, type TEXT, default_release_id TEXT, pending_files TEXT, artist_ids TEXT, credits TEXT, primary_cover TEXT, artist_credits TEXT, genres TEXT);
    CREATE TABLE tracks (id TEXT PRIMARY KEY, title TEXT, artist_id TEXT, rating REAL, initial_rating REAL, local_file_path TEXT, genres TEXT, bitrate TEXT, spotify_url TEXT, genius_url TEXT, youtube_music_url TEXT, elo_score REAL, comparisons INTEGER, bpm INTEGER, key TEXT, is_favorite INTEGER, queue_rules TEXT, memories INTEGER, artist_ids TEXT, sync_with_album_credits INTEGER, artist_credits TEXT);
    CREATE TABLE album_tracks (album_id TEXT, track_id TEXT, "order" INTEGER);
    CREATE TABLE releases (id TEXT PRIMARY KEY, album_id TEXT, title TEXT, cover_image TEXT, release_date TEXT);
    CREATE TABLE release_tracks (release_id TEXT, track_id TEXT, "order" INTEGER);
    CREATE TABLE genres (id TEXT PRIMARY KEY, name TEXT);
    CREATE TABLE track_genres (track_id TEXT, genre_id TEXT);
    CREATE TABLE votes (id TEXT PRIMARY KEY, winner_id TEXT, loser_id TEXT, track_a_id TEXT, track_b_id TEXT, is_equal INTEGER, timestamp INTEGER);
    CREATE TABLE playback_logs (id TEXT PRIMARY KEY, track_id TEXT, timestamp INTEGER, duration REAL, source_type TEXT, source_id TEXT, is_skip INTEGER);
  `);
  const ins = (sql: string, ...a: unknown[]) => db.prepare(sql).run(...(a as never[]));
  ins(`INSERT INTO artists VALUES ('a1','Drake','/uploads/images/a.jpg',NULL,'[]')`);
  ins(`INSERT INTO artists VALUES ('a2','PARTYNEXTDOOR',NULL,NULL,'[]')`);
  ins(`INSERT INTO albums VALUES ('al1','Album','a1',NULL,'["/uploads/images/c.jpg"]','Full Album',NULL,'[]',?,NULL,NULL,?,?)`, twice(['PARTYNEXTDOOR']), twice([{ artistId: 'a1', role: ['Lead artist'] }]), twice(['Hip Hop']));
  // three encodings of credits on three tracks: single, double, NULL
  ins(`INSERT INTO tracks VALUES ('t1','One','a1',5,0,'/uploads/music/one.mp3','[]','320kbps',NULL,NULL,NULL,1016,1,NULL,NULL,1,'{}',0,'["a1"]',1,?)`, JSON.stringify([{ artistId: 'a1', role: ['Lead artist'] }]));
  ins(`INSERT INTO tracks VALUES ('t2','Two','a1',5,3,'/uploads/music/missing.mp3','[]','320kbps',NULL,NULL,NULL,984,1,NULL,NULL,0,?,2,'["Jorja Smith"]',0,?)`, twice({}), twice([{ artistId: 'a1', role: 'Lead artist' }]));
  ins(`INSERT INTO tracks VALUES ('t3','Three','a1',5,0,'../../etc/passwd','[]',NULL,NULL,NULL,NULL,1000,0,NULL,NULL,0,'{}',0,NULL,1,NULL)`);
  ins(`INSERT INTO album_tracks VALUES ('al1','t2',2), ('al1','t1',1), ('al1','ghost',3), ('gone','t1',1)`);
  ins(`INSERT INTO releases VALUES ('r1','al1','Streaming',NULL,'2020-01-01'), ('r2','gone','Orphan',NULL,NULL)`);
  ins(`INSERT INTO release_tracks VALUES ('r1','t2',1), ('r1','t1',0), ('r1','ghost',2)`);
  ins(`INSERT INTO genres VALUES ('g1','Hip Hop'), ('g2','Dance')`);
  ins(`INSERT INTO track_genres VALUES ('t2','g2'), ('t2','nope'), ('ghost','g1')`);
  // t1 beat a deleted track; t1 beat t2
  ins(`INSERT INTO votes VALUES ('v1','t1','ghost','t1','ghost',0,100), ('v2','t1','t2','t1','t2',0,200)`);
  ins(`INSERT INTO playback_logs VALUES ('p1','t1',300,10.5,'album','al1',0), ('p2','ghost',301,1,NULL,NULL,0)`);
  db.close();
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'curator-mig-'));
  mkdirSync(join(dir, 'data', 'tmp'), { recursive: true });
  store = new Store(join(dir, 'data'));
});
afterEach(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });

describe('unwrapJson', () => {
  it('handles every encoding depth and garbage', () => {
    const v = [{ a: 1 }];
    expect(unwrapJson(v, [])).toEqual(v);
    expect(unwrapJson(JSON.stringify(v), [])).toEqual(v);
    expect(unwrapJson(twice(v), [])).toEqual(v);
    expect(unwrapJson(null, ['d'])).toEqual(['d']);
    expect(unwrapJson('not json', [])).toEqual([]);
    expect(unwrapJson('{}', [])).toEqual([]); // wrong shape -> fallback
    expect(unwrapJson(twice({}), {})).toEqual({});
  });
});

describe('migrateLegacy', () => {
  const setup = async () => {
    const pub = join(dir, 'public');
    mkdirSync(join(pub, 'uploads', 'music'), { recursive: true });
    mkdirSync(join(pub, 'uploads', 'images'), { recursive: true });
    writeFileSync(join(pub, 'uploads', 'music', 'one.mp3'), 'AUDIO-ONE');
    writeFileSync(join(pub, 'uploads', 'images', 'a.jpg'), 'IMG-A');
    writeFileSync(join(pub, 'uploads', 'images', 'c.jpg'), 'IMG-C');
    legacyDb(join(dir, 'old.db'));
    const opts = { legacyDb: join(dir, 'old.db'), publicDir: pub, store, dataDir: join(dir, 'data'), now: 5 };
    return { opts, report: await migrateLegacy(opts) };
  };
  const rec = (table: string, id: string) => store.pull(0, 10000).records.find((r) => r.table === table && r.id === id)!.data as any;

  it('normalises encodings and folds legacy artist refs into credits', async () => {
    const { report } = await setup();
    expect(rec('tracks', 't1').credits).toEqual([{ artistId: 'a1', role: ['Lead artist'] }]);
    expect(rec('tracks', 't2').credits).toEqual([ // string role -> array, plus the ignored "Jorja Smith"
      { artistId: 'a1', role: ['Lead artist'] },
      expect.objectContaining({ role: ['Lead artist'] }),
    ]);
    expect(report.createdArtists).toEqual(['Jorja Smith']);
    expect(rec('albums', 'al1').credits.map((c: any) => c.artistId)).toEqual(['a1', 'a2']); // name resolved to existing artist
    expect(rec('albums', 'al1').genres).toEqual(['Hip Hop']);
    expect(rec('tracks', 't2').queueRules).toEqual({});
    expect(rec('tracks', 't2').initialRating).toBe(3);
    expect(rec('tracks', 't1').initialRating).toBeNull(); // legacy 0 meant "unset"
    expect(rec('tracks', 't3').credits).toEqual([]);
  });

  it('keeps order, drops dangling links, merges track_genres', async () => {
    const { report } = await setup();
    expect(rec('releases', 'r1').trackIds).toEqual(['t1', 't2']);
    expect(rec('tracks', 't1').albums).toEqual([{ albumId: 'al1', order: 1 }]); // 'gone' album dropped
    expect(rec('tracks', 't2').genres).toEqual(['Dance']);
    expect(report.dropped).toMatchObject({
      'album_tracks (dangling)': 2, 'release_tracks (dangling)': 1, 'track_genres (dangling)': 2,
      'releases (no album)': 1, 'playback_logs (deleted track)': 1,
    });
  });

  it('ingests files by hash, refuses paths escaping the public dir, reports missing', async () => {
    const { report } = await setup();
    const hash = createHash('sha256').update('AUDIO-ONE').digest('hex');
    expect(rec('tracks', 't1').file).toBe(hash);
    expect(store.hasFile(hash)).toBe(true);
    expect(store.fileInfo(hash)).toEqual({ size: 9, mime: 'audio/mpeg' });
    expect(rec('artists', 'a1').image).toBe(createHash('sha256').update('IMG-A').digest('hex'));
    expect(rec('albums', 'al1').cover).toBe(createHash('sha256').update('IMG-C').digest('hex'));
    expect(rec('tracks', 't2').file).toBeNull();
    expect(rec('tracks', 't3').file).toBeNull();
    expect(report.missingFiles.sort()).toEqual(['../../etc/passwd', '/uploads/music/missing.mp3']);
    expect(readdirSync(join(dir, 'data', 'tmp'))).toEqual([]);
  });

  it('keeps votes against deleted tracks so legacy Elo is reproduced, with ms timestamps', async () => {
    await setup();
    const votes = store.pull(0, 10000).records.filter((r) => r.table === 'votes');
    expect(votes.map((v) => (v.data as any).timestamp)).toEqual([100000, 200000]);
    const ranked = replayVotes(votes.map((v) => ({ id: v.id, ...(v.data as any) })), ['t1', 't2']);
    expect(ranked.get('t1')!.elo).toBeCloseTo(1016 + 15.2, 0); // beat a ghost, then t2
    expect(ranked.get('t1')!.comparisons).toBe(2);
  });

  it('is idempotent', async () => {
    const { opts } = await setup();
    const before = store.cursor();
    await migrateLegacy(opts);
    const records = store.pull(0, 10000).records;
    expect(records.length).toBe(new Set(records.map((r) => r.table + r.id)).size);
    expect(store.listFiles().length).toBe(3);
    expect(store.cursor()).toBeGreaterThanOrEqual(before);
  });
});
