import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { SpotifyAccount, SpotifyError, decodeEntities, oembed, parseEmbed, parseRef, resolveLink } from '../src/spotify.ts';

const ID = '37i9dQZF1DXcBWIGoYBM5M';
const embedHtml = (entity: unknown) => `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { state: { data: { entity } } } } })}</script></html>`;
const json = (o: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', ...headers } });

describe('links', () => {
  it('parses links and uris', () => {
    expect(parseRef(`https://open.spotify.com/playlist/${ID}?si=abc`)).toEqual({ kind: 'playlist', id: ID });
    expect(parseRef(`spotify:track:${ID}`)).toEqual({ kind: 'track', id: ID });
    expect(parseRef(`https://open.spotify.com/embed/playlist/${ID}`)?.kind).toBe('playlist');
    expect(parseRef('https://example.com/x')).toBeNull();
    expect(parseRef(5)).toBeNull();
  });
  it('decodes the entities oEmbed titles come with', () => { expect(decodeEntities('Don&#x27;t &amp; Stop &quot;Me&quot; &#8217;')).toBe('Don\'t & Stop "Me" ’'); });
});

describe('oEmbed', () => {
  it('reads the title and cover, decoded', async () => {
    let asked = '';
    const f = (async (u: string) => { asked = String(u); return json({ title: 'Get It Together &amp; More', thumbnail_url: 'https://i.scdn.co/image/abc' }); }) as unknown as typeof fetch;
    expect(await oembed({ kind: 'track', id: ID }, f)).toEqual({ title: 'Get It Together & More', cover: 'https://i.scdn.co/image/abc' });
    expect(decodeURIComponent(asked)).toContain(`url=spotify:track:${ID}`);
  });
  it('explains a 404', async () => {
    await expect(oembed({ kind: 'playlist', id: ID }, (async () => new Response('', { status: 404 })) as unknown as typeof fetch)).rejects.toThrow(/public/);
  });
});

describe('embed page', () => {
  const entity = { name: 'songs i care for', subtitle: 'someone', coverArt: { sources: [{ url: 'https://i.scdn.co/small', width: 64 }, { url: 'https://i.scdn.co/big', width: 640 }] },
    trackList: [{ uri: 'spotify:track:7y6c07pgjZvtHI9kuMVqk1', title: 'Get It Together', subtitle: 'Drake, Black Coffee', duration: 250337 }, { uri: 'spotify:episode:7y6c07pgjZvtHI9kuMVqk1', title: 'Podcast' }, { uri: 'spotify:track:2tPcTFiQF9MbVUyjZ3zDhA', title: 'Paramedic!', subtitle: 'SOB X RBE' }] };
  it('reads the track list wherever it is nested', () => {
    const l = parseEmbed(embedHtml(entity), ID);
    expect(l.name).toBe('songs i care for');
    expect(l.cover).toBe('https://i.scdn.co/big');
    expect(l.tracks.map((t) => [t.title, t.artists])).toEqual([['Get It Together', ['Drake', 'Black Coffee']], ['Paramedic!', ['SOB X RBE']]]);
    expect(l.tracks[0].durationMs).toBe(250337);
  });
  it('says so when the page has no data', () => {
    expect(() => parseEmbed('<html></html>', ID)).toThrow(SpotifyError);
    expect(() => parseEmbed(embedHtml({ nothing: 1 }), ID)).toThrow(/no track list/);
  });
  it('resolves a playlist link through the page', async () => {
    const f = (async (u: string) => (String(u).includes('/embed/playlist/') ? new Response(embedHtml(entity)) : new Response('', { status: 404 }))) as unknown as typeof fetch;
    expect((await resolveLink(`https://open.spotify.com/playlist/${ID}`, { fetchImpl: f })).tracks).toHaveLength(2);
    await expect(resolveLink('nope')).rejects.toThrow(/Spotify link/);
  });
});

describe('sign-in', () => {
  const dir = () => mkdtempSync(join(tmpdir(), 'sp-'));
  const CLIENT = 'a'.repeat(32);
  it('builds a PKCE authorize link, then exchanges the pasted address', async () => {
    const d = dir(); const bodies: URLSearchParams[] = [];
    const f = (async (_u: string, init?: RequestInit) => { bodies.push(init!.body as URLSearchParams); return json({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600, scope: 'x' }); }) as unknown as typeof fetch;
    const a = new SpotifyAccount(d, { fetchImpl: f, now: () => 1000 });
    expect(() => a.authUrl()).toThrow(/client id/);
    expect(() => a.configure('short')).toThrow(SpotifyError);
    a.configure(CLIENT);
    const u = new URL(a.authUrl());
    expect(u.searchParams.get('code_challenge_method')).toBe('S256');
    expect(u.searchParams.get('client_id')).toBe(CLIENT);
    const state = u.searchParams.get('state')!;
    const verifier = JSON.parse(readFileSync(join(d, 'spotify.json'), 'utf8')).pending.verifier;
    expect(u.searchParams.get('code_challenge')).toBe(createHash('sha256').update(verifier).digest('base64url'));
    await expect(a.exchange(`http://127.0.0.1:47813/api/spotify/callback?code=C&state=wrong`)).rejects.toThrow(/different sign-in/);
    await a.exchange(`http://127.0.0.1:47813/api/spotify/callback?code=THECODE&state=${state}`);
    expect(bodies[0].get('code')).toBe('THECODE');
    expect(bodies[0].get('code_verifier')).toBe(verifier);
    expect(a.status().signedIn).toBe(true);
    a.signOut();
    expect(a.status().signedIn).toBe(false);
  });
  it('lists playlists and reads one, falling back from /items to /tracks and skipping local files', async () => {
    const d = dir(); const seen: string[] = [];
    let now = 1000;
    const f = (async (u: string, init?: RequestInit) => {
      const url = String(u); seen.push(url);
      if (url.includes('accounts.spotify.com')) return json({ access_token: 'AT2', refresh_token: 'RT2', expires_in: 3600 });
      if (url.endsWith('/me')) return json({ id: 'me' });
      if (url.includes('/me/playlists')) return json({ items: [{ id: 'p1', name: 'Mine', tracks: { total: 2 }, owner: { id: 'me', display_name: 'Me' } }, { id: 'p2', name: 'Theirs', owner: { id: 'x' } }], next: null });
      if (url.includes('/playlists/p1?fields')) return json({ name: 'Mine', images: [{ url: 'https://i.scdn.co/c' }] });
      if (url.includes('/playlists/p1/items')) return new Response('', { status: 404 });
      if (url.includes('/playlists/p1/tracks')) return json({ items: [
        { track: { id: 'aaaaaaaaaaaaaaaaaaaaaa', name: 'Song', duration_ms: 1000, artists: [{ name: 'A' }], album: { name: 'Alb', uri: 'spotify:album:b', release_date: '2020-01-01', images: [{ url: 'https://i.scdn.co/a' }], artists: [{ name: 'A' }] } } },
        { track: { id: 'x', name: 'Local', is_local: true } }, { track: null }], next: null });
      return new Response('', { status: 500 });
    }) as unknown as typeof fetch;
    const a = new SpotifyAccount(d, { fetchImpl: f, now: () => now });
    a.configure(CLIENT); a.authUrl();
    const st = JSON.parse(readFileSync(join(d, 'spotify.json'), 'utf8')).pending.state;
    await a.exchange(`http://x/?code=C&state=${st}`);
    expect((await a.playlists()).map((p) => [p.name, p.mine])).toEqual([['Mine', true], ['Theirs', false]]);
    const l = await a.playlist('p1');
    expect(l.tracks).toHaveLength(1);
    expect(l.tracks[0]).toMatchObject({ title: 'Song', album: 'Alb', albumArtist: 'A', releaseDate: '2020-01-01' });
    expect(seen.some((u) => u.includes('/playlists/p1/items'))).toBe(true);
    now = 10_000_000; // expired: refreshes by itself
    await expect(a.playlists()).resolves.toBeTruthy();
  });
});
