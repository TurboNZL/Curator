import { useStore } from '../lib/store.ts';
import { startSpotifySdk, stopSpotifySdk, useSpotifySdk } from '../lib/spotifySdk.ts';
import { isAndroidApp } from '../lib/native.ts';
import { SoloistPanel } from './SoloistPanel.tsx';
import { Section } from './Section.tsx';
import { SpotifyAccountPanel } from './SpotifyAccountPanel.tsx';

const SDK_STATE = { off: 'Off', checking: 'Checking…', loading: 'Starting…', ready: 'Ready', unsupported: 'Not possible here', error: 'Problem' } as const;

/** Spotify's own player running in this page: this app becomes a Spotify device (needs Widevine, a secure page and Premium). */
function InAppPlayer({ streaming }: { streaming: boolean }) {
  const { settings, updateSettings } = useStore();

  const sdk = useSpotifySdk();
  const on = settings.spotifySdk;
  if (isAndroidApp()) return null; // no Widevine in the app's WebView: Soloist on the server plays Spotify there (the panel below)
  const toggle = (v: boolean) => { updateSettings({ spotifySdk: v }); if (v) void startSpotifySdk(); else stopSpotifySdk(); };
  return (
    <div className="space-y-1.5 rounded-theme border border-line p-3">
      <label className="flex flex-wrap items-center gap-2"><input type="checkbox" checked={on} onChange={(e) => toggle(e.target.checked)} /><span className="font-medium">Play Spotify inside this app</span>
        {on && <span className={sdk.status === 'ready' ? 'chip !text-good' : sdk.status === 'off' || sdk.status === 'loading' || sdk.status === 'checking' ? 'chip' : 'chip !text-bad'}>{SDK_STATE[sdk.status]}</span>}</label>
      <p className="text-xs text-muted">Uses Spotify’s own web player: this browser becomes a Spotify device named “… (Curator)” and plays the audio itself, so no other Spotify app has to be open. It needs Spotify Premium, a secure page (https or localhost) and a browser with Widevine (Chrome, Edge, Firefox, Safari). The desktop app’s engine has no Widevine, so it works in a browser only; the desktop app plays Spotify through the Spotify app or your Pi’s Soloist (below).</p>
      {!streaming && <p className="text-xs text-warn">This needs one more permission from Spotify: sign out of Spotify above, tick “Also allow playing Spotify inside the app”, and sign in again.</p>}
      {on && sdk.error && <p className="text-xs text-bad" role="alert">{sdk.error}</p>}
      {on && sdk.status === 'ready' && <p className="text-xs text-good">Ready: Spotify tracks without a file play here.</p>}
    </div>
  );
}

function Options({ streaming }: { streaming: boolean }) {
  const { settings, updateSettings } = useStore();
  return (
    <div className="space-y-3">
      <InAppPlayer streaming={streaming} />
      {isAndroidApp() && <p className="text-xs text-muted">The Android app cannot play Spotify itself (it has no Widevine, Spotify’s protected-audio component). Spotify tracks play through Soloist on your server, or through the Spotify app on this phone: pick either in the device list.</p>}
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
      <SpotifyAccountPanel>{(s) => <Options streaming={s.streaming !== false} />}</SpotifyAccountPanel>
      <SoloistPanel />
    </Section>
  );
}
