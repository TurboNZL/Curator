import { spawn } from 'node:child_process';

/**
 * Finds the YouTube Music album of an album that has no link yet, so it can be imported as a release (one at a time, with the usual
 * review). yt-dlp runs YouTube Music's own album search (`music.youtube.com/search?q=…#albums`, the “Albums” section) and opens the best few
 * results. Results are scored on the album title, the artist and the track count. Needs yt-dlp; a wrong pick is
 * possible, which is why the importer shows the whole tracklist before anything is saved.
 */
export interface MatchAlbum { id: string; title: string; artist: string; trackCount?: number | null }
export interface AlbumCandidate {
  url: string; title: string; channel: string; /** tracks in the playlist when YouTube said */ count: number | null; score: number;
  /** the uploader's handle (`@Drake`) when YouTube gave one */ owner?: string;
  /** a cover picture of the playlist */ thumbnail?: string;
  /** what makes this edition differ from the album's own title ("deluxe edition"), '' for the plain album */ edition?: string;
}
export interface AlbumMatchResult { id: string; candidates: AlbumCandidate[]; error?: string }

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\(feat[^)]*\)|\[feat[^\]]*\]|\bfeat\.?\s.*$/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const words = (s: string) => new Set(norm(s).split(' ').filter(Boolean));
const BAD = /\b(live|remix(es)?|karaoke|instrumental|slowed|sped up|reverb|nightcore|8d|mix|best of|greatest hits|playlist|full album|reaction)\b/i;

/** Words that only say which edition of the same album a playlist is; they never count against a match. */
const EDITION_WORDS = new Set(['deluxe', 'edition', 'expanded', 'remaster', 'remastered', 'anniversary', 'bonus', 'version', 'explicit', 'clean', 'special', 'complete', 'platinum', 'collector', 'collectors', 'extended', 'reissue', 'original', 'international', 'tracks', 'track', 'album', 'the', 'us', 'uk']);
const isEditionWord = (w: string) => EDITION_WORDS.has(w) || /^(19|20)\d\d$/.test(w);

/** What sets a playlist's title apart from the album's own: "Deluxe Edition", "2011 Remaster"... or '' for the plain album. */
export function editionOf(albumTitle: string, candidateTitle: string): string {
  const own = words(albumTitle);
  const extra = norm(candidateTitle.replace(/^album\s*-\s*/i, '')).split(' ').filter((w) => w && !own.has(w));
  return extra.some((w) => isEditionWord(w) && !/^(the|tracks?|album|us|uk)$/.test(w)) ? extra.join(' ') : '';
}

/**
 * 0..1: how likely a playlist is this album. Only the evidence that exists counts: the score is what the playlist earned out of what
 * could be known, so a perfect title and artist reads 100% even when YouTube gave no track count (it used to top out near 60%). Another
 * edition of the same album (Deluxe, Remastered...) scores as the album; `editionOf` tells them apart. Pure; tested.
 */
export function scoreAlbum(a: MatchAlbum, c: { id: string; title: string; channel: string; count: number | null }): number {
  const tw = words(a.title), cw = words(c.title.replace(/^album\s*-\s*/i, ''));
  if (!tw.size) return 0;
  let hit = 0; for (const w of tw) if (cw.has(w)) hit++;
  const extras = [...cw].filter((w) => !tw.has(w) && !isEditionWord(w));
  let earned = 0.55 * (hit / tw.size), possible = 0.55;
  const aw = words(a.artist);
  if (aw.size) {
    const pool = new Set([...cw, ...words(c.channel)]); let n = 0; for (const w of aw) if (pool.has(w)) n++;
    // the artist is evidence when YouTube named the uploader, or when the title itself carries the name; with neither it says nothing
    if (c.channel || n > 0) { earned += 0.25 * (n / aw.size); possible += 0.25; }
  }
  if (a.trackCount && c.count) {
    const d = Math.abs(c.count - a.trackCount); // an edition may add songs, so being longer costs less than being shorter
    const over = c.count >= a.trackCount;
    earned += 0.15 * (d === 0 ? 1 : d <= 2 ? 0.75 : over && d <= 12 ? 0.5 : d > 8 ? 0 : 0.25); possible += 0.15;
  }
  possible += 0.05; if (/^OLAK5uy_/.test(c.id)) earned += 0.05; // YouTube Music's own album playlists
  let score = earned / possible;
  if (extras.length > tw.size + 3) score -= 0.15; // a long title is a compilation, not the album
  if (BAD.test(c.title) && !BAD.test(a.title)) score -= 0.3;
  return Math.max(0, Math.min(1, score));
}

