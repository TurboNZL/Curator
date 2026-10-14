import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, HardDrive, KeyRound, Smartphone } from 'lucide-react';
import { decodePairCode, encodePairCode, pairLink } from '../lib/pairCode.ts';
import { isAndroidApp } from '../lib/native.ts';
import { desktop } from '../lib/settings.ts';
import { api, useStore } from '../lib/store.ts';
import type { ServerHealth, StorageInfo } from '../lib/api.ts';
import { cn, fmtBytes } from '../lib/cn.ts';
import { Section } from './Section.tsx';

const dur = (s: number) => { const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return d ? `${d} d ${h} h` : h ? `${h} h ${m} min` : `${m} min`; };

function Meter({ label, value, of, text, bad }: { label: string; value: number; of: number; text: string; bad?: boolean }) {
  const pct = of ? Math.min(100, (value / of) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-2 text-xs"><span className="min-w-0 truncate">{label}</span><span className="shrink-0 tabular-nums text-muted">{text}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-raised" role="meter" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}><div className={cn('h-full', bad ? 'bg-bad' : 'bg-accent')} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

/**
 * Settings: how the machine running the server is doing (disk space, heat, power, memory, how fast the disk answers). The server answers
 * with a few file reads, so this asks every 10 seconds while the page is open and stops the moment it is not.
 */
export function ServerHealthCard() {
  const configured = useStore((s) => !!s.settings.token || !s.settings.serverUrl);
  const [h, setH] = useState<ServerHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!configured) return;
    let alive = true, t: number | undefined;
    const tick = async () => {
      if (document.visibilityState === 'visible') {
        try { const r = await api().serverHealth(); if (alive) { setH(r); setError(null); } }
        catch (e) { if (alive) setError((e as Error).message.includes('404') ? 'This server is older than the health monitor: update it first.' : 'Cannot reach the server.'); }
      }
      if (alive) t = window.setTimeout(() => void tick(), 10_000);
    };
    void tick();
    return () => { alive = false; if (t) clearTimeout(t); };
  }, [configured]);
  if (!configured) return null;

  const s = h?.snapshot;
  const bad = h?.warnings.some((w) => w.level === 'bad');
  return (
    <Section title="Server health">
      <p className="text-sm text-muted">How the machine running your server is doing. Reading it costs the server a few file reads, so it refreshes every 10 seconds while this page is open.</p>
      {error && <div className="rounded-theme bg-warn/15 p-3 text-sm text-warn">{error}</div>}
      {!s && !error && <div className="text-sm text-muted">Reading…</div>}
      {s && h && <>
        <div className={cn('flex items-start gap-2 rounded-theme p-3 text-sm', h.warnings.length ? (bad ? 'bg-bad/15 text-bad' : 'bg-warn/15 text-warn') : 'bg-good/15 text-good')} role="status">
          {h.warnings.length ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
          <div className="min-w-0 space-y-1">{h.warnings.length ? h.warnings.map((w) => <div key={w.id}>{w.message}</div>) : <div>Everything looks fine.</div>}</div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {s.disks.filter((d) => !(d.label === 'System' && s.disks.some((x) => x.system && x.label !== 'System'))).map((d) => (
            <Meter key={d.label} label={`${d.label}${d.system ? ' · system disk' : ''}`} value={d.totalBytes - d.freeBytes} of={d.totalBytes} text={`${fmtBytes(d.freeBytes)} free of ${fmtBytes(d.totalBytes)}`} bad={d.freeBytes < 1024 ** 3 || d.freeBytes / d.totalBytes < 0.03} />))}
          <Meter label="Memory" value={s.memory.totalBytes - s.memory.availableBytes} of={s.memory.totalBytes} text={`${fmtBytes(s.memory.availableBytes)} available of ${fmtBytes(s.memory.totalBytes)}`} bad={s.memory.availableBytes / s.memory.totalBytes < 0.08} />
          <Meter label={`CPU load (${s.cpu.cores} cores)`} value={s.cpu.load5} of={s.cpu.cores} text={`${s.cpu.load1.toFixed(2)} · ${s.cpu.load5.toFixed(2)} · ${s.cpu.load15.toFixed(2)}`} bad={s.cpu.load5 > s.cpu.cores * 1.5} />
          {s.tempC != null && <Meter label="CPU temperature" value={s.tempC} of={90} text={`${s.tempC} °C`} bad={s.tempC >= 80} />}
        </div>
        <dl className="grid gap-x-6 gap-y-1 text-xs text-muted sm:grid-cols-2">
          <div className="flex justify-between gap-2"><dt>Machine</dt><dd className="truncate text-fg">{s.host} · {s.platform} {s.arch}</dd></div>
          <div className="flex justify-between gap-2"><dt>Up for</dt><dd className="text-fg">{dur(s.uptimeS)} (server {dur(s.processUptimeS)})</dd></div>
          <div className="flex justify-between gap-2"><dt>Disk speed</dt><dd className="text-fg">{s.probe ? `write ${s.probe.writeMs} ms · read ${s.probe.readMs} ms` : 'not measured'}</dd></div>
          <div className="flex justify-between gap-2"><dt>Power</dt><dd className="text-fg">{s.throttle ? (s.throttle.underVoltage ? 'under-voltage now' : s.throttle.underVoltageEver ? 'dipped since boot' : 'fine') : 'not a Raspberry Pi'}</dd></div>
          <div className="flex justify-between gap-2"><dt>Database</dt><dd className="text-fg">{fmtBytes(s.db.bytes)} + {fmtBytes(s.db.walBytes)} journal</dd></div>
          <div className="flex justify-between gap-2"><dt>Server memory</dt><dd className="text-fg">{fmtBytes(s.memory.rssBytes)} · {s.node}</dd></div>
        </dl>
      </>}
      <StorageLocations />
    </Section>
  );
}

