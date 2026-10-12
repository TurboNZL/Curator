import { Play } from 'lucide-react';
import { canPlay } from '../lib/spotifyPlayer.ts';
import type { Track } from '../lib/derive.ts';
import { usePlayer } from '../lib/player.ts';
import { useEditor } from '../lib/editor.ts';
import { Cover } from './Cover.tsx';
import { ArtistLinks } from './ArtistLinks.tsx';
import { Rating } from './Rating.tsx';
import { useMenu } from './Menu.tsx';
import { useTrackMenuItems } from './TrackMenu.tsx';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** 2024-05-17 -> 17 May 2024; a year or a month alone is shown as far as it goes. */
export function fmtDate(d: string): string {
  const [y, m, day] = d.split('-');
  return [day && Number(day) ? String(Number(day)) : '', m && MONTHS[Number(m) - 1] ? MONTHS[Number(m) - 1] : '', y].filter(Boolean).join(' ');
}

/** A track that is not on an album, shown as a cover card. Click plays it; right-click or ⋯ has the usual track menu. */
export function SingleGrid({ tracks }: { tracks: Track[] }) {
  const play = usePlayer((s) => s.play);
  const edit = useEditor((s) => s.open);
  const menu = useMenu();
  const itemsFor = useTrackMenuItems();
  const ids = tracks.filter(canPlay).map((t) => t.id);
  return (
    <>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(var(--grid-min), 1fr))' }}>
        {tracks.map((t) => {
          const run = () => play(t.id, ids, { type: 'search', id: null });
          return (
            <div key={t.id} className="bt-tile group" onContextMenu={menu.onContextMenu(itemsFor(t, run), `Actions for ${t.title}`, t.id)}>
              <div className="relative">
                <Cover hash={t.cover} seed={t.title} className="transition-transform group-hover:scale-[1.02]" />
                <button className="btn btn-accent absolute bottom-2 right-2 !rounded-full !p-2.5 opacity-0 shadow-lg transition-opacity focus-visible:opacity-100 group-hover:opacity-100" disabled={!t.file}
                  aria-label={`Play ${t.title}`} title={t.file ? 'Play' : 'No audio file yet'} onClick={run}><Play size={16} fill="currentColor" /></button>
              </div>
              <button className="bt-cap-t mt-2 block w-full truncate text-left text-sm font-medium hover:underline" onClick={() => edit({ kind: 'track-details', id: t.id })}>{t.title}</button>
              <div className="bt-cap flex items-center justify-between gap-2 text-xs text-muted"><span className="truncate"><ArtistLinks leads={t.leads} featured={t.featured} /></span><Rating track={t} size="sm" /></div>
              <div className="bt-cap truncate text-xs text-muted" title={t.releaseDate ? `Released ${t.releaseDate}` : 'No release date yet'}>{t.releaseDate ? fmtDate(t.releaseDate) : <button className="hover:text-fg hover:underline" onClick={() => edit({ kind: 'track', id: t.id })}>No date</button>}</div>
            </div>
          );
        })}
      </div>
      {menu.element}
    </>
  );
}
