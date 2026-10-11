import { Disc3, FileAudio, Link2, Music2, ShieldCheck, Tags } from 'lucide-react';
import type { Library } from '../lib/derive.ts';
import { cn } from '../lib/cn.ts';
import { hasLead } from '../lib/defaults.ts';

/** The library's completeness as one ring plus a tile per thing that is worth filling in. */
export function healthMetrics(lib: Library) {
  const ratio = (n: number, d: number) => (d ? n / d : 1);
  return [
    { id: 'audio', label: 'Audio', icon: FileAudio, value: ratio(lib.tracks.filter((t) => t.file).length, lib.tracks.length), of: `${lib.tracks.filter((t) => t.file).length}/${lib.tracks.length} tracks` },
    { id: 'covers', label: 'Covers', icon: Disc3, value: ratio(lib.albums.filter((a) => a.cover).length, lib.albums.length), of: `${lib.albums.filter((a) => a.cover).length}/${lib.albums.length} albums` },
    { id: 'links', label: 'YouTube links', icon: Link2, value: ratio(lib.tracks.filter((t) => t.youtubeMusicUrl).length, lib.tracks.length), of: `${lib.tracks.filter((t) => t.youtubeMusicUrl).length}/${lib.tracks.length} tracks` },
    { id: 'credits', label: 'Credits', icon: Music2, value: ratio(lib.tracks.filter((t) => hasLead(t.credits ?? [])).length, lib.tracks.length), of: `${lib.tracks.filter((t) => hasLead(t.credits ?? [])).length}/${lib.tracks.length} tracks` },
    { id: 'genres', label: 'Genres', icon: Tags, value: ratio(lib.albums.filter((a) => a.genres.length).length, lib.albums.length), of: `${lib.albums.filter((a) => a.genres.length).length}/${lib.albums.length} albums` },
  ];
}

export const healthScore = (lib: Library) => { const m = healthMetrics(lib); return m.reduce((n, x) => n + x.value, 0) / m.length; };

const tone = (v: number) => (v >= 0.9 ? 'text-good' : v >= 0.6 ? 'text-warn' : 'text-bad');
const toneBg = (v: number) => (v >= 0.9 ? 'bg-good' : v >= 0.6 ? 'bg-warn' : 'bg-bad');

export function HealthHero({ lib, problems, total }: { lib: Library; problems: number; total: number }) {
  const metrics = healthMetrics(lib), score = healthScore(lib);
  const R = 52, C = 2 * Math.PI * R;
  return (
    <section className="card relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/15 blur-3xl" aria-hidden />
      <div className="relative flex flex-wrap items-center gap-6">
        <div className="relative h-36 w-36 shrink-0" role="img" aria-label={`Library health ${Math.round(score * 100)} percent`}>
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r={R} fill="none" strokeWidth="10" className="stroke-raised" />
            <circle cx="60" cy="60" r={R} fill="none" strokeWidth="10" strokeLinecap="round" className={cn('transition-[stroke-dashoffset] duration-700', tone(score), 'stroke-current')} strokeDasharray={C} strokeDashoffset={C * (1 - score)} />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center"><div><div className={cn('text-3xl font-bold tabular-nums', tone(score))}>{Math.round(score * 100)}</div><div className="text-[11px] uppercase tracking-wider text-muted">health</div></div></div>
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold"><ShieldCheck size={22} className="text-accent" />Library health</h1>
          <p className="text-sm text-muted">{problems ? `${problems} of ${total} checks need a look.` : 'Everything checks out.'} Click an item below to fix it.</p>
          <div className="grid gap-x-6 gap-y-2.5 pt-2 sm:grid-cols-2">
            {metrics.map((m) => (
              <div key={m.id} className="min-w-0">
                <div className="flex items-center justify-between gap-2 text-xs"><span className="flex items-center gap-1.5 font-medium"><m.icon size={13} className="text-muted" />{m.label}</span><span className="tabular-nums text-muted">{m.of}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-raised"><div className={cn('h-full rounded-full transition-[width] duration-700', toneBg(m.value))} style={{ width: `${m.value * 100}%` }} /></div>
              </div>))}
          </div>
        </div>
      </div>
    </section>
  );
}
