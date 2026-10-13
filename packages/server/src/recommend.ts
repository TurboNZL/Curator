/**
 * Where "more like this" comes from, since Spotify's own recommendation endpoints are closed to new apps. Two open sources, both best effort
 * (a failure is an empty answer, never an error): MusicBrainz turns an artist name into an id, ListenBrainz's labs service lists artists whose
 * listeners overlap. UNVERIFIED against the live services from the build sandbox: the shapes below follow their public documentation as
 * remembered, and the pure parts are tested with fixtures.
 */
type Fetch = typeof fetch;
const UA = 'TurboMusic/1.0 (personal music library; https://github.com/TurboNZL/turbomusic)';

export interface SimilarArtist { name: string; mbid: string; score: number }

export function parseMusicBrainzSearch(j: unknown, name: string): string | null {
  const list = (j as { artists?: { id?: string; name?: string; score?: number }[] } | null)?.artists ?? [];
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const same = list.filter((a) => a.id && norm(a.name ?? '') === norm(name));
  const hit = same.find((a) => (a.score ?? 0) >= 80) ?? (same.length === 1 ? same[0] : null);
  return hit?.id ?? null;
}

export function parseSimilar(j: unknown): SimilarArtist[] {
  const rows = Array.isArray(j) ? j : Array.isArray((j as { data?: unknown[] } | null)?.data) ? (j as { data: unknown[] }).data : [];
  const out: SimilarArtist[] = [];
  for (const r of rows as { name?: string; artist_mbid?: string; score?: number; reference_mbid?: string }[]) {
    if (!r?.name || !r.artist_mbid) continue;
    out.push({ name: r.name, mbid: r.artist_mbid, score: Number(r.score) || 0 });
  }
  return out.sort((a, b) => b.score - a.score);
}

export async function artistMbid(name: string, f: Fetch = fetch): Promise<string | null> {
  try {
    const res = await f(`https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(`artist:"${name.replace(/"/g, '')}"`)}&fmt=json&limit=5`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10_000) });
    return res.ok ? parseMusicBrainzSearch(await res.json(), name) : null;
  } catch { return null; }
}

/** Tried in order; the first that answers with artists wins. The first is the one checked against the live service in October 2026. */
export const ALGORITHMS = [
  'session_based_days_7500_session_300_contribution_5_threshold_10_limit_100_filter_True_skip_30',
  'session_based_days_9000_session_300_contribution_5_threshold_15_limit_50_skip_30',
];

export async function similarArtists(name: string, f: Fetch = fetch, limit = 20): Promise<SimilarArtist[]> {
  const mbid = await artistMbid(name, f);
  if (!mbid) return [];
  for (const algorithm of ALGORITHMS) {
    try {
      const res = await f(`https://labs.api.listenbrainz.org/similar-artists/json?artist_mbids=${mbid}&algorithm=${algorithm}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) continue;
      const found = parseSimilar(await res.json()).slice(0, limit);
      if (found.length) return found;
    } catch { /* try the next one */ }
  }
  return [];
}
