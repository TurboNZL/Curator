/** Video id from the YouTube / YouTube Music / youtu.be URL shapes the library uses; null for anything else. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\.|^music\./, '');
    let id: string | null = null;
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
    else if (host === 'youtube.com') id = u.searchParams.get('v') ?? (/^\/(shorts|embed)\/([\w-]{11})/.exec(u.pathname)?.[2] ?? null);
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

/** Largest first. `maxresdefault` (16:9) is missing for some videos; `hqdefault` (4:3, letterboxed) exists for all. */
export const thumbnailUrls = (id: string) => [`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${id}/hq720.jpg`, `https://i.ytimg.com/vi/${id}/hqdefault.jpg`];
