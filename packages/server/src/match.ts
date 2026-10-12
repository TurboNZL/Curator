import { spawn } from 'node:child_process';

/**
 * Finds the YouTube Music album of an album that has no link yet, so it can be imported as a release (one at a time, with the usual
 * review). yt-dlp opens YouTube's search page filtered to playlists (the “Playlists” tab); an album's official audio sits in a playlist
 * whose id starts with `OLAK5uy_`. Results are scored on the album title, the artist and the track count. Needs yt-dlp; a wrong pick is
 * possible, which is why the importer shows the whole tracklist before anything is saved.
 */
export interface MatchAlbum { id: string; title: string; artist: string; trackCount?: number | null }
export interface AlbumCandidate { url: string; title: string; channel: string; /** tracks in the playlist when YouTube said */ count: number | null; score: number }
export interface AlbumMatchResult { id: string; candidates: AlbumCandidate[]; error?: string }

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\(feat[^)]*\)|\[feat[^\]]*\]|\bfeat\.?\s.*$/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const words = (s: string) => new Set(norm(s).split(' ').filter(Boolean));
const BAD = /\b(live|remix(es)?|karaoke|instrumental|slowed|sped up|reverb|nightcore|8d|mix|best of|greatest hits|playlist|full album|reaction)\b/i;

/** 0..1: how likely a playlist is this album. Pure; tested. */
export function scoreAlbum(a: MatchAlbum, c: { id: string; title: string; channel: string; count: number | null }): number {
  const tw = words(a.title), cw = words(c.title.replace(/^album\s*-\s*/i, ''));
  if (!tw.size) return 0;
  let hit = 0; for (const w of tw) if (cw.has(w)) hit++;
  let score = 0.5 * (hit / tw.size);
  if (cw.size > tw.size * 2 + 2) score -= 0.1; // a long title is a compilation, not the album
  const aw = words(a.artist);
  if (aw.size) { const pool = new Set([...cw, ...words(c.channel)]); let n = 0; for (const w of aw) if (pool.has(w)) n++; score += 0.25 * (n / aw.size); }
  if (/^OLAK5uy_/.test(c.id)) score += 0.2; // YouTube Music's own album playlists
  if (BAD.test(c.title) && !BAD.test(a.title)) score -= 0.25;
  if (a.trackCount && c.count) { const d = Math.abs(c.count - a.trackCount); score += d === 0 ? 0.1 : d <= 2 ? 0.05 : d > 8 ? -0.1 : 0; }
  return Math.max(0, Math.min(1, score));
}

/** The playlist results of a search page (`yt-dlp --flat-playlist -J`), best first. */
export function parseAlbumSearch(info: unknown, a: MatchAlbum): AlbumCandidate[] {
  const entries: any[] = Array.isArray((info as any)?.entries) ? (info as any).entries : [];
  const out: AlbumCandidate[] = [];
  for (const e of entries) {
    const id = typeof e?.id === 'string' ? e.id : /[?&]list=([\w-]+)/.exec(String(e?.url ?? ''))?.[1];
    if (!id || typeof e.title !== 'string' || /^[\w-]{11}$/.test(id) && !/^(PL|OLAK5uy_|RD|UU|FL)/.test(id)) continue; // a single video, not a playlist
    const c = { id, title: e.title, channel: String(e.channel ?? e.uploader ?? ''), count: typeof e.playlist_count === 'number' ? e.playlist_count : typeof e.n_entries === 'number' ? e.n_entries : null };
    out.push({ url: `https://music.youtube.com/playlist?list=${id}`, title: c.title, channel: c.channel, count: c.count, score: scoreAlbum(a, c) });
  }
  return out.sort((x, y) => y.score - x.score);
}

export class Matcher {
  private o: { ytdlp?: string; ytdlpArgs?: string[] };
  constructor(o: { ytdlp?: string; ytdlpArgs?: string[] } = {}) { this.o = o; }

  /** Candidate playlists for one album, best first. A failure is reported in `error`, never thrown. */
  async album(a: MatchAlbum, n = 5): Promise<AlbumMatchResult> {
    const q = `${a.artist} ${a.title}`.replace(/\s+/g, ' ').trim();
    try {
      const out = await this.run([`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAw%253D%253D`, '--flat-playlist', '-J', '--no-warnings', '--playlist-end', '12']);
      return { id: a.id, candidates: parseAlbumSearch(JSON.parse(out), a).slice(0, n) };
    } catch (e) { return { id: a.id, candidates: [], error: (e as Error).message }; }
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
