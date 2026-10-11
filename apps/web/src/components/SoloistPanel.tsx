import { useEffect, useRef, useState } from 'react';
import { Download, Loader2, Play, Square, Trash2 } from 'lucide-react';
import type { SoloistInfo } from '../lib/api.ts';
import { api, useStore } from '../lib/store.ts';
import { Field } from './forms.tsx';

const STATE: Record<SoloistInfo['state'], string> = { stopped: 'Stopped', starting: 'Starting…', running: 'Running', expired: 'Updating (the build expired)…', installing: 'Installing…', error: 'Problem' };

/**
 * Spotify Soloist, installed and run by the server: Spotify's own headless Connect client. Once it runs, a device with the name chosen here
 * appears in the player's device list (the cast button) and Curator plays Spotify tracks on it, with no phone or PC app open. Three steps:
 * install (downloaded from Spotify, not from Curator), the API key and a name, start.
 */
export function SoloistPanel() {
  const configured = useStore((s) => !!s.settings.token);
  const updateSettings = useStore((s) => s.updateSettings);
  const chosen = useStore((s) => s.settings.spotifyDeviceId);
  const [info, setInfo] = useState<SoloistInfo | null>(null);
  const [name, setName] = useState('Curator');
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const load = async () => { const i = await api().soloist(); setInfo(i); setName((n) => (n === 'Curator' || !n ? i.deviceName : n)); return i; };
  const poll = () => { timer.current = window.setTimeout(async () => { try { const i = await load(); if (['starting', 'installing', 'expired'].includes(i.state)) poll(); } catch { /* try again on the next action */ } }, 2000); };
  useEffect(() => { if (configured) void load().then((i) => { if (['starting', 'installing', 'expired'].includes(i.state)) poll(); }, (e: Error) => setError(e.message.includes('404') ? 'This server is older than the Soloist module: update it first (Settings › Update server).' : e.message)); return () => { if (timer.current) clearTimeout(timer.current); }; }, [configured]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (what: string, f: () => Promise<SoloistInfo>) => {
    setBusy(what); setError(null);
    try { setInfo(await f()); poll(); } catch (e) { setError((e as Error).message === 'Failed to fetch' ? 'Cannot reach the server.' : (e as Error).message); } finally { setBusy(null); }
  };
  // when it is running and nothing is chosen yet, pick it as this device's Spotify output as soon as Spotify lists it
  useEffect(() => {
    if (!info || info.state !== 'running' || chosen) return;
    let alive = true;
    const find = () => api().spotifyDevices().then((r) => { const d = r.devices.find((x) => x.name === info.deviceName); if (alive && d) updateSettings({ spotifyDeviceId: d.id, spotifyDeviceName: d.name }); else if (alive) setTimeout(find, 5000); }, () => undefined);
    const t = setTimeout(find, 3000);
    return () => { alive = false; clearTimeout(t); };
  }, [info?.state, info?.deviceName, chosen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!configured) return null;
  if (!info) return error ? <div className="rounded-theme bg-bad/15 p-3 text-sm text-bad">{error}</div> : null;
  if (!info.supported) return (
    <div className="space-y-1 border-t border-line pt-4 text-sm"><div className="font-medium">Soloist</div><p className="text-muted">{info.reason} On other machines, use the Spotify app on a phone or computer: it appears in the device list (cast button) too.</p></div>);

  const working = !!busy || ['installing', 'expired'].includes(info.state);
  return (
    <div className="space-y-3 border-t border-line pt-4 text-sm">
      <div className="flex flex-wrap items-center gap-2"><div className="font-medium">Soloist: play Spotify inside Curator</div>
        <span className={info.state === 'running' ? 'chip !text-good' : info.state === 'error' ? 'chip !text-bad' : 'chip'}>{STATE[info.state]}</span>{info.version && <span className="text-xs text-muted">{info.version}</span>}</div>
      <p className="text-muted">Installs Spotify’s own headless Spotify Connect player on the machine that runs your server (a Raspberry Pi works well). It then shows up in the device list as “{info.deviceName}”, and Curator plays Spotify tracks on it: no other Spotify app has to be open. It needs Spotify Premium and PipeWire or PulseAudio audio on that machine. Soloist is Spotify’s software, downloaded from Spotify’s server, under Spotify’s terms; builds expire after 90 days and Curator replaces them by itself.</p>

      <ol className="space-y-3">
        <li className="space-y-1.5"><div className="font-medium">1. Install</div>
          <button className="btn" disabled={working} onClick={() => void act('Installing…', () => api().soloistInstall())}>{busy === 'Installing…' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}{info.installed ? 'Update Soloist' : 'Download and install Soloist'}</button></li>
        <li className="space-y-1.5"><div className="font-medium">2. API key and name</div>
          <p className="text-xs text-muted">Make the key on <a className="text-accent underline" href={info.downloadsUrl.replace('/reference/downloads-and-updates', '')} target="_blank" rel="noreferrer">Spotify for Developers › Soloist</a> (a Premium account). It is kept on your server only and never shown again.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Device name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Curator" /></Field>
            <Field label={info.hasKey ? 'API key (saved; type to replace)' : 'API key'}><input className="input font-mono" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder={info.hasKey ? '••••••••' : 'paste the key'} /></Field></div>
          <button className="btn" disabled={working || (!key.trim() && name.trim() === info.deviceName)} onClick={() => void act('Saving…', async () => { const i = await api().soloistConfig({ deviceName: name.trim(), apiKey: key.trim() || undefined }); setKey(''); return i; })}>Save</button></li>
        <li className="space-y-1.5"><div className="font-medium">3. Run</div>
          <div className="flex flex-wrap items-center gap-2">
            {info.running ? <button className="btn" disabled={working} onClick={() => void act('Stopping…', () => api().soloistStop())}><Square size={14} />Stop</button>
              : <button className="btn btn-accent" disabled={working || !info.installed || !info.hasKey} onClick={() => void act('Starting…', () => api().soloistStart())}><Play size={14} />Start</button>}
            <label className="flex items-center gap-1.5 text-muted"><input type="checkbox" checked={info.autoStart} onChange={(e) => void act('Saving…', () => api().soloistConfig({ autoStart: e.target.checked }))} />Start with the server</label>
            {info.installed && <button className="btn btn-ghost text-bad" disabled={working} onClick={() => confirm('Remove Soloist and its saved key from the server?') && void act('Removing…', () => api().soloistRemove())}><Trash2 size={14} />Remove</button>}
          </div></li>
      </ol>
      {busy && <div className="text-muted" role="status">{busy}</div>}
      {info.message && info.state !== 'running' && <div className={info.state === 'error' ? 'rounded-theme bg-bad/15 p-3 text-bad' : 'text-muted'}>{info.message}</div>}
      {info.state === 'running' && <p className="text-good">Running. Open the cast button in the player: “{info.deviceName}” is under Spotify devices.</p>}
      {info.log.length > 0 && info.state !== 'stopped' && <details className="text-xs text-muted"><summary className="cursor-pointer">Soloist’s own messages</summary><pre className="mt-1 max-h-40 overflow-auto rounded-theme bg-raised p-2">{info.log.join('\n')}</pre></details>}
      {error && <div className="rounded-theme bg-bad/15 p-3 text-bad">{error}</div>}
    </div>
  );
}
