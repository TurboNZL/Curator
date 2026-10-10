import { usePlayer } from './player.ts';
import { getLibrary } from './derive.ts';
import { desktop } from './settings.ts';

/**
 * Tells the desktop app what is playing so it can show it on Discord. Sent when the track or play/pause changes, and when the position
 * jumps (a seek), not on every tick: Discord draws the progress bar itself from the start and end times.
 */
export function startPresence(): void {
  const d = desktop();
  if (!d?.setPresence) return;
  let sentId: string | null = null, sentPlaying = false, sentPos = 0, sentAt = 0;
  const send = (id: string | null, playing: boolean, pos: number, dur: number) => {
    sentId = id; sentPlaying = playing; sentPos = pos; sentAt = Date.now();
    const t = id ? getLibrary().tracks.find((x) => x.id === id) : undefined;
    if (!t) { d.setPresence(null); return; }
    d.setPresence({ title: t.title, artist: t.artistName, album: t.albumTitle ?? '', duration: dur, position: pos, playing });
  };
  usePlayer.subscribe((s) => {
    const id = s.queue.currentId;
    const expected = sentPos + (sentPlaying ? (Date.now() - sentAt) / 1000 : 0);
    if (id !== sentId || s.playing !== sentPlaying || Math.abs(s.time - expected) > 3) send(id, s.playing, s.time, s.duration);
  });
}
