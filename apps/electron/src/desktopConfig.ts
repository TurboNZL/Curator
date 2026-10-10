import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** What the desktop app remembers between launches (not the library itself). */
export interface DesktopConfig {
  /** where the library lives: database, audio, pictures. Put it on a big drive. */
  dataDir: string;
  /** the port of the app's own server. It stays fixed because the web client's storage belongs to this address. */
  port: number;
}

/** Local port of the embedded server. One above the Raspberry Pi server's default (47813), so both can run on one computer. */
export const DESKTOP_PORT = 47814;

const FILE = 'desktop.json';

/** Read the saved choices, with defaults for anything missing or unreadable. `userData` is Electron's per-user folder. */
export function loadDesktopConfig(userData: string, env: NodeJS.ProcessEnv = process.env): DesktopConfig {
  let saved: Partial<DesktopConfig> = {};
  try { saved = JSON.parse(readFileSync(join(userData, FILE), 'utf8')) as Partial<DesktopConfig>; } catch { /* first launch */ }
  const port = Number(env.CURATOR_DESKTOP_PORT ?? saved.port ?? DESKTOP_PORT);
  return {
    dataDir: env.CURATOR_DATA_DIR || (typeof saved.dataDir === 'string' && saved.dataDir ? saved.dataDir : join(userData, 'library')),
    port: Number.isInteger(port) && port >= 1 && port <= 65535 ? port : DESKTOP_PORT,
  };
}

export function saveDesktopConfig(userData: string, patch: Partial<DesktopConfig>) {
  const path = join(userData, FILE);
  let cur: Partial<DesktopConfig> = {};
  try { cur = JSON.parse(readFileSync(path, 'utf8')) as Partial<DesktopConfig>; } catch { /* none yet */ }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ ...cur, ...patch }, null, 2));
}

/** Where the built web client is: in the packaged app next to the executable's resources, in development in the monorepo. */
export function findWebDir(resourcesPath: string, devDir: string): string | null {
  for (const dir of [join(resourcesPath, 'web'), devDir]) if (existsSync(join(dir, 'index.html'))) return dir;
  return null;
}

/** Discord Rich Presence settings. Kept apart from DesktopConfig because they are optional and have no effect on where the library is. */
export interface DiscordConfig { discordEnabled: boolean; discordClientId: string }

export function loadDiscordConfig(userData: string, env: NodeJS.ProcessEnv = process.env): DiscordConfig {
  let saved: Partial<DiscordConfig> = {};
  try { saved = JSON.parse(readFileSync(join(userData, FILE), 'utf8')) as Partial<DiscordConfig>; } catch { /* none yet */ }
  const id = String(env.CURATOR_DISCORD_CLIENT_ID ?? saved.discordClientId ?? '').trim();
  return { discordEnabled: saved.discordEnabled !== false, discordClientId: /^\d{15,25}$/.test(id) ? id : '' };
}

export function saveDiscordConfig(userData: string, patch: Partial<DiscordConfig>) {
  saveDesktopConfig(userData, patch as Partial<DesktopConfig>);
}
