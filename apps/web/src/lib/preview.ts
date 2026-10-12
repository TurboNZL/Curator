import { audioSource } from './files.ts';

/** a preview plays this long, from the middle of the track */
export const SNIPPET_MS = 15_000;
export interface Preview { el: HTMLAudioElement; url: string; local: boolean }
export const middle = (el: HTMLAudioElement) => Math.max(0, el.duration / 2 - SNIPPET_MS / 2000);
export const release = (p: Preview | null) => { if (!p) return; p.el.pause(); p.el.removeAttribute('src'); p.el.load(); if (p.local) URL.revokeObjectURL(p.url); };

/**
 * Start loading a track for the preview: its source is resolved (the copy kept on this device, else the server), and the
 * element seeks to the middle as soon as its length is known, so the browser fetches that part of the file before it is wanted.
 */
export function loadPreview(file: string, volume: number): Promise<Preview | null> {
  return audioSource(file).then(({ url, local }) => new Promise<Preview | null>((resolve) => {
    const el = new Audio();
    el.preload = 'auto'; el.volume = volume;
    // ready = the middle of the track is buffered enough to start at once, not merely that its length is known
    el.addEventListener('loadedmetadata', () => {
      el.currentTime = middle(el);
      const done = () => resolve({ el, url, local });
      if (el.readyState >= 3 && !el.seeking) return done();
      const slow = setTimeout(done, 8000); // a slow link or a browser that will not buffer unprompted must not leave the card waiting for ever
      el.addEventListener('canplay', () => { clearTimeout(slow); done(); }, { once: true });
    }, { once: true });
    el.addEventListener('error', () => { if (local) URL.revokeObjectURL(url); resolve(null); }, { once: true });
    el.src = url;
  })).catch(() => null);
}

