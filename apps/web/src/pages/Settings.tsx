import { useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Api, type ServerStatus } from '../lib/api.ts';
import { useLibrary } from '../lib/derive.ts';
import { api, useStore } from '../lib/store.ts';
import { cn, fmtBytes } from '../lib/cn.ts';
import { cacheBytes, removeAudio } from '../lib/files.ts';
import { DefaultImages, PlaybackRules, Vocabulary } from '../components/SettingsExtras.tsx';
import { AppearanceCard, WallpaperCard } from '../components/AppearanceCard.tsx';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card bt-panel space-y-4 p-5"><h2 className="bt-panel-title font-semibold">{title}</h2>{children}</section>;
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
    <div className="mx-auto max-w-4xl space-y-5">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Section title="Appearance"><p className="text-sm text-muted">Pick a colour theme and a UI style; any combination works. Saved on this device.</p><AppearanceCard /></Section>

      <Section title="Wallpaper"><WallpaperCard /></Section>

      <Section title="Server">
        <p className="text-sm text-muted">Optional. Everything works offline; with a server this device syncs your library, votes and audio. Leave the URL empty if this app is served by the server itself.</p>
        <label className="block space-y-1 text-sm">URL<input className="input" placeholder="http://raspberrypi.local:47813" value={url} onChange={(e) => setUrl(e.target.value)} /></label>
        <label className="block space-y-1 text-sm">Token<input className="input font-mono" type="password" placeholder="contents of <data dir>/token" value={token} onChange={(e) => setToken(e.target.value)} /></label>
        <div className="flex flex-wrap items-center gap-2"><button className="btn" onClick={test}>Test connection</button><button className="btn btn-accent" onClick={save}>Save &amp; sync</button>
          <button className="btn btn-ghost" onClick={() => void syncNow()} disabled={sync.state === 'syncing'}><RefreshCw size={15} className={cn(sync.state === 'syncing' && 'animate-spin')} />Sync now</button></div>
        {status && <div className="rounded-theme bg-raised p-3 text-sm">{typeof status === 'string' ? status : <>Connected · {status.files.count} files ({fmtBytes(status.files.bytes)}) · cursor {status.cursor}
          {status.tools && <div className={status.tools.ytdlp && status.tools.ffmpeg ? 'text-good' : 'text-warn'}>yt-dlp: {status.tools.ytdlp ?? 'NOT FOUND'} · ffmpeg: {status.tools.ffmpeg ?? 'NOT FOUND'}{!(status.tools.ytdlp && status.tools.ffmpeg) && ' — YouTube import and downloads will not work until both are installed on the server.'}</div>}</>}</div>}
        <div className="text-xs text-muted">Status: {sync.state}{sync.error && ` — ${sync.error}`} · {sync.pending} changes waiting · last sync {sync.lastSync ? new Date(sync.lastSync).toLocaleTimeString() : 'never'}</div>
      </Section>

      <Section title="Audio">
        <p className="text-sm text-muted">{lib.tracks.filter((t) => t.file).length} of {lib.tracks.length} tracks have audio on the server. {missing} have a YouTube source and no file.</p>
        <div className="flex flex-wrap items-center gap-2"><button className="btn btn-accent" onClick={acquire} disabled={!settings.token}><Download size={15} />Download missing audio</button><button className="btn" onClick={acquireStatus} disabled={!settings.token}>Progress</button></div>
        {acq && <div className="text-sm text-muted">{acq}</div>}
        <p className="text-xs text-muted">Downloads run on the server and need yt-dlp and ffmpeg installed there.</p>
      </Section>

      <Section title="Playback rules"><PlaybackRules /></Section>

      <Section title="Genres and roles"><Vocabulary /></Section>

      <Section title="Default images"><p className="text-sm text-muted">Shown for albums and artists that have no image of their own. Synced with your library.</p><DefaultImages /></Section>

      <Section title="This device's storage">
        <p className="text-sm text-muted">Browsers can only hold a limited amount, so offline audio stops at the limit you set (or, with “Make room automatically”, replaces the tracks played longest ago). The desktop and Android apps keep full offline copies; here, use “Keep offline” on albums and playlists.</p>
        <div className="h-2 overflow-hidden rounded-full bg-raised"><div className="h-full bg-accent" style={{ width: `${Math.min(100, (audioBytes / limitBytes) * 100)}%` }} /></div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>{fmtBytes(audioBytes)} of offline audio ({Object.keys(audioCache).length} files) · limit {settings.storageLimitMb} MB{usage ? ` · browser allows ${fmtBytes(usage.quota)}` : ''}</span>
          <span className="flex items-center gap-3">
            <label className="flex items-center gap-2">Limit MB<input className="input !w-24" type="number" min={100} step={100} value={settings.storageLimitMb} onChange={(e) => updateSettings({ storageLimitMb: Number(e.target.value) || 2048 })} /></label>
            <label className="flex items-center gap-1.5" title="When full, remove the offline tracks you played longest ago to make room"><input type="checkbox" checked={settings.evictOldest} onChange={(e) => updateSettings({ evictOldest: e.target.checked })} />Make room automatically</label>
            <button className="btn" disabled={!audioBytes} onClick={() => void removeAudio(Object.keys(audioCache))}>Clear offline audio</button></span></div>
      </Section>
    </div>
  );
}
