import type { NavigateFunction } from 'react-router-dom';

export type PageKind = 'track' | 'album' | 'artist' | 'era' | 'playlist' | 'note';
const HOME: Record<PageKind, string> = { track: '', album: '/albums', artist: '/artists', era: '/eras', playlist: '/playlists', note: '/notes' };

/** Every address that shows this thing: its own page and its stats page. */
export const pagesOf = (kind: PageKind, id: string) => [`/stats/${kind}/${id}`, ...(HOME[kind] ? [`${HOME[kind]}/${id}`] : [])];

/** Is `pathname` one of the pages of that thing? */
export const isOnPageOf = (pathname: string, kind: PageKind, id: string) => pagesOf(kind, id).some((p) => pathname === p || pathname.startsWith(`${p}/`));

/**
 * Something was deleted or turned into something else. If the page being looked at belonged to it, leave: to its replacement when there
 * is one (`to`), else back to the page before (the history, so Back keeps making sense), else to `fallback` when there is no earlier page.
 * Nothing happens when the thing was removed from some other page (a menu on a list).
 */
export function leaveRemoved(nav: NavigateFunction, kind: PageKind, id: string, opts: { to?: string | null; fallback: string }) {
  if (!isOnPageOf(window.location.pathname, kind, id)) return;
  if (opts.to) { nav(opts.to, { replace: true }); return; }
  const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
  if (idx > 0) nav(-1); else nav(opts.fallback, { replace: true });
}
