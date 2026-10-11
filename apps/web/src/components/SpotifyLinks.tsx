import { useState } from 'react';
import { Plus, X } from 'lucide-react';

/**
 * The Spotify links of one song: the played one first, then the others. The rows (blank ones included) live here while typing;
 * what is reported up is the stored shape: the first non-blank link, and the rest.
 */
export function SpotifyLinks({ primary, others, onChange }: { primary: string | null; others: string[]; onChange: (f: { spotifyUrl: string | null; spotifyUrls: string[] }) => void }) {
  const [rows, setRows] = useState<string[]>([primary ?? '', ...others]);
  const set = (next: string[]) => {
    setRows(next);
    const filled = next.map((x) => x.trim()).filter(Boolean);
    onChange({ spotifyUrl: filled[0] ?? null, spotifyUrls: filled.slice(1) });
  };
  return (
    <div className="space-y-2">
      {rows.map((u, i) => (
        <div key={i} className="flex gap-2">
          <input className="input min-w-0 flex-1" placeholder={i === 0 ? 'https://open.spotify.com/track/…' : 'Another Spotify link for this song'} value={u} aria-label={i === 0 ? 'Spotify URL' : `Other Spotify URL ${i}`}
            onChange={(e) => set(rows.map((x, j) => (j === i ? e.target.value : x)))} />
          {i > 0 && <button type="button" className="btn btn-ghost !px-2" aria-label="Remove this link" onClick={() => set(rows.filter((_, j) => j !== i))}><X size={15} /></button>}
        </div>))}
      <button type="button" className="btn btn-ghost !py-1 text-xs" disabled={rows.some((r) => !r.trim())} onClick={() => setRows([...rows, ''])}><Plus size={13} />Add another link</button>
    </div>
  );
}
