import { Info } from 'lucide-react';
import type { Track } from '../lib/derive.ts';
import { useEditor } from '../lib/editor.ts';
import { usePopups } from '../lib/popups.ts';
import { ArtistLinks } from './ArtistLinks.tsx';
import { Cover } from './Cover.tsx';
import { Popover } from './Popover.tsx';
import { Rating } from './Rating.tsx';
import { RateBlock } from './RateBlock.tsx';

/**
 * The now-playing card: the cover enlarged, grown out of the small one in the player bar (the UI style's own
 * pop-up animation). On a phone it is centred above the bar and also carries the thumbs and memories, which the
 * narrow bar has no room for.
 */
export function CoverPreview({ anchor, track }: { anchor: HTMLElement | null; track?: Track }) {
  const open = usePopups((s) => s.coverOpen);
  const close = usePopups((s) => s.closeCover);
  const edit = useEditor((s) => s.open);
  return (
    <Popover open={open && !!track} anchor={anchor} onClose={close} label="Now playing" className="w-[min(22rem,calc(100vw-1.5rem))] p-3">
      {track && <div className="flex flex-col gap-3">
        <Cover hash={track.cover} seed={track.albumTitle ?? track.title} className="mx-auto w-full max-w-[19rem]" />
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold">{track.title}</div>
            <div className="truncate text-sm text-muted"><ArtistLinks leads={track.leads} className="hover:underline" />{track.albumTitle && ` · ${track.albumTitle}`}</div>
            <div className="mt-2 flex items-center gap-2"><Rating track={track} /><button type="button" className="btn btn-ghost !p-1.5" title="Track info" aria-label="Track info" onClick={() => { close(); edit({ kind: 'track-details', id: track.id }); }}><Info size={16} /></button></div>
          </div>
          <RateBlock track={track} />
        </div>
      </div>}
    </Popover>
  );
}
