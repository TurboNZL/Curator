import { describe, expect, it } from 'vitest';
import { chooseUserData, CURRENT_FOLDER, LEGACY_FOLDER } from '../src/appName.ts';

const has = (set: string[]) => (p: string) => set.includes(p);

describe('chooseUserData', () => {
  it('keeps the old folder while it is the only one, so an update finds its settings', () => {
    const r = chooseUserData('/c', 'full', has([]), has(['/c/Music Curator']));
    expect(r).toEqual({ path: '/c/Music Curator', legacy: true });
  });
  it('uses the new folder once it holds something, even if the old one is still there', () => {
    expect(chooseUserData('/c', 'app', has(['/c/TurboMusic App']), has(['/c/Music Curator App']))).toEqual({ path: '/c/TurboMusic App', legacy: false });
  });
  it('starts a fresh install in the new folder', () => {
    expect(chooseUserData('/c', 'server', has([]), has([]))).toEqual({ path: '/c/TurboMusic Server', legacy: false });
  });
  it('does not mistake an empty new folder for a settings folder', () => {
    expect(chooseUserData('/c', 'full', has([]), has(['/c/Music Curator', '/c/TurboMusic']))).toEqual({ path: '/c/Music Curator', legacy: true });
  });
  it('names the three programs', () => {
    expect(LEGACY_FOLDER).toEqual({ full: 'Music Curator', app: 'Music Curator App', server: 'Music Curator Server' });
    expect(CURRENT_FOLDER).toEqual({ full: 'TurboMusic', app: 'TurboMusic App', server: 'TurboMusic Server' });
  });
});
