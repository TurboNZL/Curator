import { useMemo } from 'react';
import { buildLibrary, type Library } from './library.ts';
import { useStore } from './store.ts';
import { useSpotifyLink } from './spotifyPlayer.ts';

export * from './library.ts';

let cache: { rev: number; lib: Library } | null = null;

/** The derived library for the current data; recomputed only when `rev` changes. */
export function getLibrary(): Library {
  const { rev, rows } = useStore.getState();
  if (!cache || cache.rev !== rev) cache = { rev, lib: buildLibrary(rows) };
  return cache.lib;
}

export function useLibrary(): Library {
  const rev = useStore((s) => s.rev);
  // what can be played depends on Spotify being usable (signed in, a device chosen): pages that list tracks re-render when that changes
  useSpotifyLink((s) => s.signedIn);
  useStore((s) => `${s.settings.spotifyDeviceId}${s.settings.spotifyAuto}`);
  return useMemo(() => getLibrary(), [rev]);
}
