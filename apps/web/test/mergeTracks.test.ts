import { describe, expect, it } from 'vitest';
import type { SyncRecord } from '@turbomusic/core';
import { buildLibrary } from '../src/lib/library.ts';
import { planMerge, suggestKeeper } from '../src/lib/mergeTracks.ts';
import { allSpotifyUrls, linkFields, withLink } from '../src/lib/spotifyLinks.ts';
import { trackMatcher } from '../src/lib/listens.ts';

const rec = (table: string, id: string, data: object): SyncRecord => ({ table: table as never, id, updatedAt: 1, deviceId: 'd', deleted: false, data: data as never });
const rows = (...rs: SyncRecord[]) => {
  const out: Record<string, Map<string, SyncRecord>> = Object.fromEntries(
    ['artists', 'eras', 'noteCategories', 'albums', 'releases', 'tracks', 'playlists', 'groups', 'genres', 'roleCategories', 'timeline', 'votes', 'playbackLogs', 'profiles', 'notes'].map((t) => [t, new Map()]));
  for (const r of rs) out[r.table].set(r.id, r);
  return out;
};
const A = 'https://open.spotify.com/track/1111111111111111111111';
const B = 'https://open.spotify.com/track/2222222222222222222222?si=abc';
const lead = [{ artistId: 'a', role: ['Lead artist'] }];
const track = (title: string, extra: object = {}) => ({ title, credits: lead, genres: [], albums: [], file: null, initialRating: null, spotifyUrl: null, geniusUrl: null, youtubeMusicUrl: null, bitrate: null, memories: 0, syncWithAlbumCredits: false, queueRules: {}, ...extra });
const vote = (id: string, a: string, b: string, w: string) => rec('votes', id, { trackAId: a, trackBId: b, winnerId: w, isEqual: false, timestamp: 1 });

const base = () => rows(
  rec('artists', 'a', { name: 'Drake', image: null }),
  rec('albums', 'al', { title: 'HABIBTI', credits: lead, genres: [], cover: 'albumcover', coverPicked: true, trackOrder: ['x', 'album', 'y'] }),
  rec('releases', 'r', { albumId: 'al', title: 'Std', cover: null, releaseDate: '2026', trackIds: ['x', 'album', 'y'] }),
  rec('tracks', 'single', track('Solar Eclipse', { spotifyUrl: A, memories: 2, youtubeMusicUrl: 'https://music.youtube.com/watch?v=a', cover: null })),
  rec('tracks', 'album', track('Solar Eclipse', { spotifyUrl: B, memories: 1, file: 'h', bitrate: '320', albums: [{ albumId: 'al', order: 1 }] })),
  rec('tracks', 'x', track('X')), rec('tracks', 'y', track('Y')),
  rec('playlists', 'p', { name: 'P', description: null, cover: null, createdAt: 1, trackIds: ['single', 'x', 'album'], trackNotes: { single: 'why', album: 'also' } }),
  rec('playbackLogs', 'l1', { trackId: 'single', timestamp: 1, duration: 100, sourceType: null, sourceId: null, isSkip: false }),
  vote('v1', 'single', 'x', 'single'), vote('v2', 'single', 'album', 'album'), vote('v3', 'y', 'album', 'y'),
  rec('profiles', 'pr', { name: 'me', theme: '', accentColor: '', playbackMode: '', settings: {}, playbackRules: [{ trackAId: 'single', trackBId: 'x', playFirstOnShuffle: true, applyToAlbumSource: false }, { trackAId: 'x', trackBId: 'album', playFirstOnShuffle: false, applyToAlbumSource: false }] }),
);

describe('several Spotify links per song', () => {
  it('lists the played one first, each Spotify track once', () => {
    expect(allSpotifyUrls({ spotifyUrl: A, spotifyUrls: [B, A, 'not a link'] })).toEqual([A, B]);
    expect(linkFields([B, '', A, B])).toEqual({ spotifyUrl: B, spotifyUrls: [A] });
    expect(withLink({ spotifyUrl: A }, B)).toEqual({ spotifyUrl: A, spotifyUrls: [B] });
    expect(withLink({ spotifyUrl: A }, `${A}?si=zz`)).toBeNull();
  });
  it('a play of either Spotify track finds the same library track', () => {
    const lib = buildLibrary(rows(rec('artists', 'a', { name: 'D', image: null }), rec('tracks', 't', track('Song', { spotifyUrl: A, spotifyUrls: [B] }))));
    const m = trackMatcher(lib);
    expect(m('spotify:track:1111111111111111111111', 'x', 'y')).toBe('t');
    expect(m('spotify:track:2222222222222222222222', 'x', 'y')).toBe('t');
  });
});

describe('merging duplicate tracks', () => {
  const lib = buildLibrary(base());
  const stored = (id: string) => (lib.trackById.get(id) as unknown as { cover?: null }) && ({ cover: null } as never);

  it('keeps the track with the audio and album by default', () => {
    expect(suggestKeeper([lib.trackById.get('single')!, lib.trackById.get('album')!]).id).toBe('album');
  });
  it('folds links, memories and metadata into the survivor without leaking the album cover', () => {
    const p = planMerge(lib, 'album', ['single'], stored)!;
    expect(p.keep.spotifyUrl).toBe(B);
    expect(p.keep.spotifyUrls).toEqual([A]);
    expect(p.keep.memories).toBe(3);
    expect(p.keep.youtubeMusicUrl).toBe('https://music.youtube.com/watch?v=a');
    expect(p.keep.cover).toBeNull();
    expect(p.removeIds).toEqual(['single']);
  });
  it('points everything that referred to the removed track at the survivor', () => {
    const p = planMerge(lib, 'album', ['single'], stored)!;
    const get = (table: string, id: string) => p.patches.find((x) => x.table === table && x.id === id)?.patch as Record<string, unknown> | undefined;
    expect(get('playlists', 'p')).toEqual({ trackIds: ['album', 'x'], trackNotes: { album: 'also\nwhy' } });
    expect(get('playbackLogs', 'l1')).toEqual({ trackId: 'album' });
    expect(get('votes', 'v1')).toMatchObject({ trackAId: 'album', trackBId: 'x', winnerId: 'album' });
    expect(p.deletes).toEqual([{ table: 'votes', id: 'v2' }]); // single vs album became album vs album
    expect(get('votes', 'v3')).toBeUndefined();
    const rules = get('profiles', 'pr')!.playbackRules as { trackAId: string; trackBId: string }[];
    expect(rules.map((r) => `${r.trackAId}>${r.trackBId}`)).toEqual(['album>x', 'x>album']);
  });
});

import { computeHealth, songKey } from '../src/lib/health.ts';
describe('finding duplicates', () => {
  it('ignores a feat. credit in the title but not a different version', () => {
    expect(songKey('Solar Eclipse (feat. Don Toliver)')).toBe(songKey('Solar Eclipse'));
    expect(songKey('Song [ft. X]')).toBe(songKey('song'));
    expect(songKey('Song (Remix)')).not.toBe(songKey('Song'));
  });
  it('Health groups the single with the album version', () => {
    const lib = buildLibrary(base());
    const d = computeHealth(lib).find((c) => c.id === 'duplicates')!;
    expect(d.mergeGroups).toBe(true);
    expect(d.items.map((i) => i.id).sort()).toEqual(['album', 'single']);
    expect(new Set(d.items.map((i) => i.group)).size).toBe(1);
  });
});
