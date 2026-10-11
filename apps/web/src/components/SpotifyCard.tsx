import { useStore } from '../lib/store.ts';
import { SoloistPanel } from './SoloistPanel.tsx';
import { Section } from './Section.tsx';
import { SpotifyAccountPanel } from './SpotifyAccountPanel.tsx';

function Options() {
  const { settings, updateSettings } = useStore();
  return (
    <div className="space-y-3">
      <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5" checked={settings.spotifyAuto} onChange={(e) => updateSettings({ spotifyAuto: e.target.checked })} /><span>Play tracks that have no audio file through Spotify <span className="text-muted">(they need a Spotify link; Spotify plays them, so the equaliser, offline copies and the phone notification do not apply)</span></span></label>
      <p className="text-xs text-muted">Which Spotify device plays is chosen in the device list (the cast button in the player bar): your Spotify devices are listed there next to your Curator devices.{settings.spotifyDeviceName ? ` This device plays Spotify on “${settings.spotifyDeviceName}”.` : ' None chosen yet.'}</p>
      {settings.spotifyDeviceId && <button className="btn btn-ghost" onClick={() => updateSettings({ spotifyDeviceId: '', spotifyDeviceName: '' })}>Do not use Spotify on this device</button>}
    </div>
  );
}

/** Settings: Spotify account, which Spotify device plays, and whether file-less tracks go through it. */
export function SpotifyCard() {
  return (
    <Section title="Spotify">
      <p className="text-sm text-muted">Optional. Lets you import playlists, find recommendations and play tracks you do not have as files. Needs Spotify Premium. Setup runs on your server (docs/SPOTIFY.md).</p>
      <SpotifyAccountPanel>{() => <Options />}</SpotifyAccountPanel>
      <SoloistPanel />
    </Section>
  );
}
