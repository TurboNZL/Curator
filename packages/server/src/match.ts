import { spawn } from 'node:child_process';
import { safeUrl } from './acquire.ts';

/**
 * Finds the YouTube (Music) page of a track that has none yet. Two independent ways, tried in the order the caller asks:
 *  - `odesli`: song.link knows the same song on many services; given a Spotify link it returns the YouTube Music link directly.
 *    Exact when it works, but needs a Spotify link, and the free API is rate limited (about 10 requests a minute without a key).
 *  - `search`: yt-dlp searches YouTube for "artist title" and the results are scored (title, artist, "- Topic" auto-generated channels,
 *    duration). Works for any track; a wrong pick is possible, which is why the review screen shows every proposal.
 */
export interface MatchTrack { id: string; title: string; artist: string; album?: string; durationMs?: number | null; spotifyUrl?: string | null }
export interface Candidate { url: string; title: string; channel: string; seconds: number | null; score: number; method: 'odesli' | 'search' }
export interface MatchResult { id: string; candidates: Candidate[]; error?: string }

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\(feat[^)]*\)|\[feat[^\]]*\]|\bfeat\.?\s.*$/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const words = (s: string) => new Set(norm(s).split(' ').filter(Boolean));

/** 0..1: how much of the track's title and artist is in a result, plus signals that it is the official audio. Pure; tested. */
export function scoreCandidate(t: MatchTrack, c: { title: string; channel: string; seconds: number | null }): number {
  const tw = words(t.title), cw = words(c.title);
  if (!tw.size) return 0;
  let hit = 0; for (const w of tw) if (cw.has(w)) hit++;
  let score = 0.5 * (hit / tw.size);
  const aw = words(t.artist);
  if (aw.size) { const pool = new Set([...cw, ...words(c.channel)]); let a = 0; for (const w of aw) if (pool.has(w)) a++; score += 0.25 * (a / aw.size); }
  if (/ - topic$/i.test(c.channel)) score += 0.1; // YouTube's auto-generated "Artist - Topic" channel holds the album audio
  if (/\b(live|remix|cover|karaoke|instrumental|slowed|sped up|reverb|nightcore|8d|reaction)\b/i.test(c.title) && !/\b(live|remix|cover|karaoke|instrumental|slowed|sped up|reverb|nightcore|8d|reaction)\b/i.test(t.title)) score -= 0.25;
  if (t.durationMs && c.seconds) { const d = Math.abs(c.seconds - t.durationMs / 1000); score += d <= 3 ? 0.15 : d <= 10 ? 0.07 : d > 45 ? -0.2 : 0; }
  return Math.max(0, Math.min(1, score));
}

type Fetch = typeof fetch;

export async function odesli(spotifyUrl: string, f: Fetch = fetch): Promise<Candidate | null> {
  const u = safeUrl(spotifyUrl);
  if (!u) return null;
  let res: Response;
  try { res = await f(`https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(u)}&userCountry=US&songIfSingle=true`, { signal: AbortSignal.timeout(12_000) }); }
  catch (e) { throw new Error(`Could not reach song.link (${(e as Error).message})`); }
  if (res.status === 429) throw new Error('song.link is rate limiting (about 10 a minute); try again later or use the search method');
  if (!res.ok) return null;
  const j = (await res.json().catch(() => null)) as { linksByPlatform?: Record<string, { url?: string }>; entitiesByUniqueId?: Record<string, { title?: string; artistName?: string }>; entityUniqueId?: string } | null;
  const link = j?.linksByPlatform?.youtubeMusic?.url ?? j?.linksByPlatform?.youtube?.url;
  if (!link) return null;
  const e = j?.entitiesByUniqueId?.[j.entityUniqueId ?? ''];
  return { url: link, title: e?.title ?? '', channel: e?.artistName ?? '', seconds: null, score: 0.97, method: 'odesli' };
}

export function parseSearch(info: unknown, t: MatchTrack): Candidate[] {
  const entries: any[] = Array.isArray((info as any)?.entries) ? (info as any).entries : [];
  const out: Candidate[] = [];
  for (const e of entries) {
    if (!e?.id || typeof e.title !== 'string') continue;
    const c = { title: e.title, channel: String(e.channel ?? e.uploader ?? ''), seconds: typeof e.duration === 'number' ? e.duration : null };
    out.push({ url: `https://music.youtube.com/watch?v=${e.id}`, ...c, score: scoreCandidate(t, c), method: 'search' });
  }
  return out.sort((a, b) => b.score - a.score);
}

export class Matcher {
  private o: { ytdlp?: string; ytdlpArgs?: string[]; fetchImpl?: Fetch };
  constructor(o: { ytdlp?: string; ytdlpArgs?: string[]; fetchImpl?: Fetch } = {}) { this.o = o; }

  async search(t: MatchTrack, n = 5): Promise<Candidate[]> {
    const q = `${t.artist} ${t.title}`.replace(/\s+/g, ' ').trim();
    const out = await this.run([`ytsearch${n}:${q}`, '--flat-playlist', '-J', '--no-warnings']);
    return parseSearch(JSON.parse(out), t);
  }

  /** Candidates for one track by the requested methods, best first. A method that fails is reported, never fatal. */
  async match(t: MatchTrack, methods: ('odesli' | 'search')[]): Promise<MatchResult> {
    const candidates: Candidate[] = [], errors: string[] = [];
    for (const m of methods) {
      try {
        if (m === 'odesli' && t.spotifyUrl) { const c = await odesli(t.spotifyUrl, this.o.fetchImpl); if (c) { candidates.push(c); break; } }
        if (m === 'search') candidates.push(...(await this.search(t)));
      } catch (e) { errors.push((e as Error).message); }
    }
    const seen = new Set<string>();
    const uniq = candidates.filter((c) => !seen.has(c.url) && seen.add(c.url)).sort((a, b) => b.score - a.score);
    return { id: t.id, candidates: uniq.slice(0, 5), ...(!uniq.length && errors.length ? { error: errors[0] } : {}) };
  }

  private run(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.o.ytdlp ?? 'yt-dlp', [...(this.o.ytdlpArgs ?? []), ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '', err = '';
      const timer = setTimeout(() => { child.kill(); reject(new Error('yt-dlp took too long')); }, 60_000);
      child.stdout.on('data', (d) => { out += d; if (out.length > 5_000_000) child.kill(); });
      child.stderr.on('data', (d) => { err = (err + d).slice(-1500); });
      child.on('error', (e: NodeJS.ErrnoException) => { clearTimeout(timer); reject(new Error(e.code === 'ENOENT' ? 'yt-dlp is not installed on the server' : e.message)); });
      child.on('close', (code) => { clearTimeout(timer); code === 0 ? resolve(out) : reject(new Error(`yt-dlp failed: ${err.trim().split('\n').pop() ?? code}`)); });
    });
  }
}
