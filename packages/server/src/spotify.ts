import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Everything Curator can ask Spotify, in separate sources so one breaking does not take the others down:
 *  - oEmbed (open.spotify.com/oembed): title and cover of a track, album or playlist link. Public, no key.
 *  - the public embed page of a playlist (open.spotify.com/embed/playlist/<id>): the track list, no key. UNOFFICIAL: Spotify can change it.
 *  - the Web API with the user's own sign-in (Authorization Code + PKCE, a client id from their own developer app): their playlists with
 *    full details (album, duration). Since Feb 2026, in Development Mode, playlist contents are only returned for playlists the user owns
 *    or collaborates on, so this is for "my playlists"; other people's go through the embed page.
 *  The account's own data export (Playlist1.json) is read in the browser and never reaches this file.
 */
export type SpotifyKind = 'track' | 'album' | 'artist' | 'playlist' | 'episode' | 'show';
export interface SpotifyRef { kind: SpotifyKind; id: string }

export function parseRef(input: unknown): SpotifyRef | null {
  if (typeof input !== 'string') return null;
  const m = /(?:spotify\.com\/(?:intl-[a-z]{2}\/)?(?:embed\/)?|spotify:)(track|album|artist|playlist|episode|show)[/:]([A-Za-z0-9]{22})/.exec(input.trim().split('?')[0].split('#')[0]);
  return m ? { kind: m[1] as SpotifyKind, id: m[2] } : null;
}

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#x27;': "'", '&apos;': "'", '&#x2F;': '/', '&nbsp;': ' ' };
/** Spotify's oEmbed HTML-encodes titles (&amp;, &#x27;, …). */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, g: string) => {
    if (ENTITIES[m]) return ENTITIES[m];
    const n = g[0] === '#' ? (g[1].toLowerCase() === 'x' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10)) : NaN;
    return Number.isFinite(n) ? String.fromCodePoint(n) : m;
  });
}

export interface SpotifyTrack {
  uri: string; id: string; title: string; artists: string[]; album: string; albumUri: string | null; albumArtist: string | null;
  durationMs: number | null; cover: string | null; releaseDate: string | null; trackNumber: number | null; isrc: string | null;
}
export interface SpotifyList { kind: 'playlist' | 'album' | 'track'; name: string; description: string | null; cover: string | null; owner: string | null; tracks: SpotifyTrack[]; source: 'embed' | 'api' | 'oembed'; note?: string }

export class SpotifyError extends Error {
  readonly status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

type Fetch = typeof fetch;
const UA = 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0';

export async function oembed(ref: SpotifyRef, f: Fetch = fetch): Promise<{ title: string; cover: string | null }> {
  let res: Response;
  try { res = await f(`https://open.spotify.com/oembed?url=${encodeURIComponent(`spotify:${ref.kind}:${ref.id}`)}`, { signal: AbortSignal.timeout(10_000) }); }
  catch (e) { throw new SpotifyError(502, `Could not reach Spotify (${(e as Error).message})`); }
  if (!res.ok) throw new SpotifyError(res.status === 404 ? 404 : 502, res.status === 404 ? 'Spotify does not know that link (is the playlist public?)' : `Spotify answered ${res.status}`);
  const j = (await res.json().catch(() => null)) as { title?: string; thumbnail_url?: string } | null;
  if (!j?.title) throw new SpotifyError(502, 'Spotify returned nothing readable');
  return { title: decodeEntities(j.title), cover: j.thumbnail_url ?? null };
}

/** Find the playlist's `trackList` in the embed page's `__NEXT_DATA__`, wherever Spotify has nested it this month. Pure; tested with a fixture. */
export function parseEmbed(html: string, id: string): SpotifyList {
  const m = /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!m) throw new SpotifyError(502, 'The Spotify page had no playlist data (Spotify may have changed it; try your account data file or sign-in instead)');
  let data: unknown;
  try { data = JSON.parse(m[1]); } catch { throw new SpotifyError(502, 'The Spotify page data was unreadable'); }
  let found: unknown = null;
  const walk = (n: unknown, depth: number) => {
    if (found || depth > 12 || !n || typeof n !== 'object') return;
    if (!Array.isArray(n) && Array.isArray((n as { trackList?: unknown }).trackList)) { found = n; return; }
    for (const v of Object.values(n as object)) walk(v, depth + 1);
  };
  walk(data, 0);
  const e = found as { trackList: { uri?: string; title?: string; subtitle?: string; duration?: number }[]; name?: string; title?: string; subtitle?: string; coverArt?: { sources?: { url: string; width?: number }[] } } | null;
  if (!e) throw new SpotifyError(502, 'The Spotify page had no track list');
  const tracks: SpotifyTrack[] = [];
  for (const t of e.trackList) {
    const ref = parseRef(t.uri ?? '');
    if (!ref || ref.kind !== 'track' || !t.title) continue;
    tracks.push({ uri: `spotify:track:${ref.id}`, id: ref.id, title: decodeEntities(String(t.title)), artists: String(t.subtitle ?? '').split(/,\s*| /).map((a) => decodeEntities(a).trim()).filter(Boolean),
      album: '', albumUri: null, albumArtist: null, durationMs: typeof t.duration === 'number' ? t.duration : null, cover: null, releaseDate: null, trackNumber: null, isrc: null });
  }
  const cover = [...(e.coverArt?.sources ?? [])].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? null;
  return { kind: 'playlist', name: decodeEntities(String(e.name ?? e.title ?? `Playlist ${id}`)), description: null, cover, owner: e.subtitle ? decodeEntities(String(e.subtitle)) : null, tracks, source: 'embed',
    note: 'The public page does not say which album a track is on; the albums are made from the track titles and can be completed later.' };
}

