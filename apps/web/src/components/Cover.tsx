import { Disc3, User } from 'lucide-react';
import { api } from '../lib/store.ts';
import { cn } from '../lib/cn.ts';

/** Deterministic gradient so cover-less items still look distinct and stable. */
function gradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `linear-gradient(135deg, hsl(${h % 360} 45% 38%), hsl(${(h * 7) % 360} 50% 22%))`;
}

export function Cover({ hash, seed, kind = 'album', className }: { hash: string | null | undefined; seed: string; kind?: 'album' | 'artist'; className?: string }) {
  const Icon = kind === 'artist' ? User : Disc3;
  return (
    <div className={cn('relative aspect-square overflow-hidden bg-raised', kind === 'artist' ? 'rounded-full' : 'rounded-theme', className)}
      style={hash ? undefined : { backgroundImage: gradient(seed) }}>
      {hash
        ? <img src={api().fileUrl(hash)} alt="" loading="lazy" className="h-full w-full object-cover" />
        : <Icon className="absolute inset-0 m-auto h-1/3 w-1/3 text-white/40" strokeWidth={1.25} />}
    </div>
  );
}
