import { useLibrary, type Library } from '../lib/derive.ts';
import { useFileUrl } from '../lib/files.ts';
import { coverPlan, playlistCovers } from '../lib/playlists.ts';
import { Cover } from './Cover.tsx';
import { cn } from '../lib/cn.ts';

function Tile({ hash }: { hash: string }) {
  const url = useFileUrl(hash);
  return url ? <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-raised" />;
}

/**
 * A playlist's picture: the one it was given, else the covers of its first four items as a 2x2 mosaic (Spotify's way),
 * else the first cover, else a generated gradient.
 */
export function PlaylistCover({ playlist, className }: { playlist: Library['playlists'][number]; className?: string }) {
  const lib = useLibrary();
  const plan = coverPlan(playlist.cover, playlistCovers(lib, playlist));
  if (plan.mode === 'mosaic') {
    return (
      <div data-kind="playlist" className={cn('bt-cover relative aspect-square overflow-hidden rounded-theme bg-raised', className)}>
        <div className="grid h-full w-full grid-cols-2 grid-rows-2">{plan.hashes.map((h) => <div key={h} className="min-h-0 min-w-0 overflow-hidden"><Tile hash={h} /></div>)}</div>
      </div>);
  }
  if (plan.mode === 'none') {
    return <Cover hash={null} seed={playlist.name} className={className} />;
  }
  return <Cover hash={plan.hash} seed={playlist.name} className={className} />;
}
