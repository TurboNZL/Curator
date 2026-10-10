import { useEffect, useState } from 'react';
import { create } from 'zustand';
import type { Command, DeviceInfo, DeviceKind, PlaybackSnapshot, ServerEvent } from '@curator/core';
import { usePlayer } from './player.ts';
import { desktop } from './settings.ts';
import { guessDeviceName as guess, positionNow } from './connectPure.ts';
export { positionNow };
import { api, useStore } from './store.ts';

/**
 * Connect, in the manner of Spotify Connect: every device that has this app open and a server configured appears in a list. Pick
 * one to move playback there, or to use this device as the remote for it. The server only relays (packages/server/src/connect.ts);
 * the audio always plays on one device, which loads it from its own offline copy or from the server.
 */

interface ConnectState {
  /** the event stream is open */
  live: boolean;
  devices: DeviceInfo[];
  /** per device: when its latest report arrived here. Its reported position moves on from that moment */
  receivedAt: Record<string, number>;
  /** the device this one is the remote for; null = playing here */
  remoteId: string | null;
}
export const useConnect = create<ConnectState>(() => ({ live: false, devices: [], receivedAt: {}, remoteId: null }));

export const deviceKind = (): DeviceKind => (desktop() ? 'electron' : 'web');
export const guessDeviceName = () => guess(typeof navigator === 'undefined' ? '' : navigator.userAgent, !!desktop());
export const myName = () => useStore.getState().settings.deviceName.trim() || guessDeviceName();
export const myId = () => useStore.getState().settings.deviceId;

const remoteDevice = () => { const { remoteId, devices } = useConnect.getState(); return remoteId ? devices.find((d) => d.id === remoteId) : undefined; };

/** Send to a device; if it has gone, drop out of remote mode instead of pretending. */
async function send(to: string, command: Command) {
  try { await api().connectCommand(myId(), to, command); }
  catch { if (useConnect.getState().remoteId === to) useConnect.setState({ remoteId: null }); }
}

/** Publish what this device is doing. */
let lastPub = { t: 0, at: 0 };
function publish() {
  const { live } = useConnect.getState();
  if (!live) return;
  const snap = usePlayer.getState().snapshot();
  lastPub = { t: snap.position, at: Date.now() };
  // while this device is only a remote it plays nothing; its state is the idle one
  void api().connectState(myId(), myName(), snap.trackId ? snap : null).catch(() => undefined);
}

/** The snapshot to hand over when playback moves away from where it is now (this device, or the remote being controlled). */
function currentSnapshot(): PlaybackSnapshot | null {
  const r = remoteDevice();
  if (r?.state) return { ...r.state, position: positionNow(r, useConnect.getState().receivedAt) };
  const s = usePlayer.getState().snapshot();
  return s.trackId ? s : null;
}

/** Move playback to `id` (null or this device's id = bring it back here). */
export async function transferTo(id: string | null) {
  const me = myId();
  const target = id && id !== me ? id : null;
  const from = remoteDevice();
  const snap = currentSnapshot();
  if (target === (from?.id ?? null)) return;
  if (target) {
    if (!snap) { useConnect.setState({ remoteId: target }); return; }
    if (from) void send(from.id, { type: 'pause' }); else usePlayer.getState().pause();
    await send(target, { type: 'transfer', snapshot: { ...snap, playing: true } });
    useConnect.setState({ remoteId: target });
  } else {
    if (from) void send(from.id, { type: 'pause' });
    useConnect.setState({ remoteId: null });
    if (snap) usePlayer.getState().restore(snap, { play: true });
    publish();
  }
}

/** What the player bar shows and which commands its buttons send: this device's player, or the remote one's. */
export function usePlaybackView() {
  const p = usePlayer();
  const { remoteId, devices, receivedAt } = useConnect();
  const remote = remoteId ? devices.find((d) => d.id === remoteId) : undefined;
  const playing = remote?.state?.playing ?? false;
  const [, tick] = useState(0);
  useEffect(() => { if (!remote || !playing) return; const t = setInterval(() => tick((n) => n + 1), 500); return () => clearInterval(t); }, [remote, playing]);
  if (!remote) return { remote: undefined as DeviceInfo | undefined, trackId: p.queue.currentId, playing: p.playing, time: p.time, duration: p.duration, volume: p.volume,
    toggle: p.toggle, next: p.next, prev: p.prev, seek: p.seek, setVolume: p.setVolume };
  const s = remote.state;
  const cmd = (c: Command) => () => void send(remote.id, c);
  return {
    remote, trackId: s?.trackId ?? null, playing, time: positionNow(remote, receivedAt), duration: s?.duration ?? 0, volume: s?.volume ?? 0.8,
    toggle: cmd({ type: 'toggle' }), next: cmd({ type: 'next' }), prev: cmd({ type: 'prev' }),
    seek: (t: number) => void send(remote.id, { type: 'seek', time: t }), setVolume: (v: number) => void send(remote.id, { type: 'volume', value: v }),
  };
}

