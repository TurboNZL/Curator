import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Cover } from './Cover.tsx';

export interface EntityRow { id: string; to: string; cover: string | null | undefined; seed: string; title: string; sub?: ReactNode; meta?: ReactNode; kind?: 'artist'; menu?: (e: React.MouseEvent) => void }

/** The compact "List" view of Albums, Artists and Eras: one line per item with a small cover, the way Tracks reads. */
export function EntityList({ rows }: { rows: EntityRow[] }) {
  return (
    <div className="card divide-y divide-line/50 overflow-hidden">
      {rows.map((r) => (
        <Link key={r.id} to={r.to} className="bt-row flex items-center gap-3 px-3 py-2 hover:bg-raised/60" onContextMenu={r.menu}>
          <Cover kind={r.kind} hash={r.cover} seed={r.seed} className="h-11 w-11 shrink-0" />
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{r.title}</div>{r.sub && <div className="truncate text-xs text-muted">{r.sub}</div>}</div>
          {r.meta && <div className="shrink-0 text-right text-xs tabular-nums text-muted">{r.meta}</div>}
        </Link>))}
    </div>
  );
}
