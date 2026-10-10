import { useState } from 'react';
import { Cast, Check, Monitor, Radio, Smartphone } from 'lucide-react';
import type { DeviceInfo } from '@curator/core';
import { useLibrary } from '../lib/derive.ts';
import { myId, transferTo, useConnect } from '../lib/connect.ts';
import { usePlayer } from '../lib/player.ts';
import { usePopups } from '../lib/popups.ts';
import { useStore } from '../lib/store.ts';
import { cn } from '../lib/cn.ts';
import { Popover } from './Popover.tsx';

const iconFor = (d: DeviceInfo) => (d.kind === 'android' ? Smartphone : d.kind === 'electron' ? Monitor : Cast);

/** The devices that have this app open, to move playback to one of them or to remote-control it. */
export function DeviceList({ onPick }: { onPick?: () => void }) {
  const lib = useLibrary();
  const configured = useStore((s) => !!s.settings.token);
  const { devices, live, remoteId } = useConnect();
  const playingHere = usePlayer((s) => s.playing);
  const me = myId();
  const active = remoteId ?? me;
  const [err, setErr] = useState<string | null>(null);
  if (!configured) return <p className="p-3 text-sm text-muted">Connect needs your server. Add its address and token in Settings.</p>;
  if (!live) return <p className="p-3 text-sm text-muted">Connecting to the server…</p>;
  const sorted = [...devices].sort((a, b) => Number(b.id === me) - Number(a.id === me) || a.name.localeCompare(b.name));
  return (
    <div className="py-1">
      {sorted.map((d) => {
        const mine = d.id === me;
        const track = d.state?.trackId ? lib.trackById.get(d.state.trackId) : undefined;
        const Icon = iconFor(d);
        const playing = mine ? playingHere : d.state?.playing;
        return (
          <button key={d.id} type="button" role="menuitemradio" aria-checked={d.id === active} data-selected={d.id === active || undefined}
            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm" onClick={() => { setErr(null); void transferTo(d.id).then(onPick).catch((e: Error) => setErr(e.message)); }}>
            <Icon size={18} className={cn('shrink-0', d.id === active ? 'text-accent' : 'text-muted')} />
            <span className="min-w-0 flex-1">
              <span className={cn('flex items-center gap-1.5 font-medium', d.id === active && 'text-accent')}><span className="truncate">{mine ? `${d.name} (this device)` : d.name}</span>{playing && <Radio size={12} className="shrink-0 animate-pulse" aria-label="Playing" />}</span>
              <span className="block truncate text-xs text-muted">{track ? `${track.title} · ${track.artistName}` : 'Nothing playing'}</span>
            </span>
            {d.id === active && <Check size={16} className="shrink-0 text-accent" />}
          </button>);
      })}
      {devices.length < 2 && <p className="px-3 py-2 text-xs text-muted">Open Curator on another device that uses this server and it appears here. Then you can play on it from here.</p>}
      {err && <p className="px-3 pb-2 text-xs text-bad">{err}</p>}
    </div>
  );
}

/** Opens above the player bar. */
export function DevicesPopover({ anchor }: { anchor: HTMLElement | null }) {
  const open = usePopups((s) => s.devicesOpen);
  return (
    <Popover open={open} anchor={anchor} onClose={usePopups.getState().closeDevices} align="right" label="Devices" className="w-80 max-w-[calc(100vw-1.5rem)]">
      <div className="border-b border-line/60 px-3 py-2 text-sm font-semibold">Play on a device</div>
      <div className="max-h-[55vh] overflow-y-auto"><DeviceList onPick={usePopups.getState().closeDevices} /></div>
    </Popover>
  );
}

/** The top-bar button: reachable even when the player bar is hidden (nothing is playing here but another device is). */
export function DevicesMenu() {
  const [open, setOpen] = useState(false);
  const count = useConnect((s) => s.devices.length);
  const remote = useConnect((s) => s.remoteId);
  const configured = useStore((s) => !!s.settings.token);
  if (!configured) return null;
  return (
    <div className="relative">
      <button type="button" className={cn('btn btn-ghost !p-2', remote && 'text-accent')} aria-haspopup="menu" aria-expanded={open} title="Play on a device" aria-label="Play on a device" onClick={() => setOpen(!open)}>
        <Cast size={16} />{count > 1 && <span className="text-xs tabular-nums">{count}</span>}</button>
      {open && <>
        <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
        <div role="menu" className="bt-menu absolute right-0 z-30 mt-2 w-72 origin-top-right overflow-hidden"><DeviceList onPick={() => setOpen(false)} /></div></>}
    </div>
  );
}
