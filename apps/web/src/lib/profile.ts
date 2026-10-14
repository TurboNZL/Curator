import type { PlaybackRule, ProfileData } from '@turbomusic/core';
import type { Library } from './library.ts';
import { useStore } from './store.ts';

const blankProfile = (): ProfileData => ({ name: 'Main TurboMusic', theme: 'dark', accentColor: '#3b82f6', playbackMode: 'local', settings: {}, playbackRules: [] });

/** Change the synced profile (rules, default images), creating it first if the library has none yet. */
export function updateProfile(lib: Library, change: (p: ProfileData) => ProfileData) {
  const { put, patch, rows } = useStore.getState();
  if (lib.profile) {
    const stored = rows.profiles.get(lib.profile.id)?.data as ProfileData | undefined;
    const next = change({ ...blankProfile(), ...stored });
    patch('profiles', lib.profile.id, { settings: next.settings, playbackRules: next.playbackRules });
  } else put('profiles', change(blankProfile()), '1');
}

export const saveRules = (lib: Library, rules: PlaybackRule[]) => updateProfile(lib, (p) => ({ ...p, playbackRules: rules }));
export const saveDefaultImage = (lib: Library, key: 'defaultAlbumCover' | 'defaultArtistImage', hash: string | null) =>
  updateProfile(lib, (p) => ({ ...p, settings: { ...p.settings, [key]: hash } }));

/** The profile's fallback image for albums/artists that have none (a legacy setting). */
export const defaultImage = (lib: Library, key: 'defaultAlbumCover' | 'defaultArtistImage'): string | null => {
  const v = lib.profile?.settings?.[key];
  return typeof v === 'string' && /^[0-9a-f]{64}$/.test(v) ? v : null;
};
