import { useFileUrl } from '../lib/files.ts';
import type { MatchCandidate } from '../lib/api.ts';

/** The picture of an album-finder result: the file the server already downloaded (what the import will use), else the plain link. */
export function CandidateArt({ c, className }: { c: Pick<MatchCandidate, 'coverHash' | 'thumbnail'>; className: string }) {
  const stored = useFileUrl(c.coverHash);
  const src = stored ?? (c.coverHash ? null : c.thumbnail ?? null);
  return src ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className={className} /> : <span className={className.replace(/object-cover/, '')} aria-hidden />;
}
