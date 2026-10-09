import { useState } from 'react';
import { ArrowDownToLine, Check, Trash2 } from 'lucide-react';
import { keepOffline, removeAudio, type KeepProgress } from '../lib/files.ts';
import { useStore } from '../lib/store.ts';

/** "Keep on this device" toggle for a group of tracks (album, playlist). */
export function KeepOffline({ hashes }: { hashes: string[] }) {
  const cache = useStore((s) => s.audioCache);
  const configured = useStore((s) => !!s.settings.token);
  const [p, setP] = useState<KeepProgress>({ running: false, done: 0, total: 0, message: null });
  const have = hashes.filter((h) => cache[h]).length;
  if (!hashes.length) return null;
  if (have === hashes.length && !p.running) return <button className="btn btn-ghost" onClick={() => void removeAudio(hashes)} title="Remove the offline copies"><Check size={15} className="text-good" />Saved offline <Trash2 size={13} className="opacity-60" /></button>;
  return (
    <span className="inline-flex items-center gap-2">
      <button className="btn btn-ghost" disabled={p.running || !configured} title={configured ? '' : 'Connect a server in Settings first'} onClick={() => void keepOffline(hashes, setP)}>
        <ArrowDownToLine size={15} />{p.running ? `Saving ${p.done}/${p.total}…` : have ? `Save the rest offline (${hashes.length - have})` : 'Keep offline'}</button>
      {p.message && <span className="text-xs text-warn">{p.message}</span>}
    </span>
  );
}
