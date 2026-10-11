import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface TunnelToken { found: boolean; token?: string; source?: string }

/** A Cloudflare tunnel token looks like a long base64 string (it decodes to {"a":account,"t":tunnel,"s":secret}). */
export const looksLikeTunnelToken = (s: string) => /^[A-Za-z0-9+/=_-]{60,}$/.test(s);

/** Pulls the token out of a systemd unit or env file: `... tunnel run --token XYZ`, `--token=XYZ` or `TUNNEL_TOKEN=XYZ`. */
export function tokenFromText(text: string): string | null {
  const candidates = [/--token[ =]+["']?([A-Za-z0-9+/=_-]{60,})/, /TUNNEL_TOKEN=["']?([A-Za-z0-9+/=_-]{60,})/, /service install\s+([A-Za-z0-9+/=_-]{60,})/];
  for (const re of candidates) { const m = re.exec(text); if (m) return m[1]; }
  return null;
}

/**
 * Where the tunnel token is kept on this server, so Settings can offer "Copy tunnel token" (to set the tunnel up on another machine,
 * or to re-install it): the CURATOR_TUNNEL_TOKEN variable, a `tunnel-token` file in the data folder, or the cloudflared service
 * that is already installed. Read on request only; it is never part of the status.
 */
export function findTunnelToken(dataDir: string, env: NodeJS.ProcessEnv = process.env, roots = ['/etc/systemd/system', '/lib/systemd/system', '/etc/cloudflared']): TunnelToken {
  if (env.CURATOR_TUNNEL_TOKEN && looksLikeTunnelToken(env.CURATOR_TUNNEL_TOKEN.trim())) return { found: true, token: env.CURATOR_TUNNEL_TOKEN.trim(), source: 'CURATOR_TUNNEL_TOKEN' };
  const file = join(dataDir, 'tunnel-token');
  if (existsSync(file)) { const t = readFileSync(file, 'utf8').trim(); if (looksLikeTunnelToken(t)) return { found: true, token: t, source: file }; }
  for (const dir of roots) {
    let names: string[] = [];
    try { names = readdirSync(dir).filter((n) => /cloudflared|tunnel/i.test(n)); } catch { continue; }
    for (const n of names) {
      try { const t = tokenFromText(readFileSync(join(dir, n), 'utf8')); if (t) return { found: true, token: t, source: join(dir, n) }; } catch { /* not readable by this user */ }
    }
  }
  return { found: false };
}
