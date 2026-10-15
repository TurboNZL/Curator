import { mkdirSync, existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

export interface Config {
  /** Everything the server owns lives under here: db, files, token. Point it at the external drive. */
  dataDir: string;
  port: number;
  host: string;
  token: string;
  maxUploadBytes: number;
  ytdlp?: string;
  /** extra yt-dlp arguments from TURBOMUSIC_YTDLP_COOKIES / TURBOMUSIC_YTDLP_ARGS, put before every call */
  ytdlpArgs?: string[];
  ffmpegDir?: string;
  /** built web client to serve at `/`; unset/missing = API only */
  webDir?: string;
  /** scripts/update.sh of the checkout this server runs from, when "Update server" may be offered (under systemd, or TURBOMUSIC_UPDATE=1) */
  updateScript?: string;
  /** the folder of a self-contained install (scripts/install-server.sh): `app` links into `releases/`; "Update server" then downloads the newest release bundle */
  installRoot?: string;
  /** a read-only GitHub token, for updating from a private repository */
  githubToken?: string;
  /** the server runs under a service manager that starts it again when it exits (systemd sets INVOCATION_ID) */
  updateRestart?: boolean;
}

/** Obscure by default so it doesn't collide with 8080/3000/5173 and isn't an obvious scan target. */
export const DEFAULT_PORT = 47813;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const dataDir = resolve(env.TURBOMUSIC_DATA_DIR ?? './data');
  mkdirSync(join(dataDir, 'files'), { recursive: true });
  mkdirSync(join(dataDir, 'tmp'), { recursive: true });
  mkdirSync(join(dataDir, 'cache'), { recursive: true });

  const port = Number(env.TURBOMUSIC_PORT ?? DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid TURBOMUSIC_PORT: ${env.TURBOMUSIC_PORT}`);

  return {
    dataDir,
    port,
    host: env.TURBOMUSIC_HOST ?? '0.0.0.0',
    token: env.TURBOMUSIC_TOKEN ?? loadOrCreateToken(dataDir),
    maxUploadBytes: Number(env.TURBOMUSIC_MAX_UPLOAD_MB ?? 1024) * 1024 * 1024,
    ytdlp: env.TURBOMUSIC_YTDLP,
    ytdlpArgs: withCacheDir(ytdlpArgs(env), dataDir),
    ffmpegDir: env.TURBOMUSIC_FFMPEG_DIR,
    webDir: env.TURBOMUSIC_WEB_DIR ? resolve(env.TURBOMUSIC_WEB_DIR) : defaultWebDir(),
    installRoot: env.TURBOMUSIC_INSTALL_ROOT ? resolve(env.TURBOMUSIC_INSTALL_ROOT) : undefined,
    githubToken: env.TURBOMUSIC_GITHUB_TOKEN || undefined,
    updateScript: defaultUpdateScript(env),
    updateRestart: !!env.INVOCATION_ID,
  };
}

function loadOrCreateToken(dataDir: string): string {
  const path = join(dataDir, 'token');
  if (existsSync(path)) return readFileSync(path, 'utf8').trim();
  const token = randomBytes(24).toString('base64url');
  writeFileSync(path, token + '\n', { mode: 0o600 });
  try { chmodSync(path, 0o600); } catch { /* some external-drive filesystems (exFAT/NTFS) have no modes */ }
  return token;
}

/** The checkout's update script, only when this looks like a service install (systemd) or TURBOMUSIC_UPDATE=1 asks for it. */
function defaultUpdateScript(env: NodeJS.ProcessEnv): string | undefined {
  if (env.TURBOMUSIC_UPDATE === '0' || !(env.TURBOMUSIC_UPDATE === '1' || env.INVOCATION_ID)) return undefined;
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  const script = join(repo, 'scripts/update.sh');
  return existsSync(script) && existsSync(join(repo, '.git')) ? script : undefined;
}

/** apps/web/dist next to this package in the monorepo, if it has been built */
function defaultWebDir(): string | undefined {
  const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../apps/web/dist');
  return existsSync(join(dir, 'index.html')) ? dir : undefined;
}

/**
 * yt-dlp keeps a cache (the YouTube player code it works out, signatures) in ~/.cache, which on a Raspberry Pi is the SD card and
 * is written on every download. Keep it next to the library instead, unless the person chose a place with --cache-dir.
 */
export function withCacheDir(args: string[] | undefined, dataDir: string): string[] {
  const own = args ?? [];
  return own.some((a) => a === '--cache-dir' || a.startsWith('--cache-dir=') || a === '--no-cache-dir') ? own : ['--cache-dir', join(dataDir, 'cache'), ...own];
}

/**
 * `TURBOMUSIC_YTDLP_COOKIES=/path/cookies.txt` becomes `--cookies <path>` (YouTube asks some servers to prove they are
 * not a bot; a cookies file from a signed-in browser answers that). `TURBOMUSIC_YTDLP_ARGS` adds anything else, split on spaces.
 */
export function ytdlpArgs(env: NodeJS.ProcessEnv, opts: { exists?: (path: string) => boolean; warn?: (message: string) => void } = {}): string[] | undefined {
  const exists = opts.exists ?? existsSync;
  const cookies = env.TURBOMUSIC_YTDLP_COOKIES ? resolve(env.TURBOMUSIC_YTDLP_COOKIES) : '';
  // yt-dlp writes cookies back when it exits, so a path whose folder is gone makes it crash with a bare "[PYI-n:ERROR] Failed to execute script"
  // (FileNotFoundError). A missing file is skipped, loudly, instead: the server keeps working and says what to fix.
  const usable = cookies && exists(cookies);
  if (cookies && !usable) (opts.warn ?? console.warn)(`TURBOMUSIC_YTDLP_COOKIES points at ${cookies}, which does not exist, so yt-dlp runs WITHOUT cookies. Fix the path in settings.env and restart.`);
  const args = [
    ...(usable ? ['--cookies', cookies] : []),
    ...(env.TURBOMUSIC_YTDLP_ARGS ? env.TURBOMUSIC_YTDLP_ARGS.split(/\s+/).filter(Boolean) : []),
  ];
  return args.length ? args : undefined;
}
