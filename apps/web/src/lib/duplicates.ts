import type { Library, Track } from './library.ts';
import { allSpotifyIds } from './spotifyLinks.ts';
import { youtubeId } from './youtube.ts';

/**
 * Possible duplicate tracks. The old check was "the same title and the same FIRST artist", which missed a song credited to a second
 * artist, spelt with an accent or "&", tagged "(Remastered 2011)", linked to the same Spotify or YouTube song, or stored as the same
 * audio file. Every signal links pairs of tracks; tracks linked directly or through others form one group, with the reasons listed
 * so the person can judge ("same audio file" is certain, "nearly the same title" is a guess).
 */
export interface DupeGroup { key: string; ids: string[]; reasons: string[] }

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** letters and digits only, "&" as "and", no leading "the": "Beyoncé & Jay-Z" and "beyonce and jay z" are one */
export const plain = (s: string) => fold(s).replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/^the /, '');
const FEAT = /[([]\s*(?:feat\.?|ft\.?|featuring|with)\b[^)\]]*[)\]]/gi;
/** edition / remaster tags that do not make a different recording (live, remix, acoustic, instrumental, demo, sped up... DO, so they are not here) */
const SAME_RECORDING = '(?:\\d{4}\\s+)?remaster(?:ed)?(?:\\s+\\d{4})?|\\d{4}\\s+version|single version|album version|radio (?:edit|version|mix)|original (?:version|mix)|explicit|clean|deluxe(?: edition)?|bonus track|mono|stereo|expanded(?: edition)?|anniversary edition|digital remaster';
const TAGGED_BRACKET = new RegExp(`\\s*[(\\[][^)\\]]*\\b(?:${SAME_RECORDING})\\b[^)\\]]*[)\\]]`, 'gi');
const TAGGED_DASH = new RegExp(`\\s+-\\s+[^-]*\\b(?:${SAME_RECORDING})\\b[^-]*$`, 'i');

/** a title without its "(feat. X)" credit */
export const songTitle = (title: string) => plain(title.replace(FEAT, ' '));
/** ...and without edition tags: "Hey Jude - Remastered 2015" and "Hey Jude" */
export const looseTitle = (title: string) => plain(title.replace(FEAT, ' ').replace(TAGGED_BRACKET, ' ').replace(TAGGED_DASH, ''));
/** an artist name as a key: no accents, no "- Topic" / "VEVO" channel suffix */
export const artistKey = (name: string) => plain(name.replace(/\s*-\s*topic$/i, '').replace(/vevo$/i, ''));

function levenshtein(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); best = Math.min(best, cur[j]); }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}
/** titles that differ by a typo or a dropped letter, never by a different word of a different song ("Song 1" / "Song 2" are not close) */
export function nearlySame(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 8) return false;
  if (/\d/.test(a) || /\d/.test(b)) return false; // numbers tell songs apart
  return levenshtein(a, b, 2) <= (Math.max(a.length, b.length) >= 14 ? 2 : 1);
}

export function findDuplicates(lib: Library, opts: { fuzzy?: boolean } = {}): DupeGroup[] {
  const tracks = lib.tracks;
  const index = new Map(tracks.map((t, i) => [t.id, i]));
  const parent = tracks.map((_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const why = new Map<number, Set<string>>(); // by pair root: filled after the unions, from the pairs that made them
  const pairs: { a: number; b: number; reason: string }[] = [];
  const link = (a: Track, b: Track, reason: string) => { pairs.push({ a: index.get(a.id)!, b: index.get(b.id)!, reason }); };

  // names an artist goes by: its own, and its aliases (the library's artist record, when it has one)
  const keysOf = (t: Track) => new Set(t.leads.flatMap((l) => {
    const rec = lib.artistById.get(l.id) as { aliases?: string[] } | undefined;
    return [l.name, ...(rec?.aliases ?? [])].map(artistKey).filter(Boolean);
  }));
  const keys = new Map(tracks.map((t) => [t.id, keysOf(t)]));
  const shareArtist = (a: Track, b: Track) => { const ka = keys.get(a.id)!, kb = keys.get(b.id)!; for (const k of ka) if (kb.has(k)) return true; return false; };

  /** tracks that carry the same value, from `pick`, are the same song */
  const sameValue = (pick: (t: Track) => string[], reason: string) => {
    const by = new Map<string, Track[]>();
    for (const t of tracks) for (const v of new Set(pick(t))) by.set(v, [...(by.get(v) ?? []), t]);
    for (const g of by.values()) for (let i = 1; i < g.length; i++) link(g[0], g[i], reason);
  };
  sameValue((t) => (t.file ? [t.file] : []), 'the same audio file');
  sameValue((t) => allSpotifyIds(t), 'the same Spotify song');
  sameValue((t) => { const id = youtubeId(t.youtubeMusicUrl); return id ? [id] : []; }, 'the same YouTube video');

  /** same title (by `titleOf`) and one artist in common */
  const sameTitle = (titleOf: (t: Track) => string, reason: string, skip: (a: Track, b: Track) => boolean = () => false) => {
    const by = new Map<string, Track[]>();
    for (const t of tracks) { const k = titleOf(t); if (k) by.set(k, [...(by.get(k) ?? []), t]); }
    for (const g of by.values()) for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) if (shareArtist(g[i], g[j]) && !skip(g[i], g[j])) link(g[i], g[j], reason);
  };
  sameTitle((t) => songTitle(t.title), 'the same title and artist');
  // (a pair that already matched exactly is not listed again as "ignoring edition tags")
  sameTitle((t) => looseTitle(t.title), 'the same title and artist, ignoring edition tags such as (Remastered)', (a, b) => songTitle(a.title) === songTitle(b.title));

  if (opts.fuzzy !== false) {
    // titles one typo apart, for tracks sharing an artist (compared inside each artist, so the cost stays small)
    const byArtist = new Map<string, Track[]>();
    for (const t of tracks) for (const k of keys.get(t.id)!) byArtist.set(k, [...(byArtist.get(k) ?? []), t]);
    for (const g of byArtist.values()) {
      if (g.length < 2 || g.length > 500) continue;
      const titles = g.map((t) => looseTitle(t.title));
      for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) if (titles[i] !== titles[j] && nearlySame(titles[i], titles[j])) link(g[i], g[j], 'a nearly identical title (a typo?)');
    }
  }

  for (const p of pairs) { const ra = find(p.a), rb = find(p.b); if (ra !== rb) parent[ra] = rb; }
  const members = new Map<number, number[]>();
  tracks.forEach((_, i) => { const r = find(i); members.set(r, [...(members.get(r) ?? []), i]); });
  for (const p of pairs) { const r = find(p.a); why.set(r, (why.get(r) ?? new Set()).add(p.reason)); }
  const order = ['the same audio file', 'the same Spotify song', 'the same YouTube video', 'the same title and artist', 'the same title and artist, ignoring edition tags such as (Remastered)', 'a nearly identical title (a typo?)'];
  return [...members.entries()].filter(([, m]) => m.length > 1).map(([root, m]) => {
    const ids = m.map((i) => tracks[i].id);
    return { key: [...ids].sort().join(','), ids, reasons: [...(why.get(root) ?? [])].sort((a, b) => order.indexOf(a) - order.indexOf(b)) };
  }).sort((a, b) => b.ids.length - a.ids.length || a.key.localeCompare(b.key));
}
