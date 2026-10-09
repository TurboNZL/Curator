import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { safeUrl } from './acquire.ts';
import type { Store } from './db.ts';
import { filePath } from './files.ts';

export interface PreviewEntry { id: string; title: string; rawTitle: string; url: string; duration: number | null }
export interface Preview { title: string; artist: string; thumbnail: string | null; entries: PreviewEntry[] }

const NOISE = /\s*[(\[]\s*(official\s*(music\s*)?(video|audio|lyric\s*video|visuali[sz]er)|lyrics?(\s*video)?|audio|visuali[sz]er|hd|hq|explicit)\s*[)\]]\s*/gi;

/** "Artist - Song (Official Audio)" -> "Song". Only strips well-known noise and a leading "Artist - ". */
export function cleanTitle(title: string, artist?: string): string {
  let t = title.replace(NOISE, ' ').replace(/\s+/g, ' ').trim();
  if (artist) {
    const a = artist.toLowerCase();
    const m = /^(.+?)\s+[-–—]\s+(.+)$/.exec(t);
    if (m && m[1].toLowerCase() === a) t = m[2].trim();
  }
  return t || title.trim();
}

const cleanArtist = (s: string) => s.replace(/\s*-\s*Topic$/i, '').trim();

/** Turn yt-dlp's `-J --flat-playlist` output into what the review screen needs (pure; tested without yt-dlp). */
export function parsePreview(info: any): Preview {
  const isList = Array.isArray(info?.entries);
  const raw: any[] = (isList ? info.entries : [info]).filter((e: any) => e && e.id);
  const artist = cleanArtist(String(info?.uploader ?? info?.channel ?? info?.artist ?? raw[0]?.uploader ?? raw[0]?.channel ?? '') || 'Unknown artist');
  let title = String(info?.title ?? 'Untitled album').trim();
  if (isList) title = title.replace(/^(album|single|ep)\s*[-–—:]\s*/i, '').trim() || title; // YouTube Music prefixes "Album - "
  const pickThumb = (o: any): string | null => o?.thumbnail ?? (Array.isArray(o?.thumbnails) && o.thumbnails.length ? o.thumbnails[o.thumbnails.length - 1].url : null) ?? null;
  return {
    title, artist,
    thumbnail: pickThumb(info) ?? pickThumb(raw[0]),
    entries: raw.map((e) => ({
      id: String(e.id), rawTitle: String(e.title ?? ''), title: cleanTitle(String(e.title ?? 'Unknown track'), artist),
      url: e.webpage_url ?? e.url ?? `https://www.youtube.com/watch?v=${e.id}`,
      duration: typeof e.duration === 'number' ? e.duration : null,
    })),
  };
}

const COVER_HOSTS = ['ytimg.com', 'ggpht.com', 'googleusercontent.com'];
const MAX_COVER = 10 * 1024 * 1024;

export class ImportError extends Error {
  readonly status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export class Importer {
  private o: { dataDir: string; store: Store; ytdlp?: string; fetchImpl?: typeof fetch };
  constructor(o: { dataDir: string; store: Store; ytdlp?: string; fetchImpl?: typeof fetch }) { this.o = o; }

  /** Metadata only (no downloads), so the user can review before anything is fetched. */
  async preview(url: unknown): Promise<Preview> {
    const u = safeUrl(url);
    if (!u) throw new ImportError(400, 'That does not look like a web link');
    const out = await this.run(['--flat-playlist', '-J', '--no-warnings', '--', u]);
    let info: unknown;
    try { info = JSON.parse(out); } catch { throw new ImportError(502, 'yt-dlp returned something unreadable'); }
    const p = parsePreview(info);
    if (!p.entries.length) throw new ImportError(404, 'No tracks found at that link');
    return p;
  }

  /** Fetch an image from a YouTube/Google image host into the file store; returns its hash. */
  async fetchCover(url: unknown): Promise<string> {
    const u = safeUrl(url);
    const host = u ? new URL(u).hostname : '';
    if (!u || !u.startsWith('https://') || !COVER_HOSTS.some((h) => host === h || host.endsWith('.' + h))) throw new ImportError(400, 'Only YouTube image links are allowed');
    const res = await (this.o.fetchImpl ?? fetch)(u);
    if (!res.ok) throw new ImportError(502, `Image host said ${res.status}`);
    const type = res.headers.get('content-type') ?? '';
    if (!type.startsWith('image/')) throw new ImportError(502, 'That link is not an image');
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_COVER) throw new ImportError(413, 'Image too large');
    const hash = createHash('sha256').update(buf).digest('hex');
    if (!this.o.store.hasFile(hash)) {
      const dest = filePath(this.o.dataDir, hash);
      if (!existsSync(dest)) {
        mkdirSync(join(this.o.dataDir, 'files', hash.slice(0, 2)), { recursive: true });
        const tmp = join(this.o.dataDir, 'tmp', `${hash}.${process.pid}.cover`);
        writeFileSync(tmp, buf);
        renameSync(tmp, dest);
      }
      this.o.store.addFile(hash, buf.length, type.split(';')[0]);
    }
    return hash;
  }

  private run(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.o.ytdlp ?? 'yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '', err = '';
      const timer = setTimeout(() => { child.kill(); reject(new ImportError(504, 'yt-dlp took too long')); }, 90_000);
      child.stdout.on('data', (d) => { out += d; if (out.length > 20_000_000) child.kill(); });
      child.stderr.on('data', (d) => { err = (err + d).slice(-2000); });
      child.on('error', (e: NodeJS.ErrnoException) => { clearTimeout(timer); reject(new ImportError(500, e.code === 'ENOENT' ? `yt-dlp not found (${this.o.ytdlp ?? 'yt-dlp'}). Install it or set CURATOR_YTDLP.` : e.message)); });
      child.on('close', (code) => { clearTimeout(timer); code === 0 ? resolve(out) : reject(new ImportError(502, `yt-dlp failed: ${err.trim().split('\n').pop() ?? code}`)); });
    });
  }
}
