import { api } from './store.ts';
import { saveImage } from './files.ts';

/**
 * Get a cover from YouTube image links (best first) and keep it as a local image. The server downloads the first link
 * that works; video thumbnails (i.ytimg.com) are letterboxed 16:9 frames, so their black bars are cut off. Google-hosted
 * art is already square. Throws with the reason when none of the links work.
 */
export async function fetchCoverFromLinks(urls: string[]): Promise<string> {
  const { hash, url } = await api().importCover(urls);
  const res = await api().fetchLink(api().fileUrl(hash));
  if (!res.ok) throw new Error(`Could not read the downloaded cover (${res.status})`);
  const blob = await res.blob();
  let video = false;
  try { video = new URL(url).hostname.endsWith('ytimg.com'); } catch { /* keep the whole picture */ }
  return saveImage(blob, { trimBars: video });
}