/** Move the library files, the temp folder or the yt-dlp cache to another drive, so the SD card is not written to. */
function StorageLocations() {
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [target, setTarget] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const read = () => api().storageInfo().then((i) => { setInfo(i); return i; }, () => null);
  const follow = () => { timer.current = window.setTimeout(async () => { const i = await read(); if (i?.job.status === 'running') follow(); }, 1000); };
  useEffect(() => { void read().then((i) => { if (i?.job.status === 'running') follow(); }); return () => { if (timer.current) clearTimeout(timer.current); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!info) return null;
  const running = info.job.status === 'running';
  const move = async (kind: 'files' | 'tmp' | 'cache') => {
    const to = (target[kind] ?? '').trim();
    if (!to) return;
    if (!window.confirm(`Move “${info.entries.find((e) => e.kind === kind)!.label}” to ${to}?\n\nThe server keeps running. For the library files this copies everything first and only then switches, so nothing is lost if it fails.`)) return;
    setError(null);
    try { await api().moveStorage(kind, to); setTarget((t) => ({ ...t, [kind]: '' })); await read(); follow(); } catch (e) { setError((e as Error).message); }
  };
  const p = info.job.progress;
  return (
    <div className="space-y-3 border-t border-line pt-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><HardDrive size={15} />Storage locations</h3>
      <p className="text-xs text-muted">The data folder ({info.dataDir}) holds the database and your token. These three folders inside it can live on another drive. On a Raspberry Pi keep them off the SD card: it wears out with writes.</p>
      {info.entries.map((e) => (
        <div key={e.kind} className="space-y-1.5 rounded-theme bg-raised/60 p-3 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2"><span className="font-medium">{e.label}</span><span className="text-xs text-muted">{fmtBytes(e.freeBytes)} free of {fmtBytes(e.totalBytes)}{e.system && <span className="ml-1 text-warn">· system disk</span>}</span></div>
          <div className="break-all font-mono text-xs">{e.path}{e.moved && <span className="ml-1 text-muted">(linked from {e.link})</span>}</div>
          <div className="text-xs text-muted">{e.hint}</div>
          <div className="flex flex-wrap gap-2"><input className="input min-w-0 flex-1" placeholder={`/mnt/hdd/turbomusic/${e.kind} (an empty folder; it is created)`} value={target[e.kind] ?? ''} disabled={running} onChange={(ev) => setTarget((t) => ({ ...t, [e.kind]: ev.target.value }))} />
            <button className="btn" disabled={running || !(target[e.kind] ?? '').trim()} onClick={() => void move(e.kind)}>Move here</button></div>
        </div>))}
      {running && <div className="text-sm" role="status">Moving {info.job.kind}… {p && p.totalBytes ? `${fmtBytes(p.copiedBytes)} of ${fmtBytes(p.totalBytes)} (${p.files} files)` : ''}</div>}
      {info.job.status === 'done' && <div className="text-sm text-good">{info.job.message}</div>}
      {info.job.status === 'error' && <div className="rounded-theme bg-bad/15 p-3 text-sm text-bad">{info.job.message}</div>}
      {error && <div className="rounded-theme bg-bad/15 p-3 text-sm text-bad">{error}</div>}
    </div>
  );
}

/** Copy the access token that apps use to connect to this server. */
export function ConnectionTokens() {
  const token = useStore((s) => s.settings.token);
  const [msg, setMsg] = useState<string | null>(null);
  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); setMsg(`${what} copied.`); }
    catch { setMsg('Your browser blocked copying here (it needs https or localhost). Select it by hand instead.'); }
    setTimeout(() => setMsg(null), 4000);
  };
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <button className="btn" disabled={!token} onClick={() => void copy(token, 'Access token')}><KeyRound size={15} /><Copy size={13} className="-ml-1" />Copy access token</button>
      {msg && <span className="text-muted" role="status">{msg}</span>}
    </div>
  );
}

