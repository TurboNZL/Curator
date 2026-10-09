import { useState } from 'react';
import { CheckCircle2, ChevronDown, ImageDown } from 'lucide-react';
import { saveImage } from '../lib/files.ts';
import { thumbnailUrls, youtubeId } from '../lib/youtube.ts';
import { computeHealth, type HealthItem } from '../lib/health.ts';
import { useLibrary } from '../lib/derive.ts';
import { useEditor } from '../lib/editor.ts';
import { api, useStore } from '../lib/store.ts';
import { cn } from '../lib/cn.ts';
import { withLeadFallback } from '../lib/defaults.ts';
import type { Credit } from '@curator/core';

export function HealthPage() {
  const lib = useLibrary();
  const edit = useEditor((s) => s.open);
  const remove = useStore((s) => s.remove);
  const [open, setOpen] = useState<string | null>(null);
  const patch = useStore((s) => s.patch);
  const configured = useStore((s) => !!s.settings.token);
  const [covers, setCovers] = useState<{ running: boolean; done: number; total: number; failed: number } | null>(null);
  const checks = computeHealth(lib);

  /** Best effort: use the first track's YouTube thumbnail as the cover. Failures are skipped, never fatal. */
  async function fillCovers(albumIds: string[]) {
    const todo = albumIds.flatMap((id) => {
      const album = lib.albumById.get(id);
      const vid = album?.trackIds.map((t) => youtubeId(lib.trackById.get(t)?.youtubeMusicUrl)).find(Boolean);
      return vid ? [{ id, vid }] : [];
    });
    setCovers({ running: true, done: 0, total: todo.length, failed: 0 });
    let done = 0, failed = 0;
    for (const { id, vid } of todo) {
      try {
        let raw: string | null = null;
        for (const url of thumbnailUrls(vid)) { try { raw = (await api().importCover(url)).hash; break; } catch { /* try the next size */ } }
        if (!raw) throw new Error('no thumbnail');
        const blob = await (await fetch(api().fileUrl(raw))).blob();
        patch('albums', id, { cover: await saveImage(blob, { trimBars: true }) });
      } catch { failed++; }
      setCovers({ running: true, done: ++done, total: todo.length, failed });
    }
    setCovers({ running: false, done, total: todo.length, failed });
  }
  /** write a Lead artist credit onto the stored record, from its artistId */
  function addLeadCredits(items: HealthItem[]) {
    for (const i of items) {
      const table = i.kind === 'album' ? 'albums' : 'tracks';
      const d = useStore.getState().rows[table].get(i.id)?.data as { credits?: Credit[]; artistId?: string } | undefined;
      if (!d) continue;
      const credits = withLeadFallback(d.credits ?? [], d.artistId);
      if (credits !== (d.credits ?? [])) patch(table, i.id, { credits });
    }
  }
  const problems = checks.filter((c) => c.items.length);
  const openItem = (i: HealthItem) => (i.kind === 'track' || i.kind === 'album' || i.kind === 'artist' || i.kind === 'release') && edit({ kind: i.kind, id: i.id });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div><h1 className="text-2xl font-bold">Library health</h1>
        <p className="text-sm text-muted">{problems.length ? `${problems.length} of ${checks.length} checks need a look.` : 'Everything checks out.'} Click an item to fix it.</p></div>
      {checks.map((c) => (
        <section key={c.id} className="card overflow-hidden">
          <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id}>
            {c.items.length ? <span className="min-w-8 rounded-full bg-warn/20 px-2 py-0.5 text-center text-xs font-semibold tabular-nums text-warn">{c.items.length}</span> : <CheckCircle2 size={18} className="text-good" />}
            <span className="flex-1 text-sm font-medium">{c.title}</span>
            {c.items.length > 0 && <ChevronDown size={16} className={cn('text-muted transition-transform', open === c.id && 'rotate-180')} />}
          </button>
          {open === c.id && c.items.length > 0 && (
            <div className="border-t border-line">
              <p className="px-4 py-2 text-xs text-muted">{c.why}</p>
              {c.id === 'album-no-cover' && <div className="flex flex-wrap items-center gap-3 px-4 pb-2">
                <button className="btn" disabled={!configured || covers?.running} onClick={() => void fillCovers(c.items.map((i) => i.id))}><ImageDown size={15} />Try YouTube thumbnails</button>
                <span className="text-xs text-muted">{!configured ? 'Needs a server (Settings).' : covers ? `${covers.done}/${covers.total} done${covers.failed ? `, ${covers.failed} failed` : ''}${covers.running ? '…' : ''}` : 'Uses each album\'s first track link. Check the results; replace any that look wrong.'}</span></div>}
              {c.addLead && <div className="px-4 pb-2"><button className="btn" onClick={() => confirm(`${c.addLead!.label} (${c.items.length})?`) && addLeadCredits(c.items)}>{c.addLead.label}</button></div>}
              {c.fix && <div className="px-4 pb-2"><button className="btn text-bad" onClick={() => confirm(`${c.fix!.label} (${c.items.length})?`) && c.items.forEach((i) => remove(c.fix!.table, i.id))}>{c.fix.label}</button></div>}
              <div className="max-h-80 divide-y divide-line/60 overflow-y-auto">{c.items.slice(0, 200).map((i) => (
                <button key={`${i.kind}${i.id}`} disabled={!['track', 'album', 'artist', 'release'].includes(i.kind)} className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-raised/60 disabled:cursor-default disabled:hover:bg-transparent" onClick={() => openItem(i)}>
                  <span className="truncate">{i.label}</span>{i.detail && <span className="shrink-0 text-xs text-muted">{i.detail}</span>}</button>))}
                {c.items.length > 200 && <div className="px-4 py-2 text-xs text-muted">…and {c.items.length - 200} more</div>}</div>
            </div>)}
        </section>))}
    </div>
  );
}
