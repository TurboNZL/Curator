import { haptic } from '../lib/haptics.ts';
import { EqualizerCard } from '../components/EqualizerCard.tsx';
import { guessDeviceName } from '../lib/connect.ts';
import { desktop } from '../lib/settings.ts';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { nativeUpdates } from '../lib/native.ts';
import { RefreshCw } from 'lucide-react';
import { Api, type ServerStatus } from '../lib/api.ts';
import { api, useStore } from '../lib/store.ts';
import { cn, fmtBytes } from '../lib/cn.ts';
import { cacheBytes, removeAudio } from '../lib/files.ts';
import { DefaultImages, PlaybackRules, Vocabulary } from '../components/SettingsExtras.tsx';
import { AppearanceLayout, WallpaperCard } from '../components/AppearanceCard.tsx';
import { Section } from '../components/Section.tsx';
import { SpotifyCard } from '../components/SpotifyCard.tsx';
import { BackupCard } from '../components/BackupCard.tsx';
import { ServerUpdateCard } from '../components/ServerUpdate.tsx';
import { AppUpdatesCard, DiscordCard, GraphicsLine } from '../components/AppSettings.tsx';


export function SettingsPage() {
  const { settings, updateSettings, sync, syncNow } = useStore();
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

  const limitBytes = settings.storageLimitMb * 1024 * 1024;
  const audioCache = useStore((s) => s.audioCache);
  const audioBytes = cacheBytes(audioCache);
  const [params, setParams] = useSearchParams();
  const tabs = [{ id: 'look', label: 'Appearance' }, { id: 'library', label: 'Library & server' }, { id: 'playback', label: 'Playback & storage' }, ...(desktop() || nativeUpdates() ? [{ id: 'app', label: 'This app' }] : [])];
  const tab = tabs.some((t) => t.id === params.get('tab')) ? params.get('tab')! : 'look';

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div role="tablist" aria-label="Settings sections" className="flex gap-1 overflow-x-auto border-b border-line pb-px">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} data-selected={tab === t.id || undefined} onClick={() => setParams({ tab: t.id }, { replace: true })}
            className={cn('-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors', tab === t.id ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg')}>{t.label}</button>))}
      </div>

      {tab === 'look' && <>
      <AppearanceLayout />

      <Section title="Wallpaper"><WallpaperCard /></Section>
      </>}

      {tab === 'library' && <>
      <Section title="Server">
        <p className="text-sm text-muted">Optional. Everything works offline; with a server this device syncs your library, votes and audio. Leave the URL empty if this app is served by the server itself.</p>
        <label className="block space-y-1 text-sm">URL<input className="input" placeholder="http://raspberrypi.local:47813" value={url} onChange={(e) => setUrl(e.target.value)} /></label>
        <label className="block space-y-1 text-sm">Token<input className="input font-mono" type="password" placeholder="contents of <data dir>/token" value={token} onChange={(e) => setToken(e.target.value)} /></label>
        <div className="flex flex-wrap items-center gap-2"><button className="btn" onClick={test}>Test connection</button><button className="btn btn-accent" onClick={save}>Save &amp; sync</button>
          <button className="btn btn-ghost" onClick={() => void syncNow()} disabled={sync.state === 'syncing'}><RefreshCw size={15} className={cn(sync.state === 'syncing' && 'animate-spin')} />Sync now</button></div>
        {status && <div className="rounded-theme bg-raised p-3 text-sm">{typeof status === 'string' ? status : <>Connected · {status.files.count} files ({fmtBytes(status.files.bytes)}) · cursor {status.cursor}
          {status.tools && <div className={status.tools.ytdlp && status.tools.ffmpeg ? 'text-good' : 'text-warn'}>yt-dlp: {status.tools.ytdlp ?? 'NOT FOUND'} · ffmpeg: {status.tools.ffmpeg ?? 'NOT FOUND'} · cookies: {status.tools.cookies ? 'set' : 'not set'}{!(status.tools.ytdlp && status.tools.ffmpeg) && ' — YouTube import and downloads will not work until both are installed on the server.'}</div>}</>}</div>}
        <div className="text-xs text-muted">Status: {sync.state}{sync.error && ` — ${sync.error}`} · {sync.pending} changes waiting · last sync {sync.lastSync ? new Date(sync.lastSync).toLocaleTimeString() : 'never'}</div>
      </Section>

      <ServerUpdateCard />

      <SpotifyCard />

      <Section title="Backup: export and import"><BackupCard /></Section>

      <Section title="Genres and roles"><Vocabulary /></Section>

      <Section title="Default images"><p className="text-sm text-muted">Shown for albums and artists that have no image of their own. Synced with your library.</p><DefaultImages /></Section>
      </>}

      {tab === 'app' && <>
      {desktop() && <Section title="Desktop app">
        <p className="text-sm text-muted">This app runs its own server and keeps your library in a folder. Put it on a big drive: audio you keep offline lives there too. To use your home server instead, fill in its address and token under Server.</p>
        <div className="flex flex-wrap items-center gap-2 text-sm"><code className="rounded-theme bg-raised px-2 py-1">{desktop()!.dataDir}</code>
          <button className="btn" onClick={() => void desktop()!.showLibraryFolder()}>Show folder</button>
          <button className="btn" onClick={() => void desktop()!.chooseLibraryFolder()}>Change folder…</button></div>
        {desktop()!.setCustomFrame && <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 shrink-0" checked={!!desktop()!.customFrame} onChange={(e) => void desktop()!.setCustomFrame!(e.target.checked)} /><span>Window decorations from the theme <span className="text-muted">(draws the title bar, minimise, maximise and close in the current UI style instead of the system's. Off by default; restarts the app.)</span></span></label>}
        <GraphicsLine />
        <p className="text-xs text-muted">Version {desktop()!.version}. Changing the folder restarts the app and starts with an empty library there, unless you copy the old folder's contents over first.</p>
      </Section>}
      <DiscordCard />
      <AppUpdatesCard />
      </>}

      {tab === 'playback' && <>
      <Section title="This device (Play on a device)">
        <p className="text-sm text-muted">Every device that uses your server appears in the player's device list, so you can play on another device or use this one as its remote. This is the name it shows.</p>
        <label className="block space-y-1 text-sm">Device name<input className="input" placeholder={guessDeviceName()} value={settings.deviceName} onChange={(e) => updateSettings({ deviceName: e.target.value })} /></label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 shrink-0" checked={settings.haptics} onChange={(e) => { updateSettings({ haptics: e.target.checked }); if (e.target.checked) haptic('confirm'); }} /><span>Haptic feedback <span className="text-muted">(a small vibration on presses, sliders and votes; phones only, and the Android app follows the system touch-feedback setting)</span></span></label>
      </Section>
      <Section title="Sound (equalizer)"><EqualizerCard /></Section>

      <Section title="Playback rules"><PlaybackRules /></Section>

      <Section title="Storage limiter">
        <p className="text-sm text-muted">Off by default: nothing is capped. Turn it on to stop offline audio on this device from growing past a size you choose (any app, browser, desktop or phone). With “Make room automatically” the tracks played longest ago are removed instead of stopping.</p>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={settings.storageLimitOn} onChange={(e) => updateSettings({ storageLimitOn: e.target.checked })} />Limit offline audio on this device</label>
        <div className="h-2 overflow-hidden rounded-full bg-raised"><div className="h-full bg-accent" style={{ width: settings.storageLimitOn ? `${Math.min(100, (audioBytes / limitBytes) * 100)}%` : '0%' }} /></div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>{fmtBytes(audioBytes)} of offline audio ({Object.keys(audioCache).length} files){settings.storageLimitOn ? ` · limit ${settings.storageLimitMb} MB` : ' · no limit'}{usage ? ` · this device allows ${fmtBytes(usage.quota)}` : ''}</span>
          <span className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">Limit MB<input className="input !w-24" type="number" min={100} step={100} disabled={!settings.storageLimitOn} value={settings.storageLimitMb} onChange={(e) => updateSettings({ storageLimitMb: Number(e.target.value) || 2048 })} /></label>
            <label className="flex items-center gap-1.5" title="When full, remove the offline tracks you played longest ago to make room"><input type="checkbox" disabled={!settings.storageLimitOn} checked={settings.evictOldest} onChange={(e) => updateSettings({ evictOldest: e.target.checked })} />Make room automatically</label>
            <button className="btn" disabled={!audioBytes} onClick={() => void removeAudio(Object.keys(audioCache))}>Clear offline audio</button></span></div>
      </Section>
      </>}
    </div>
  );
}
