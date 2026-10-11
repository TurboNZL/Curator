/** Where a track lives in the library: its album page (opened on All tracks, with the row flashed) or, for a single, the Tracks list. */
export function trackPath(t: { id: string; albumId?: string | null }): string {
  return t.albumId ? `/albums/${t.albumId}?release=all&track=${encodeURIComponent(t.id)}` : `/tracks?track=${encodeURIComponent(t.id)}`;
}