export async function embedPlaylist(id: string, f: Fetch = fetch): Promise<SpotifyList> {
  let res: Response;
  try { res = await f(`https://open.spotify.com/embed/playlist/${id}`, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' }, signal: AbortSignal.timeout(15_000) }); }
  catch (e) { throw new SpotifyError(502, `Could not reach Spotify (${(e as Error).message})`); }
  if (res.status === 404) throw new SpotifyError(404, 'That playlist is private or does not exist');
  if (!res.ok) throw new SpotifyError(502, `Spotify answered ${res.status}`);
  return parseEmbed(await res.text(), id);
}

// ---- the user's own sign-in (Authorization Code with PKCE; no client secret) ----
export interface SpotifyAuthState {
  clientId?: string; redirectUri?: string;
  pending?: { verifier: string; state: string };
  token?: { access: string; refresh: string; expiresAt: number; scope: string };
}

const SCOPES = 'playlist-read-private playlist-read-collaborative user-library-read';
export const DEFAULT_REDIRECT = 'http://127.0.0.1:47813/api/spotify/callback';
const b64url = (b: Buffer) => b.toString('base64url');

export class SpotifyAccount {
  private file: string;
  private f: Fetch;
  private now: () => number;
  constructor(dataDir: string, o: { fetchImpl?: Fetch; now?: () => number; env?: NodeJS.ProcessEnv } = {}) {
    this.file = join(dataDir, 'spotify.json'); this.f = o.fetchImpl ?? fetch; this.now = o.now ?? Date.now;
    this.envClient = o.env?.CURATOR_SPOTIFY_CLIENT_ID;
  }
  private envClient?: string;
  private load(): SpotifyAuthState { try { return JSON.parse(readFileSync(this.file, 'utf8')) as SpotifyAuthState; } catch { return {}; } }
  private save(s: SpotifyAuthState) { mkdirSync(dirname(this.file), { recursive: true }); writeFileSync(this.file, JSON.stringify(s, null, 2), { mode: 0o600 }); }

  status() { const s = this.load(); return { clientId: this.envClient || s.clientId || '', redirectUri: s.redirectUri || DEFAULT_REDIRECT, signedIn: !!s.token, configured: !!(this.envClient || s.clientId) }; }
  configure(clientId: string, redirectUri?: string) {
    if (!/^[0-9a-f]{32}$/i.test(clientId.trim())) throw new SpotifyError(400, 'A Spotify client id is 32 letters and digits (from your app on developer.spotify.com/dashboard)');
    const s = this.load(); s.clientId = clientId.trim(); if (redirectUri) s.redirectUri = redirectUri.trim(); this.save(s);
  }
  signOut() { const s = this.load(); delete s.token; delete s.pending; this.save(s); }

  /** Step 1: the page the user opens to allow Curator to read their playlists. */
  authUrl(): string {
    const s = this.load(); const clientId = this.envClient || s.clientId;
    if (!clientId) throw new SpotifyError(400, 'Enter your Spotify client id first');
    const verifier = b64url(randomBytes(48)), state = b64url(randomBytes(12));
    s.pending = { verifier, state }; this.save(s);
    const q = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: s.redirectUri || DEFAULT_REDIRECT, scope: SCOPES, state, code_challenge_method: 'S256', code_challenge: b64url(createHash('sha256').update(verifier).digest()) });
    return `https://accounts.spotify.com/authorize?${q}`;
  }
  /** Step 2: Spotify sent the browser to `redirectUri?code=…&state=…`; give that address (or just the code) here. Works even if the page itself did not load. */
  async exchange(codeOrUrl: string): Promise<void> {
    const s = this.load();
    if (!s.pending) throw new SpotifyError(400, 'Start the sign-in again (there is no sign-in in progress)');
    let code = codeOrUrl.trim();
    try { const u = new URL(code); if (u.searchParams.get('error')) throw new SpotifyError(400, `Spotify said: ${u.searchParams.get('error')}`); const st = u.searchParams.get('state'); if (st && st !== s.pending.state) throw new SpotifyError(400, 'That address belongs to a different sign-in. Start again.'); code = u.searchParams.get('code') ?? ''; }
    catch (e) { if (e instanceof SpotifyError) throw e; }
    if (!code) throw new SpotifyError(400, 'No code found in that address');
    await this.token({ grant_type: 'authorization_code', code, redirect_uri: s.redirectUri || DEFAULT_REDIRECT, code_verifier: s.pending.verifier });
  }
  private async token(body: Record<string, string>): Promise<void> {
    const s = this.load(); const clientId = this.envClient || s.clientId;
    let res: Response;
    try { res = await this.f('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...body, client_id: clientId ?? '' }), signal: AbortSignal.timeout(15_000) }); }
    catch (e) { throw new SpotifyError(502, `Could not reach Spotify (${(e as Error).message})`); }
    const j = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error_description?: string; error?: string };
    if (!res.ok || !j.access_token) throw new SpotifyError(res.status === 400 ? 400 : 502, `Spotify refused the sign-in: ${j.error_description ?? j.error ?? res.status}`);
    s.token = { access: j.access_token, refresh: j.refresh_token ?? s.token?.refresh ?? '', expiresAt: this.now() + (j.expires_in ?? 3600) * 1000 - 60_000, scope: j.scope ?? '' };
    delete s.pending; this.save(s);
  }
  private async access(): Promise<string> {
    const s = this.load();
    if (!s.token) throw new SpotifyError(401, 'Not signed in to Spotify');
    if (this.now() >= s.token.expiresAt) { if (!s.token.refresh) throw new SpotifyError(401, 'The Spotify sign-in expired; sign in again'); await this.token({ grant_type: 'refresh_token', refresh_token: s.token.refresh }); }
    return this.load().token!.access;
  }
  private async get<T>(path: string): Promise<T> {
    const url = path.startsWith('http') ? path : `https://api.spotify.com/v1${path}`;
    for (let attempt = 0; attempt < 3; attempt++) {
      let res: Response;
      try { res = await this.f(url, { headers: { Authorization: `Bearer ${await this.access()}` }, signal: AbortSignal.timeout(20_000) }); }
      catch (e) { if (e instanceof SpotifyError) throw e; throw new SpotifyError(502, `Could not reach Spotify (${(e as Error).message})`); }
      if (res.status === 429) { await new Promise((r) => setTimeout(r, Math.min(5000, (Number(res.headers.get('retry-after')) || 1) * 1000))); continue; }
      if (res.status === 401) throw new SpotifyError(401, 'The Spotify sign-in is no longer valid; sign in again');
      if (res.status === 403) throw new SpotifyError(403, 'Spotify does not allow this app to read that (in Development Mode only your own playlists can be read)');
      if (res.status === 404) throw new SpotifyError(404, 'Spotify cannot find that');
      if (!res.ok) throw new SpotifyError(502, `Spotify answered ${res.status}`);
      return (await res.json()) as T;
    }
    throw new SpotifyError(429, 'Spotify is rate limiting this app; try again in a minute');
  }

  async playlists(): Promise<{ id: string; name: string; tracks: number | null; owner: string; cover: string | null; mine: boolean }[]> {
    const me = await this.get<{ id: string }>('/me');
    const out: { id: string; name: string; tracks: number | null; owner: string; cover: string | null; mine: boolean }[] = [];
    let next: string | null = '/me/playlists?limit=50';
    while (next && out.length < 500) {
      const page: { items: { id: string; name: string; tracks?: { total?: number }; items?: { total?: number }; owner?: { id?: string; display_name?: string }; images?: { url: string }[] }[]; next: string | null } = await this.get(next);
      for (const p of page.items ?? []) if (p?.id) out.push({ id: p.id, name: p.name, tracks: p.items?.total ?? p.tracks?.total ?? null, owner: p.owner?.display_name ?? p.owner?.id ?? '', cover: p.images?.[0]?.url ?? null, mine: p.owner?.id === me.id });
      next = page.next;
    }
    return out;
  }

  async playlist(id: string): Promise<SpotifyList> {
    type Item = { track?: { id?: string; uri?: string; name?: string; duration_ms?: number; track_number?: number; is_local?: boolean; artists?: { name: string }[]; external_ids?: { isrc?: string };
      album?: { uri?: string; name?: string; release_date?: string; images?: { url: string }[]; artists?: { name: string }[] } } | null };
    const head = await this.get<{ name: string; description?: string; images?: { url: string }[]; owner?: { display_name?: string } }>(`/playlists/${id}?fields=name,description,images,owner(display_name)`);
    const tracks: SpotifyTrack[] = [];
    // the list of items was renamed from /tracks to /items in Feb 2026: ask for the new one first
    let next: string | null = `/playlists/${id}/items?limit=100`, legacy = false;
    while (next && tracks.length < 5000) {
      let page: { items: Item[]; next: string | null };
      try { page = await this.get(next); }
      catch (e) { if (!legacy && e instanceof SpotifyError && e.status === 404) { legacy = true; next = `/playlists/${id}/tracks?limit=100`; continue; } throw e; }
      for (const it of page.items ?? []) {
        const t = it.track;
        if (!t || t.is_local || !t.id || !t.name) continue;
        tracks.push({ uri: t.uri ?? `spotify:track:${t.id}`, id: t.id, title: t.name, artists: (t.artists ?? []).map((a) => a.name), album: t.album?.name ?? '', albumUri: t.album?.uri ?? null, albumArtist: t.album?.artists?.[0]?.name ?? null,
          durationMs: t.duration_ms ?? null, cover: t.album?.images?.[0]?.url ?? null, releaseDate: t.album?.release_date ?? null, trackNumber: t.track_number ?? null, isrc: t.external_ids?.isrc ?? null });
      }
      next = page.next;
    }
    return { kind: 'playlist', name: head.name, description: head.description || null, cover: head.images?.[0]?.url ?? null, owner: head.owner?.display_name ?? null, tracks, source: 'api' };
  }
}

/** Any Spotify link -> what it holds. Public playlists use the embed page; a track or album link gives its title and cover (oEmbed). */
export async function resolveLink(input: unknown, o: { fetchImpl?: Fetch; account?: SpotifyAccount } = {}): Promise<SpotifyList> {
  const ref = parseRef(input);
  if (!ref) throw new SpotifyError(400, 'That does not look like a Spotify link');
  if (ref.kind === 'playlist') {
    // the user's own sign-in knows more (albums, durations) when it is allowed to read that playlist
    if (o.account?.status().signedIn) { try { return await o.account.playlist(ref.id); } catch { /* not readable with the account: use the public page */ } }
    return embedPlaylist(ref.id, o.fetchImpl);
  }
  if (ref.kind === 'track' || ref.kind === 'album') {
    const m = await oembed(ref, o.fetchImpl);
    if (ref.kind === 'track') return { kind: 'track', name: m.title, description: null, cover: m.cover, owner: null, source: 'oembed', note: 'A track link only gives its title; add the artist yourself or use a playlist.',
      tracks: [{ uri: `spotify:track:${ref.id}`, id: ref.id, title: m.title, artists: [], album: '', albumUri: null, albumArtist: null, durationMs: null, cover: m.cover, releaseDate: null, trackNumber: null, isrc: null }] };
    return { kind: 'album', name: m.title, description: null, cover: m.cover, owner: null, source: 'oembed', tracks: [], note: 'An album link only gives its name and cover here. Sign in to Spotify to read its tracks.' };
  }
  throw new SpotifyError(400, `A Spotify ${ref.kind} link cannot be imported`);
}
