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
  /** extra yt-dlp arguments from CURATOR_YTDLP_COOKIES / CURATOR_YTDLP_ARGS, put before every call */
  ytdlpArgs?: string[];
  ffmpegDir?: string;
  /** built web client to serve at `/`; unset/missing = API only */
  webDir?: string;
  /** scripts/update.sh of the checkout this server runs from, when "Update server" may be offered (under systemd, or CURATOR_UPDATE=1) */
  updateScript?: string;
  /** the server runs under a service manager that starts it again when it exits (systemd sets INVOCATION_ID) */
  updateRestart?: boolean;
}

/** Obscure by default so it doesn't collide with 8080/3000/5173 and isn't an obvious scan target. */
export const DEFAULT_PORT = 47813;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const dataDir = resolve(env.CURATOR_DATA_DIR ?? './data');
  mkdirSync(join(dataDir, 'files'), { recursive: true });
  mkdirSync(join(dataDir, 'tmp'), { recursive: true });

  const port = Number(env.CURATOR_PORT ?? DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid CURATOR_PORT: ${env.CURATOR_PORT}`);

  return {
    dataDir,
    port,
    host: env.CURATOR_HOST ?? '0.0.0.0',
    token: env.CURATOR_TOKEN ?? loadOrCreateToken(dataDir),
    maxUploadBytes: Number(env.CURATOR_MAX_UPLOAD_MB ?? 1024) * 1024 * 1024,
    ytdlp: env.CURATOR_YTDLP,
    ytdlpArgs: ytdlpArgs(env),
    ffmpegDir: env.CURATOR_FFMPEG_DIR,
    webDir: env.CURATOR_WEB_DIR ? resolve(env.CURATOR_WEB_DIR) : defaultWebDir(),
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

/** The checkout's update script, only when this looks like a service install (systemd) or CURATOR_UPDATE=1 asks for it. */
function defaultUpdateScript(env: NodeJS.ProcessEnv): string | undefined {
  if (env.CURATOR_UPDATE === '0' || !(env.CURATOR_UPDATE === '1' || env.INVOCATION_ID)) return undefined;
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
 * `CURATOR_YTDLP_COOKIES=/path/cookies.txt` becomes `--cookies <path>` (YouTube asks some servers to prove they are
 * not a bot; a cookies file from a signed-in browser answers that). `CURATOR_YTDLP_ARGS` adds anything else, split on spaces.
 */
export function ytdlpArgs(env: NodeJS.ProcessEnv): string[] | undefined {
  const args = [
    ...(env.CURATOR_YTDLP_COOKIES ? ['--cookies', resolve(env.CURATOR_YTDLP_COOKIES)] : []),
    ...(env.CURATOR_YTDLP_ARGS ? env.CURATOR_YTDLP_ARGS.split(/\s+/).filter(Boolean) : []),
  ];
  return args.length ? args : undefined;
}
