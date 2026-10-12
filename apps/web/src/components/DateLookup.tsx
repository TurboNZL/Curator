import { useState } from 'react';
import { CalendarSearch, Loader2 } from 'lucide-react';
import { api, useStore } from '../lib/store.ts';

const SOURCE = { spotify: 'Spotify', itunes: 'iTunes', musicbrainz: 'MusicBrainz' } as const;

/**
 * "Look up" for a single's release date: the server asks Spotify (when signed in), iTunes and MusicBrainz for a single with exactly this
 * title by this artist (the albums' date finder does the same per album). The answer goes into the field; nothing is saved until the
 * editor is.
 */
export function DateLookup({ title, artist, onFound }: { title: string; artist: string; onFound: (date: string) => void }) {
  const configured = useStore((s) => !!s.settings.token);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const ready = configured && !!title.trim() && !!artist.trim();
  async function run() {
    setBusy(true); setNote(null);
    try {
      const { results } = await api().releaseDates([{ id: 'single', album: title.trim(), artist: artist.trim() }]);
      const a = results[0]?.answer;
      if (a) { onFound(a.date); setNote({ ok: true, text: `Found ${a.date} (${SOURCE[a.source]}). Save to keep it.` }); }
      else setNote({ ok: false, text: `No exact match for “${title.trim()}” by ${artist.trim()}. Type the date yourself.` });
    } catch (e) { setNote({ ok: false, text: (e as Error).message === 'Failed to fetch' ? 'Cannot reach the server.' : (e as Error).message }); }
    finally { setBusy(false); }
  }
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      <button type="button" className="btn" disabled={!ready || busy} onClick={() => void run()} title={configured ? 'Ask Spotify, iTunes and MusicBrainz' : 'Looking dates up needs your server (Settings)'}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : <CalendarSearch size={15} />}Look up</button>
      {note && <span role="status" className={note.ok ? 'text-xs text-good' : 'text-xs text-warn'}>{note.text}</span>}
      {!configured && <span className="text-xs text-muted">Needs your server (Settings).</span>}
    </div>
  );
}
