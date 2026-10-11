/**
 * The guides that ship with the project (everything in docs/ and the README), bundled into the web client so Settings → Guides can show
 * them offline, on the Raspberry Pi's copy of the client, and inside the Android app. Each is loaded only when opened.
 */
const files = import.meta.glob('../../../../docs/**/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
const readme = import.meta.glob('../../../../README.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;

export interface Guide { name: string; title: string; group: 'Start' | 'Run it' | 'Apps' | 'More'; load: () => Promise<string> }

const TITLE: Record<string, [string, Guide['group']]> = {
  GETTING_STARTED: ['Getting started', 'Start'], README: ['About Music Curator', 'Start'],
  DEPLOY_PI: ['Home server on a Raspberry Pi', 'Run it'], UPDATING: ['Updating', 'Run it'], YTDLP_COOKIES: ['YouTube cookies', 'Run it'], TESTING: ['Trying it with your library', 'Run it'],
  ELECTRON: ['Desktop app', 'Apps'], ANDROID: ['Android app', 'Apps'], CONNECT: ['Play on a device', 'Apps'], DISCORD: ['Discord status', 'Apps'], SPOTIFY: ['Spotify and Soloist', 'Apps'],
  PROJECT_BRIEF: ['Project brief', 'More'],
  'appearance/README': ['Appearance: overview', 'More'], 'appearance/THEMES': ['Appearance: themes and styles', 'More'], 'appearance/DESIGN_LANGUAGE': ['Appearance: design language', 'More'],
  'appearance/LIQUID_GLASS': ['Appearance: Liquid Glass', 'More'], 'appearance/TOOLBAR': ['Appearance: the first version', 'More'],
};
const ORDER = Object.keys(TITLE);

/** `../../../../docs/appearance/THEMES.md` -> `appearance/THEMES`; the README is `README`. */
export const guideName = (path: string) => (/README\.md$/.test(path) && !path.includes('/docs/') ? 'README' : path.replace(/^.*\/docs\//, '').replace(/\.md$/, ''));

export function listGuides(): Guide[] {
  const all = [...Object.entries(readme), ...Object.entries(files)].map(([path, load]): Guide => {
    const name = guideName(path);
    const known = TITLE[name];
    return { name, load, title: known?.[0] ?? name.replace(/^appearance\//, '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()), group: known?.[1] ?? 'More' };
  });
  const rank = (g: Guide) => { const i = ORDER.indexOf(g.name); return i === -1 ? 1000 : i; };
  return all.sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
}
