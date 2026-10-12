import { spawn } from 'node:child_process';

/**
 * Finds the YouTube Music album of an album that has no link yet, so it can be imported as a release (one at a time, with the usual
 * review). yt-dlp runs YouTube Music's own album search (`music.youtube.com/search?q=…#albums`, the “Albums” section) and opens the best few
 * results. Results are scored on the album title, the artist and the track count. Needs yt-dlp; a wrong pick is
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

/** The id behind a search result: a playlist (`OLAK5uy_…`, `PL…`) or a YouTube Music album page (`MPREb_…`). Single videos and channels are not albums. */
const albumIdOf = (e: any): string | undefined => {
  const raw = typeof e?.id === 'string' ? e.id : '';
  const url = String(e?.url ?? '');
  const id = /^(MPREb_|OLAK5uy_|PL|RD|FL)[\w-]+$/.test(raw) ? raw : /[?&]list=((?:OLAK5uy_|PL|RD|FL)[\w-]+)/.exec(url)?.[1] ?? /\/browse\/(MPREb_[\w-]+)/.exec(url)?.[1];
  return id;
};
const urlOf = (id: string) => (id.startsWith('MPREb_') ? `https://music.youtube.com/browse/${id}` : `https://music.youtube.com/playlist?list=${id}`);

/**
 * The results of YouTube Music's own album search (`music.youtube.com/search?q=…#albums`, a yt-dlp section), best first. YouTube Music's
 * result rows carry only a link, so `title` can be empty until `Matcher.resolve` has opened the album; results keep the search order
 * (YouTube's own ranking is a good prior) through a small bonus.
 */
export function parseAlbumSearch(info: unknown, a: MatchAlbum): AlbumCandidate[] {
  const entries: any[] = Array.isArray((info as any)?.entries) ? (info as any).entries : [];
  const out: AlbumCandidate[] = [];
  const seen = new Set<string>();
  entries.forEach((e, i) => {
    const id = albumIdOf(e);
    if (!id || seen.has(id)) return;
    seen.add(id);
    const title = typeof e.title === 'string' ? e.title : '';
    const c = { id, title, channel: String(e.channel ?? e.uploader ?? ''), count: typeof e.playlist_count === 'number' ? e.playlist_count : typeof e.n_entries === 'number' ? e.n_entries : null };
    out.push({ url: urlOf(id), title: c.title, channel: c.channel, count: c.count, score: (title ? scoreAlbum(a, c) : 0.1) + Math.max(0, 0.02 - i * 0.003) });
  });
  return out.sort((x, y) => y.score - x.score);
}

export class Matcher {
  private o: { ytdlp?: string; ytdlpArgs?: string[] };
  constructor(o: { ytdlp?: string; ytdlpArgs?: string[] } = {}) { this.o = o; }

  /**
   * Candidate albums for one album, best first. YouTube Music's album search gives links; each of the first few is opened (a flat read,
   * no audio) to learn its real title, artist and track count, which is what the score is made of. A failure is reported in `error`.
   */
  async album(a: MatchAlbum, n = 4): Promise<AlbumMatchResult> {
    const q = `${a.artist} ${a.title}`.replace(/\s+/g, ' ').trim();
    try {
      const out = await this.run([`https://music.youtube.com/search?q=${encodeURIComponent(q)}#albums`, '--flat-playlist', '-J', '--no-warnings', '--playlist-end', '8']);
      const found = parseAlbumSearch(JSON.parse(out), a).slice(0, 5);
      const opened = await Promise.all(found.map((c) => (c.title ? c : this.resolve(c, a))));
      return { id: a.id, candidates: opened.sort((x, y) => y.score - x.score).slice(0, n) };
    } catch (e) { return { id: a.id, candidates: [], error: (e as Error).message }; }
  }

  /** Open one album page: its title, artist and number of tracks. A page that cannot be read keeps its search position's score. */
  private async resolve(c: AlbumCandidate, a: MatchAlbum): Promise<AlbumCandidate> {
    try {
      const info = JSON.parse(await this.run([c.url, '--flat-playlist', '-J', '--no-warnings', '--playlist-end', '120'])) as any;
      const title = typeof info?.title === 'string' ? info.title : '';
      if (!title) return c;
      const channel = String(info.channel ?? info.uploader ?? '');
      const count = typeof info.playlist_count === 'number' ? info.playlist_count : Array.isArray(info.entries) ? info.entries.length : null;
      const id = typeof info.id === 'string' && /^(OLAK5uy_|PL)/.test(info.id) ? info.id : c.url.split(/list=|browse\//).pop()!;
      return { url: /^(OLAK5uy_|PL)/.test(id) ? urlOf(id) : c.url, title, channel, count, score: scoreAlbum(a, { id, title, channel, count }) };
    } catch { return c; }
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