function onCommand(c: Command) {
  const p = usePlayer.getState();
  switch (c.type) {
    case 'play': if (!p.playing) p.toggle(); break;
    case 'pause': p.pause(); break;
    case 'toggle': p.toggle(); break;
    case 'next': p.next(); break;
    case 'prev': p.prev(); break;
    case 'seek': p.seek(c.time); break;
    case 'volume': p.setVolume(c.value); break;
    case 'transfer': useConnect.setState({ remoteId: null }); p.restore(c.snapshot, { play: true }); break;
    case 'report': break;
  }
  setTimeout(publish, 150);
}

let source: EventSource | null = null;
let retry: ReturnType<typeof setTimeout> | undefined;
let heartbeat: ReturnType<typeof setInterval> | undefined;
let key = '';

function open() {
  const st = useStore.getState().settings;
  const next = `${st.serverUrl}|${st.token}|${st.deviceId}|${st.deviceName}`;
  if (!st.token) { stop(); return; }
  if (source && next === key) return;
  stop();
  key = next;
  const es = (source = new EventSource(api().connectStreamUrl(myId(), myName(), deviceKind())));
  es.onopen = () => { useConnect.setState({ live: true }); publish(); };
  es.addEventListener('connect', (e) => {
    const ev = JSON.parse((e as MessageEvent).data) as ServerEvent;
    if (ev.type === 'devices') {
      const { remoteId, devices: before, receivedAt: was } = useConnect.getState();
      // a device's report is new when its updatedAt moved; other devices' reports must not reset its clock
      const receivedAt = Object.fromEntries(ev.devices.map((d) => [d.id, before.find((b) => b.id === d.id)?.updatedAt === d.updatedAt && was[d.id] ? was[d.id] : Date.now()]));
      useConnect.setState({ devices: ev.devices, receivedAt, remoteId: remoteId && ev.devices.some((d) => d.id === remoteId) ? remoteId : null });
    } else onCommand(ev.command);
  });
  es.onerror = () => {
    useConnect.setState({ live: false });
    // the browser retries by itself unless the server answered with an error (wrong token, restart): then start over after a pause
    if (es.readyState === EventSource.CLOSED) { source = null; key = ''; clearTimeout(retry); retry = setTimeout(open, 5000); }
  };
  clearInterval(heartbeat);
  heartbeat = setInterval(() => { if (usePlayer.getState().playing) publish(); }, 4000);
}

function stop() {
  source?.close(); source = null; key = '';
  clearTimeout(retry); clearInterval(heartbeat);
  useConnect.setState({ live: false, devices: [], remoteId: null });
}

/** Start Connect for this device and keep it in step with the player and the settings. Call once at start-up. */
export function startConnect() {
  open();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const soon = () => { clearTimeout(timer); timer = setTimeout(publish, 300); };
  usePlayer.subscribe((s, prev) => {
    if (s.queue.currentId !== prev.queue.currentId || s.playing !== prev.playing || s.volume !== prev.volume
      || s.queue.user.length !== prev.queue.user.length || s.queue.active.length !== prev.queue.active.length) soon();
    else if (s.time !== prev.time) { // a jump (seeking) is news; the normal ticking is not
      const expected = lastPub.t + (s.playing ? (Date.now() - lastPub.at) / 1000 : 0);
      if (Math.abs(s.time - expected) > 2) soon();
    }
  });
  useStore.subscribe((s, prev) => { if (s.settings.token !== prev.settings.token || s.settings.serverUrl !== prev.settings.serverUrl || s.settings.deviceName !== prev.settings.deviceName) open(); });
}
