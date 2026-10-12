/** Adding a YouTube album to an album that already exists (a deluxe edition, or completing an album a Spotify import started). */
const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\s*[(\[]\s*(feat|ft|with)\b[^)\]]*[)\]]/g, ' ').replace(/\bfeat\.?\s.*$/, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const bare = (s: string) => norm(s).replace(/\b(remastered|remaster|deluxe|version|explicit|bonus track|mono|stereo)\b/g, '').replace(/\s+/g, ' ').trim();

export interface MergeEntry { id: string; title: string; url: string; duration?: number | null }
export interface MergeTrack { id: string; title: string; youtubeMusicUrl: string | null }
export interface MergeRow {
  entry: MergeEntry;
  /** the album's track this entry is, or null: a new track */
  trackId: string | null;
  /** part of this edition (ticked); an unticked row is left out entirely */
  include: boolean;
  /** the title to use for a new track */
  title: string;
}

/** word-set overlap (0..1) */
function overlap(a: string, b: string): number {
  const x = new Set(a.split(' ').filter(Boolean)), y = new Set(b.split(' ').filter(Boolean));
  if (!x.size || !y.size) return 0;
  let n = 0; for (const w of x) if (y.has(w)) n++;
  return n / Math.max(x.size, y.size);
}

/**
 * Match what the link holds against the tracks the album already has: the same song (ignoring "(feat. …)", accents and punctuation) is
 * the existing track and is not added again; anything else is new. An existing track is used for at most one entry. Pure; tested.
 */
export function matchEntries(existing: MergeTrack[], entries: MergeEntry[]): MergeRow[] {
  const used = new Set<string>();
  const rows: MergeRow[] = entries.map((entry) => ({ entry, trackId: null, include: true, title: entry.title }));
  const pass = (ok: (e: MergeEntry, t: MergeTrack) => boolean) => rows.forEach((r) => {
    if (r.trackId) return;
    const t = existing.find((x) => !used.has(x.id) && ok(r.entry, x));
    if (t) { r.trackId = t.id; used.add(t.id); }
  });
  pass((e, t) => !!e.url && !!t.youtubeMusicUrl && videoId(e.url) !== null && videoId(e.url) === videoId(t.youtubeMusicUrl));
  pass((e, t) => norm(e.title) === norm(t.title));
  pass((e, t) => bare(e.title) === bare(t.title));
  pass((e, t) => overlap(bare(e.title), bare(t.title)) >= 0.8);
  return rows;
}

export function videoId(url: string | null | undefined): string | null {
  if (!url) return null;
  try { const u = new URL(url); return u.searchParams.get('v') ?? (u.hostname === 'youtu.be' ? u.pathname.slice(1) : null); } catch { return null; }
}

/**
 * The album's explicit track order after adding new tracks: they go right after the closest earlier track of the edition that is already
 * in the album (so a deluxe's extra tracks land where the edition puts them), or at the start when nothing before them is.
 */
export function insertNewTracks(order: string[], rows: { trackId: string | null; newId?: string; include: boolean }[]): string[] {
  const out = [...order];
  let anchor: string | null = null;
  for (const r of rows) {
    if (!r.include) continue;
    if (r.trackId) { anchor = r.trackId; continue; }
    if (!r.newId || out.includes(r.newId)) continue;
    const at = anchor ? out.indexOf(anchor) + 1 : 0;
    out.splice(at < 0 ? out.length : at, 0, r.newId);
    anchor = r.newId;
  }
  return out;
}

/**
 * The album's "All tracks" order after an import. When the imported edition holds every track the album already has (a deluxe edition,
 * or the real YouTube album completing a Spotify placeholder) the edition's own order is the album's order: slotting new tracks into the
 * old order instead scrambled the album whenever the two orders differed. When the edition lacks some of the album's tracks, the album
 * keeps its order and the new tracks go in after their nearest earlier neighbour (`insertNewTracks`).
 */
export function mergeAllTracksOrder(order: string[], rows: { trackId: string | null; newId?: string; include: boolean }[]): string[] {
  const edition: string[] = [];
  for (const r of rows) { const id = r.include ? (r.trackId ?? r.newId) : undefined; if (id && !edition.includes(id)) edition.push(id); }
  if (order.every((id) => edition.includes(id))) return edition;
  return insertNewTracks(order, rows);
}
