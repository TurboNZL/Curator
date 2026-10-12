import { useEffect, useState } from 'react';
import { api, useStore } from './store.ts';
import { parseLrc, type LrcLine } from './lrc.ts';

export type LyricsView = { state: 'off' | 'loading' | 'none' | 'error'; message?: string } | { state: 'ready'; synced: LrcLine[] | null; plain: string | null; instrumental: boolean; source: string };

const cache = new Map<string, LyricsView>();

/** Lyrics of a track from the server (which asks LRCLIB). Asked once per track and remembered while the page is open. */
export function useLyrics(track: { id: string; title: string; artist: string; album?: string | null } | undefined, duration: number, enabled: boolean): LyricsView {
  const configured = useStore((s) => !!s.settings.token);
  const [view, setView] = useState<LyricsView>({ state: 'off' });
  const id = track?.id;
  useEffect(() => {
    if (!enabled || !track || !id) { setView({ state: 'off' }); return; }
    if (!configured) { setView({ state: 'none', message: 'Lyrics come from your server: connect one in Settings.' }); return; }
    const hit = cache.get(id);
    if (hit) { setView(hit); return; }
    let live = true;
    setView({ state: 'loading' });
    api().lyrics({ artist: track.artist, title: track.title.replace(/\s*[([]\s*(feat|ft|with)\b[^)\]]*[)\]]/gi, '').trim(), album: track.album ?? undefined, duration: duration || undefined })
      .then(({ lyrics }) => {
        const v: LyricsView = lyrics ? { state: 'ready', synced: lyrics.synced ? parseLrc(lyrics.synced) : null, plain: lyrics.plain, instrumental: lyrics.instrumental, source: lyrics.source } : { state: 'none' };
        if (v.state === 'none' || (v.state === 'ready' && v.synced?.length !== 0)) cache.set(id, v);
        if (live) setView(v);
      })
      .catch((e: Error) => { if (live) setView({ state: 'error', message: e.message }); });
    return () => { live = false; };
    // the length only helps to pick the right recording; it should not trigger a second request when it becomes known
  }, [id, enabled, configured]); // eslint-disable-line react-hooks/exhaustive-deps
  return view;
}
