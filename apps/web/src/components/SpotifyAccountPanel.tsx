import { useEffect, useState, type ReactNode } from 'react';
import { LogIn } from 'lucide-react';
import { api, useStore } from '../lib/store.ts';
import { refreshSpotifyStatus } from '../lib/spotifyPlayer.ts';
import { Field } from './forms.tsx';

type Status = { clientId: string; redirectUri: string; signedIn: boolean; streaming?: boolean; configured: boolean };

/**
 * Connecting Curator's server to a Spotify account (Authorization Code with PKCE; the server holds the token). Used by Settings and by the
 * Spotify import. `children` shows once signed in.
 */
export function SpotifyAccountPanel({ children, onStatus }: { children?: (s: Status) => ReactNode; onStatus?: (s: Status) => void }) {
  const configured = useStore((s) => !!s.settings.token);
  const [acct, setAcct] = useState<Status | null>(null);
  const [clientId, setClientId] = useState('');
  const [redirect, setRedirect] = useState('');
  const [pasted, setPasted] = useState('');
  const [inApp, setInApp] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const guard = async (what: string, f: () => Promise<void>) => {
    setBusy(what); setError(null);
    try { await f(); } catch (e) { setError((e as Error).message === 'Failed to fetch' ? 'Cannot reach the server.' : (e as Error).message); } finally { setBusy(null); }
  };
  const load = () => guard('Checking…', async () => { const s = await api().spotifyStatus(); setAcct(s); setClientId(s.clientId); setRedirect(s.redirectUri); onStatus?.(s); void refreshSpotifyStatus(); });
  useEffect(() => { if (configured) void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!configured) return <p className="text-sm text-muted">Spotify goes through your server. Connect one in Settings › Library &amp; server first.</p>;
  if (!acct) return <div className="text-sm text-muted">{error ?? 'Checking…'}</div>;
  return (
    <div className="space-y-3 text-sm">
      {acct.signedIn ? (<>
        <div className="flex items-center gap-2"><span className="text-good">Signed in to Spotify.</span><button className="btn btn-ghost !py-1 text-xs" onClick={() => void guard('Signing out…', async () => { await api().spotifySignOut(); await load(); })}>Sign out</button></div>
        {children?.(acct)}
      </>) : (<>
        <ol className="list-decimal space-y-1 pl-5 text-muted"><li>Make an app at <b>developer.spotify.com/dashboard</b> (free; Spotify requires Premium for the account that owns it). Set its Redirect URI to the address below exactly.</li>
          <li>Paste the app's <b>Client ID</b> here and save.</li><li>Press <b>Sign in with Spotify</b>, allow access, and copy the address Spotify sends you to (the page may show an error: that is fine, copy the whole address).</li><li>Paste it below.</li></ol>
        <div className="grid gap-2 sm:grid-cols-2"><Field label="Client ID"><input className="input font-mono" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="32 letters and digits" /></Field>
          <Field label="Redirect URI"><input className="input font-mono" value={redirect} onChange={(e) => setRedirect(e.target.value)} /></Field></div>
        <div className="flex flex-wrap gap-2"><button className="btn" disabled={!clientId.trim() || !!busy} onClick={() => void guard('Saving…', async () => setAcct(await api().spotifyConfig(clientId.trim(), redirect.trim() || undefined)))}>Save</button>
          <button className="btn btn-accent" disabled={!acct.configured || !!busy} onClick={() => void guard('Opening Spotify…', async () => { window.open((await api().spotifyAuthUrl(inApp)).url, '_blank', 'noopener'); })}><LogIn size={15} />Sign in with Spotify</button></div>
        <label className="flex items-start gap-2 text-xs text-muted"><input type="checkbox" className="mt-0.5" checked={inApp} onChange={(e) => setInApp(e.target.checked)} />Also allow playing Spotify inside the app (browser player). Leave this off unless you want that: it asks Spotify for three more permissions.</label>
        <Field label="Address Spotify sent you to"><input className="input font-mono" value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="http://127.0.0.1:47813/api/spotify/callback?code=…" /></Field>
        <button className="btn" disabled={!pasted.trim() || !!busy} onClick={() => void guard('Connecting…', async () => { await api().spotifyExchange(pasted.trim()); setPasted(''); await load(); })}>Connect</button>
      </>)}
      {busy && <div className="text-muted" role="status">{busy}</div>}
      {error && <div className="rounded-theme bg-bad/15 p-3 text-bad">{error}</div>}
    </div>
  );
}