/** YouTube Music serves the real square album art from Google image hosts; every other thumbnail is a cropped video frame. */
const isSquareArt = (u: string) => { try { const h = new URL(u).hostname; return h === 'googleusercontent.com' || h.endsWith('.googleusercontent.com') || h === 'ggpht.com' || h.endsWith('.ggpht.com'); } catch { return false; } };
export const thumbOf = (e: any): string | undefined => {
  const listed: { url: string; size: number }[] = Array.isArray(e?.thumbnails) ? e.thumbnails.filter((x: any) => typeof x?.url === 'string').map((x: any) => ({ url: x.url as string, size: (x.width ?? 0) * (x.height ?? 0) })) : [];
  if (typeof e?.thumbnail === 'string') listed.push({ url: e.thumbnail, size: 0 });
  const square = listed.filter((x) => isSquareArt(x.url)).sort((a, b) => b.size - a.size)[0]?.url;
  // a Google art link ends in `=w544-h544-...`: 300 px is plenty for a result row and loads fast
  if (square) return square.replace(/=w\d+-h\d+/, '=w300-h300');
  return listed.sort((a, b) => b.size - a.size)[0]?.url;
};
const ownerOf = (e: any): string | undefined => {
  const h = typeof e?.uploader_id === 'string' && e.uploader_id ? e.uploader_id : typeof e?.channel_id === 'string' ? '' : '';
  const fromUrl = /youtube\.com\/(@[\w.-]+)/.exec(String(e?.uploader_url ?? e?.channel_url ?? ''))?.[1];
  return fromUrl ?? (h.startsWith('@') ? h : undefined);
};

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
    out.push({ url: urlOf(id), title: c.title, channel: c.channel, count: c.count, score: (title ? scoreAlbum(a, c) : 0.1) + Math.max(0, 0.02 - i * 0.003), owner: ownerOf(e), thumbnail: thumbOf(e), edition: title ? editionOf(a.title, title) : undefined });
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
  private cache = new Map<string, { at: number; result: AlbumMatchResult }>();

  async album(a: MatchAlbum, n = 6): Promise<AlbumMatchResult> {
    const q = `${a.artist} ${a.title}`.replace(/\s+/g, ' ').trim();
    const key = `${q.toLowerCase()}|${a.trackCount ?? ''}`;
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < 10 * 60_000) return { ...hit.result, id: a.id };
    const result = await this.search(a, q, n);
    if (!result.error && result.candidates.length) this.cache.set(key, { at: Date.now(), result });
    return result;
  }

  private async search(a: MatchAlbum, q: string, n: number): Promise<AlbumMatchResult> {
    try {
      const out = await this.run([`https://music.youtube.com/search?q=${encodeURIComponent(q)}#albums`, '--flat-playlist', '-J', '--no-warnings', '--playlist-end', '8']);
      const found = parseAlbumSearch(JSON.parse(out), a).slice(0, 6);
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
      const count = typeof info.playlist_count === 'number' ? info.playlist_count : typeof info.n_entries === 'number' ? info.n_entries : Array.isArray(info.entries) ? info.entries.length : null;
      const id = typeof info.id === 'string' && /^(OLAK5uy_|PL)/.test(info.id) ? info.id : c.url.split(/list=|browse\//).pop()!;
      const first = Array.isArray(info.entries) ? info.entries[0] : undefined;
      return { url: /^(OLAK5uy_|PL)/.test(id) ? urlOf(id) : c.url, title, channel, count, score: scoreAlbum(a, { id, title, channel, count }), owner: ownerOf(info) ?? c.owner, thumbnail: thumbOf(info) ?? thumbOf(first) ?? c.thumbnail, edition: editionOf(a.title, title) };
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
