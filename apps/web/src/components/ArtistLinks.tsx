import { Link } from 'react-router-dom';
import type { Lead } from '../lib/library.ts';

/** Every lead artist as its own link ("A, B"), so each can be clicked on its own. */
export function ArtistLinks({ leads, className = 'hover:text-fg hover:underline' }: { leads: Lead[]; className?: string }) {
  if (!leads.length) return <>Unknown artist</>;
  return <>{leads.map((l, i) => <span key={l.id}>{i > 0 && ', '}<Link to={`/artists/${l.id}`} className={className} onClick={(e) => e.stopPropagation()}>{l.name}</Link></span>)}</>;
}
