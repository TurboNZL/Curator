import { describe, expect, it } from 'vitest';
import type { DeviceInfo, PlaybackSnapshot } from '@turbomusic/core';
import { guessDeviceName, positionNow } from '../src/lib/connectPure.ts';

const snap = (over: Partial<PlaybackSnapshot> = {}): PlaybackSnapshot => ({ trackId: 't', queue: { user: [], active: [], currentId: 't' }, source: { type: 'track', id: null }, history: [], position: 10, duration: 100, playing: true, volume: 0.5, ...over });
const dev = (state: PlaybackSnapshot | null): DeviceInfo => ({ id: 'd', name: 'D', kind: 'web', state, updatedAt: 1 });

describe('Connect', () => {
  it('a playing device keeps moving after its report, a paused one does not, and neither passes the end', () => {
    expect(positionNow(dev(snap()), { d: 1000 }, 4000)).toBe(13);
    expect(positionNow(dev(snap({ playing: false })), { d: 1000 }, 4000)).toBe(10);
    expect(positionNow(dev(snap({ position: 99 })), { d: 1000 }, 9000)).toBe(100);
    expect(positionNow(dev(null), {}, 5)).toBe(0);
  });
  it('names a device after its browser and system when the user has not', () => {
    expect(guessDeviceName('Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0')).toBe('Firefox on Linux');
    expect(guessDeviceName('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36')).toBe('Chrome on Android');
    expect(guessDeviceName('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36 Edg/126.0')).toBe('Edge on Windows');
    expect(guessDeviceName('')).toBe('Browser on this device');
  });
});