/** Pair another device: make a code (or link) from this device's connection, or enter a code made on another device. */
export function PairDevice({ draft }: { draft?: { token: string; cfAccessId: string; cfAccessSecret: string } }) {
  const saved = useStore((s) => s.settings);
  // what is typed in the Server fields counts even before "Save & sync" is pressed
  const settings = { ...saved, token: draft?.token.trim() || saved.token, cfAccessId: draft?.cfAccessId.trim() || saved.cfAccessId, cfAccessSecret: draft?.cfAccessSecret.trim() || saved.cfAccessSecret };
  const updateSettings = useStore((s) => s.updateSettings);
  const [open, setOpen] = useState(false);
  const [addr, setAddr] = useState(settings.serverUrl || (typeof location !== 'undefined' && /^https?:/.test(location.origin) && !isAndroidApp() && !desktop() ? location.origin : ''));
  const [code, setCode] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [entered, setEntered] = useState('');
  const say = (m: string) => { setNote(m); setTimeout(() => setNote(null), 6000); };

  const hasAccess = !!(settings.cfAccessId && settings.cfAccessSecret);
  const make = () => setCode(encodePairCode({ url: addr.trim(), token: settings.token, access: hasAccess ? { id: settings.cfAccessId, secret: settings.cfAccessSecret } : undefined }));
  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); say(`${what} copied.`); } catch { say('Your browser blocked copying here (it needs https or localhost). Select it by hand instead.'); }
  };
  const use = () => {
    const p = decodePairCode(entered);
    if (!p) { say('That is not a pairing code. It starts with CUR1-.'); return; }
    if (!confirm(`Connect this device to ${p.url || 'this address'}?`)) return;
    updateSettings({ serverUrl: p.url, token: p.token, ...(p.access ? { cfAccessId: p.access.id, cfAccessSecret: p.access.secret } : {}) });
    setEntered(''); say('Connected. Syncing…');
  };

  return (
    <div className="space-y-2 text-sm">
      <button className="btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}><Smartphone size={15} />Pair a device</button>
      {open && (
        <div className="space-y-4 rounded-theme border border-line p-3">
          <div className="space-y-2">
            <div className="font-medium">Send this connection to another device</div>
            <label className="block space-y-1">Address the other device should use<input className="input" placeholder="https://music.example.com" value={addr} onChange={(e) => { setAddr(e.target.value); setCode(''); }} /></label>
            <p className="text-xs text-muted">Use the address that works from where that device will be (the tunnel address for a phone on mobile data, not a home-network one).</p>
            <p className="text-xs text-muted">The code holds: the address above, the access token{hasAccess ? ' and the Cloudflare Access service token (client ID and secret)' : ''}. {hasAccess ? '' : 'No Cloudflare Access service token is set on this device, so none is included.'}</p>
            <button className="btn btn-accent" disabled={!settings.token} onClick={make}>Make a code</button>
            {code && <div className="space-y-2">
              <textarea readOnly className="input font-mono text-xs" rows={3} value={code} onFocus={(e) => e.currentTarget.select()} />
              <div className="flex flex-wrap gap-2"><button className="btn" onClick={() => void copy(code, 'Code')}>Copy code</button>
                {addr.trim() && <button className="btn" onClick={() => void copy(pairLink(addr.trim(), code), 'Link')}>Copy link</button>}</div>
              <p className="text-xs text-warn">The code contains your access token: whoever has it can read and change your library. Send it only to yourself, and replace the token on the server if it leaks.</p>
            </div>}
          </div>
          <div className="space-y-2 border-t border-line pt-3">
            <div className="font-medium">Use a code from another device</div>
            <div className="flex gap-2"><input className="input font-mono" placeholder="CUR1-…" value={entered} onChange={(e) => setEntered(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && use()} /><button className="btn shrink-0" disabled={!entered.trim()} onClick={use}>Connect</button></div>
          </div>
        </div>)}
      {note && <div className="text-muted" role="status">{note}</div>}
    </div>
  );
}
