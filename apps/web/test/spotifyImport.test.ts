import { describe, expect, it } from 'vitest';
import { parseAccountData, parseTextList, planImport } from '../src/lib/spotifyImport.ts';
import { insertNewTracks, matchEntries } from '../src/lib/albumMerge.ts';
import type { Library } from '../src/lib/library.ts';
import type { SpotifyList } from '../src/lib/api.ts';

const ID1 = '7y6c07pgjZvtHI9kuMVqk1', ID2 = '2tPcTFiQF9MbVUyjZ3zDhA', ID3 = '0aaaaaaaaaaaaaaaaaaaaa';
const lib = (over: Partial<Library> = {}) => ({ tracks: [], albums: [], logs: [], ...over }) as unknown as Library;
const src = (id: string, title: string, artist: string, album = '', extra: object = {}) => ({ uri: `spotify:track:${id}`, id, title, artists: [artist], album, albumUri: null, albumArtist: artist, durationMs: null, cover: null, releaseDate: null, trackNumber: null, isrc: null, ...extra });

describe('account data', () => {
  it('reads playlists and liked songs', () => {
    const lists = parseAccountData({ playlists: [{ name: 'Care', items: [{ track: { trackName: 'Get It Together', artistName: 'Drake', albumName: 'More Life', trackUri: `spotify:track:${ID1}` } }, { track: null, episode: { x: 1 } }, { localTrack: { x: 1 }, track: null }] }, { name: 'Empty', items: [] }], tracks: [{ artist: 'A', album: 'B', track: 'C', uri: `spotify:track:${ID2}` }] });
    expect(lists.map((l) => [l.name, l.tracks.length])).toEqual([['Care', 1], ['Liked Songs', 1]]);
    expect(lists[0].tracks[0]).toMatchObject({ title: 'Get It Together', album: 'More Life', artists: ['Drake'] });
  });
  it('reads a pasted list', () => {
    expect(parseTextList('# mine\nDrake - Get It Together\n\nnonsense line\nSOB X RBE – Paramedic!').map((t) => [t.artists[0], t.title])).toEqual([['Drake', 'Get It Together'], ['SOB X RBE', 'Paramedic!']]);
  });
});

describe('import plan', () => {
  const list: SpotifyList = { kind: 'playlist', name: 'songs', description: null, cover: null, owner: null, source: 'api', tracks: [src(ID1, 'Get It Together', 'Drake', 'More Life'), src(ID2, 'Paramedic!', 'SOB X RBE', 'Black Panther'), src(ID3, 'Passionfruit', 'Drake', 'More Life')] };
  it('groups new tracks by album', () => {
    const p = planImport(lib(), list);
    expect(p.albums.map((a) => [a.title, a.tracks.length, a.nameFrom])).toEqual([['More Life', 2, 'spotify'], ['Black Panther', 1, 'spotify']]);
    expect(p.reused).toBe(0);
  });
  it('reuses tracks the library has, by Spotify link or title', () => {
    const t = (id: string, title: string, artist: string, spotifyUrl: string | null) => ({ id, title, spotifyUrl, artistName: artist, leads: [{ id: 'a', name: artist }] });
    const p = planImport(lib({ tracks: [t('t1', 'Whatever', 'Drake', `https://open.spotify.com/track/${ID1}`), t('t2', 'Paramedic!', 'SOB X RBE', null)] as never }), list);
    expect(p.tracks.map((x) => x.existingTrackId)).toEqual(['t1', 't2', null]);
    expect(p.albums).toHaveLength(1);
    expect(p.reused).toBe(2);
  });
  it('asks the imported history for the album when the source has none, else names it after the track', () => {
    const embed: SpotifyList = { ...list, source: 'embed', tracks: [src(ID1, 'Get It Together', 'Drake'), src(ID2, 'Paramedic!', 'SOB X RBE')] };
    const p = planImport(lib({ logs: [{ imported: 'spotify', uri: `spotify:track:${ID1}`, album: 'More Life', artist: 'Drake' }] as never }), embed);
    expect(p.albums.map((a) => [a.title, a.nameFrom])).toEqual([['More Life', 'history'], ['Paramedic!', 'title']]);
  });
  it('joins an album that already exists', () => {
    const p = planImport(lib({ albums: [{ id: 'al1', title: 'More Life', artistName: 'Drake', leads: [{ id: 'a', name: 'Drake' }] }] as never }), list);
    expect(p.albums[0].existingAlbumId).toBe('al1');
    expect(p.albums[1].existingAlbumId).toBeNull();
  });
});

describe('album merge', () => {
  const have = [{ id: 't1', title: 'Intro', youtubeMusicUrl: null }, { id: 't2', title: 'Hotline (feat. Someone)', youtubeMusicUrl: 'https://music.youtube.com/watch?v=abc' }, { id: 't3', title: 'Outro', youtubeMusicUrl: null }];
  const entry = (id: string, title: string) => ({ id, title, url: `https://music.youtube.com/watch?v=${id}` });
  it('matches the same song and leaves the extras as new', () => {
    const rows = matchEntries(have, [entry('x1', 'Bonus One'), entry('x2', 'Intro'), entry('x3', 'Hotline'), entry('x4', 'Outro (Remastered)'), entry('x5', 'Bonus Two')]);
    expect(rows.map((r) => r.trackId)).toEqual([null, 't1', 't2', 't3', null]);
  });
  it('matches by the video id first', () => {
    expect(matchEntries(have, [entry('abc', 'A completely different title')])[0].trackId).toBe('t2');
  });
  it('uses an existing track once', () => {
    const rows = matchEntries(have, [entry('a', 'Intro'), entry('b', 'Intro')]);
    expect(rows.map((r) => r.trackId)).toEqual(['t1', null]);
  });
  it('puts new tracks where the edition puts them, without moving the rest', () => {
    const order = ['t1', 't2', 't3'];
    const rows = [{ trackId: null, newId: 'n1', include: true }, { trackId: 't1', include: true }, { trackId: null, newId: 'n2', include: true }, { trackId: 't3', include: true }, { trackId: 't2', include: true }, { trackId: null, newId: 'n3', include: false }];
    expect(insertNewTracks(order, rows)).toEqual(['n1', 't1', 'n2', 't2', 't3']);
  });
});
