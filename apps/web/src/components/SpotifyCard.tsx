import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { SpotifyDeviceInfo } from '../lib/api.ts';
import { api, useStore } from '../lib/store.ts';
import { Section } from './Section.tsx';
import { SpotifyAccountPanel } from './SpotifyAccountPanel.tsx';

function Devices() {
  const { settings, updateSettings } = useStore();
  const [devices, setDevices] = useState<SpotifyDeviceInfo[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = () => { setErr(null); api().spotifyDevices().then((r) => setDevices(r.devices)).catch((e: Error) => setErr(e.message)); };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-3">
      <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5" checked={settings.spotifyAuto} onChange={(e) => updateSettings({ spotifyAuto: e.target.checked })} /><span>Play tracks that have no audio file through Spotify <span className="text-muted">(they need a Spotify link; Spotify plays them, so the equaliser, offline copies and the phone notification do not apply)</span></span></label>
      <div className="flex items-center gap-2"><div className="font-medium">Device on this device</div><button className="btn btn-ghost !p-1.5" aria-label="Refresh devices" onClick={load}><RefreshCw size={14} /></button></div>
      <p className="text-xs text-muted">The Spotify Connect device this app sends tracks to: Soloist on the Pi (best: always on), or Spotify open on a phone or computer. It must be awake and listed here. Each of your devices (PC, phone) remembers its own choice.</p>
      <div role="radiogroup" aria-label="Spotify device" className="space-y-1">
        {devices?.map((d) => (
          <label key={d.id} className="flex cursor-pointer items-center gap-2 rounded-theme px-2 py-1.5 hover:bg-raised">
            <input type="radio" name="spotify-device" checked={settings.spotifyDeviceId === d.id} onChange={() => updateSettings({ spotifyDeviceId: d.id, spotifyDeviceName: d.name })} />
            <span className="min-w-0 flex-1 truncate">{d.name}</span><span className="text-xs text-muted">{d.type}{d.active ? ' · active' : ''}</span></label>))}
        {devices && !devices.length && <p className="text-muted">No device is awake. Open Spotify on one, or start Soloist, then refresh.</p>}
        {settings.spotifyDeviceId && !devices?.some((d) => d.id === settings.spotifyDeviceId) && devices && <p className="text-xs text-warn">The chosen device ({settings.spotifyDeviceName || 'unknown'}) is not awake right now.</p>}
      </div>
      {settings.spotifyDeviceId && <button className="btn btn-ghost" onClick={() => updateSettings({ spotifyDeviceId: '', spotifyDeviceName: '' })}>Do not use Spotify on this device</button>}
      {err && <div className="rounded-theme bg-bad/15 p-3 text-bad">{err}</div>}
    </div>
  );
}

/** Settings: Spotify account, which Spotify device plays, and whether file-less tracks go through it. */
export function SpotifyCard() {
  return (
    <Section title="Spotify">
      <p className="text-sm text-muted">Optional. Lets you import playlists, find recommendations and play tracks you do not have as files. Needs Spotify Premium. Setup runs on your server (docs/SPOTIFY.md).</p>
      <SpotifyAccountPanel>{() => <Devices />}</SpotifyAccountPanel>
    </Section>
  );
}
