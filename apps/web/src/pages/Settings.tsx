import { useEffect, useState } from 'react';
import { Check, Download, RefreshCw } from 'lucide-react';
import { Api, type ServerStatus } from '../lib/api.ts';
import { useLibrary } from '../lib/derive.ts';
import { ACCENTS, THEMES } from '../lib/theme.ts';
import { api, useStore } from '../lib/store.ts';
import { cn, fmtBytes } from '../lib/cn.ts';
import { cacheBytes, removeAudio } from '../lib/files.ts';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card space-y-4 p-5"><h2 className="font-semibold">{title}</h2>{children}</section>;
}

export function SettingsPage() {
  const { settings, updateSettings, sync, syncNow } = useStore();
  const lib = useLibrary();
  const [url, setUrl] = useState(settings.serverUrl);
  const [token, setToken] = useState(settings.token);
  const [status, setStatus] = useState<ServerStatus | string | null>(null);
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [acq, setAcq] = useState<string | null>(null);

  useEffect(() => { void navigator.storage?.estimate?.().then((e) => setUsage({ usage: e.usage ?? 0, quota: e.quota ?? 0 })); }, []);

  async function test() {
    setStatus('Checking…');
    const a = new Api({ serverUrl: url, token });
    try { await a.health(); setStatus(await a.status()); }
    catch (e) { setStatus((e as Error).message === 'Wrong token' ? 'Server found, but the token is wrong.' : 'Cannot reach the server.'); }
  }
  const save = () => { updateSettings({ serverUrl: url.trim(), token: token.trim() }); };

  const missing = lib.tracks.filter((t) => !t.file && t.youtubeMusicUrl).length;
  async function acquire() {
    try { const r = await api().acquire(); setAcq(`Queued ${r.queued} tracks.`); }
    catch { setAcq('Could not reach the server.'); }
  }
  async function acquireStatus() {
    try { const r = await api().acquireStatus(); setAcq(`${r.queued} queued · ${r.running} running · ${r.done} done · ${r.failed} failed${r.failures[0] ? ` (last error: ${r.failures[0].error})` : ''}`); }
    catch { setAcq('Could not reach the server.'); }
  }
  const limitBytes = settings.storageLimitMb * 1024 * 1024;
  const audioCache = useStore((s) => s.audioCache);
  const audioBytes = cacheBytes(audioCache);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Section title="Appearance">
        <div className="grid gap-3 sm:grid-cols-3">{THEMES.map((t) => (
          <button key={t.id} onClick={() => updateSettings({ theme: t.id })} className={cn('rounded-theme border p-3 text-left', settings.theme === t.id ? 'border-accent bg-accent/10' : 'border-line hover:bg-raised')}>
            <div className="flex items-center justify-between text-sm font-medium">{t.name}{settings.theme === t.id && <Check size={14} />}</div><div className="text-xs text-muted">{t.note}</div></button>))}</div>
        <div className="flex items-center gap-2"><span className="mr-2 text-sm text-muted">Accent</span>
          <button className={cn('h-6 w-6 rounded-full border border-line bg-raised text-[10px]', !settings.accent && 'ring-2 ring-fg')} title="Theme default" onClick={() => updateSettings({ accent: null })}>·</button>
          {ACCENTS.map((c) => <button key={c} aria-label={c} onClick={() => updateSettings({ accent: c })} className={cn('h-6 w-6 rounded-full', settings.accent === c && 'ring-2 ring-fg ring-offset-2 ring-offset-bg')} style={{ background: c }} />)}</div>
      </Section>

      <Section title="Server">
        <p className="text-sm text-muted">Optional. Everything works offline; with a server this device syncs your library, votes and audio. Leave the URL empty if this app is served by the server itself.</p>
        <label className="block space-y-1 text-sm">URL<input className="input" placeholder="http://raspberrypi.local:47813" value={url} onChange={(e) => setUrl(e.target.value)} /></label>
        <label className="block space-y-1 text-sm">Token<input className="input font-mono" type="password" placeholder="contents of <data dir>/token" value={token} onChange={(e) => setToken(e.target.value)} /></label>
        <div className="flex flex-wrap items-center gap-2"><button className="btn" onClick={test}>Test connection</button><button className="btn btn-accent" onClick={save}>Save &amp; sync</button>
          <button className="btn btn-ghost" onClick={() => void syncNow()} disabled={sync.state === 'syncing'}><RefreshCw size={15} className={cn(sync.state === 'syncing' && 'animate-spin')} />Sync now</button></div>
        {status && <div className="rounded-theme bg-raised p-3 text-sm">{typeof status === 'string' ? status : <>Connected · {status.files.count} files ({fmtBytes(status.files.bytes)}) · cursor {status.cursor}</>}</div>}
        <div className="text-xs text-muted">Status: {sync.state}{sync.error && ` — ${sync.error}`} · {sync.pending} changes waiting · last sync {sync.lastSync ? new Date(sync.lastSync).toLocaleTimeString() : 'never'}</div>
      </Section>

      <Section title="Audio">
        <p className="text-sm text-muted">{lib.tracks.filter((t) => t.file).length} of {lib.tracks.length} tracks have audio on the server. {missing} have a YouTube source and no file.</p>
        <div className="flex flex-wrap items-center gap-2"><button className="btn btn-accent" onClick={acquire} disabled={!settings.token}><Download size={15} />Download missing audio</button><button className="btn" onClick={acquireStatus} disabled={!settings.token}>Progress</button></div>
        {acq && <div className="text-sm text-muted">{acq}</div>}
        <p className="text-xs text-muted">Downloads run on the server and need yt-dlp and ffmpeg installed there.</p>
      </Section>

      <Section title="This device's storage">
        <p className="text-sm text-muted">Browsers can only hold a limited amount, so offline audio stops at the limit you set. The desktop and Android apps keep full offline copies; here, use “Keep offline” on albums and playlists.</p>
        <div className="h-2 overflow-hidden rounded-full bg-raised"><div className="h-full bg-accent" style={{ width: `${Math.min(100, (audioBytes / limitBytes) * 100)}%` }} /></div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>{fmtBytes(audioBytes)} of offline audio ({Object.keys(audioCache).length} files) · limit {settings.storageLimitMb} MB{usage ? ` · browser allows ${fmtBytes(usage.quota)}` : ''}</span>
          <span className="flex items-center gap-3">
            <label className="flex items-center gap-2">Limit MB<input className="input !w-24" type="number" min={100} step={100} value={settings.storageLimitMb} onChange={(e) => updateSettings({ storageLimitMb: Number(e.target.value) || 2048 })} /></label>
            <button className="btn" disabled={!audioBytes} onClick={() => void removeAudio(Object.keys(audioCache))}>Clear offline audio</button></span></div>
      </Section>
    </div>
  );
}
