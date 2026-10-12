export interface LrcLine { time: number; text: string }

/** Parses LRC text (`[mm:ss.xx] words`, several stamps per line allowed) into lines sorted by time (seconds). Tags like [ar:...] are ignored. */
export function parseLrc(text: string): LrcLine[] {
  const out: LrcLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    if (!stamps.length) continue;
    const words = raw.replace(/\[[^\]]*\]/g, '').trim();
    for (const m of stamps) out.push({ time: Number(m[1]) * 60 + Number(m[2]) + (m[3] ? Number(`0.${m[3]}`) : 0), text: words });
  }
  return out.sort((a, b) => a.time - b.time);
}

/** The index of the line being sung at `time` (the last one that has started), or -1 before the first. */
export function activeLine(lines: LrcLine[], time: number): number {
  let lo = 0, hi = lines.length - 1, ans = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (lines[mid].time <= time) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
  return ans;
}
