#!/usr/bin/env node
// Generates the app's logo from geometry (no picture is copied): a record whose centre is a turbo compressor wheel, wrapped by a scroll
// housing that ends in a fox-tail flick. Colours come from the owner's avatar (red #e10600, near-black, charcoal), the shapes are new.
//   node scripts/gen-icons.mjs            writes the SVG and Android vector drawables
//   node scripts/gen-icons.mjs --png      also renders PNGs (apps/web/public, apps/electron/build) with the pre-installed Chromium
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const RED = '#e10600', RED_DARK = '#8f0300', INK = '#0b0b0e', CHAR = '#17171c', GROOVE = '#2b2b33';
const f = (n) => +n.toFixed(2);
const pol = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];

/** one compressor blade: a curved fin from radius r0 to r1, leaning `twist` radians over its length */
function blade(cx, cy, a, r0, r1, twist, width) {
  const N = 14, lead = [], trail = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N, r = r0 + (r1 - r0) * s, th = a + twist * s;
    lead.push(pol(cx, cy, r, th));
    trail.push(pol(cx, cy, r, th + width * (1 - 0.55 * s)));
  }
  const pts = [...lead, ...trail.reverse()];
  return 'M' + pts.map(([x, y]) => `${f(x)},${f(y)}`).join('L') + 'Z';
}
const wheel = (cx, cy, r0, r1, n, twist, width, a0 = -Math.PI / 2) => Array.from({ length: n }, (_, i) => blade(cx, cy, a0 + (i * 2 * Math.PI) / n, r0, r1, twist, width)).join('');

const circle = (cx, cy, r) => `M${f(cx - r)},${f(cy)}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`;

// ---- the full-colour mark on a 512 canvas ----
// The same drawing as the notification icon (a ring, a six-bladed compressor wheel, a hub), which is the one that reads best, with colour
// and detail added: a lit red ring, a record with fine grooves and a sheen, glossy blades with a bright leading edge, and a bolted hub.
const C = 256;
const ring = circle(C, C, 236) + circle(C, C, 214);
const BLADES = 6;
const blades = wheel(C, C, 52, 176, BLADES, 0.95, 0.5);
const SCALE = 0.9;
const grooves = [196, 182, 168].map((r) => `<circle cx="${C}" cy="${C}" r="${r}"/>`).join('');
const bolts = Array.from({ length: BLADES }, (_, i) => { const [x, y] = pol(C, C, 31, -Math.PI / 2 + (i * 2 * Math.PI) / BLADES); return `<circle cx="${f(x)}" cy="${f(y)}" r="4.5"/>`; }).join('');
const edges = Array.from({ length: BLADES }, (_, i) => { // a thin bright line along each blade's leading edge
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / BLADES, pts = Array.from({ length: 15 }, (_x, n) => { const sx = n / 14, [x, y] = pol(C, C, 52 + 124 * sx, a + 0.95 * sx); return `${f(x)},${f(y)}`; });
  return `M${pts.join('L')}`; }).join('');

export const logoSvg = (size = 512) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}" role="img" aria-label="Music Curator">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#26262f"/><stop offset="1" stop-color="${INK}"/></linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="55%"><stop offset="0" stop-color="${RED}" stop-opacity=".30"/><stop offset=".7" stop-color="${RED}" stop-opacity=".06"/><stop offset="1" stop-color="${RED}" stop-opacity="0"/></radialGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5a44"/><stop offset=".5" stop-color="${RED}"/><stop offset="1" stop-color="${RED_DARK}"/></linearGradient>
    <linearGradient id="fin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4a36"/><stop offset="1" stop-color="#b30500"/></linearGradient>
    <radialGradient id="hub" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#ff6a55"/><stop offset=".55" stop-color="${RED}"/><stop offset="1" stop-color="${RED_DARK}"/></radialGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity=".55"/></filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <rect width="512" height="512" rx="112" fill="url(#glow)"/>
  <g transform="translate(${f(256 * (1 - SCALE))} ${f(256 * (1 - SCALE))}) scale(${SCALE})">
    <path d="${ring}" fill-rule="evenodd" fill="url(#ring)"/>
    <circle cx="${C}" cy="${C}" r="206" fill="#101015"/>
    <g fill="none" stroke="${GROOVE}" stroke-width="2.5">${grooves}</g>
    <path d="M${C},${C} L${f(C + 206 * Math.cos(-2.3))},${f(C + 206 * Math.sin(-2.3))} A206,206 0 0 1 ${f(C + 206 * Math.cos(-0.75))},${f(C + 206 * Math.sin(-0.75))} Z" fill="url(#sheen)"/>
    <g filter="url(#soft)"><path d="${blades}" fill="url(#fin)"/></g>
    <path d="${edges}" fill="none" stroke="#ffb3a8" stroke-opacity=".75" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="${C}" cy="${C}" r="50" fill="url(#hub)"/>
    <circle cx="${C}" cy="${C}" r="50" fill="none" stroke="#ffb3a8" stroke-opacity=".5" stroke-width="2"/>
    <g fill="#2a0300" fill-opacity=".7">${bolts}</g>
    <circle cx="${C}" cy="${C}" r="13" fill="${INK}"/><circle cx="${C - 3}" cy="${C - 4}" r="3.5" fill="#fff" fill-opacity=".5"/>
  </g>
</svg>
`;

// ---- Android: the adaptive icon's foreground sits in the 66 dp safe zone of a 108 dp canvas ----
const k = (66 / 512) * SCALE, off = 21 + 33 * (1 - SCALE); // scale and offset into the 108 viewport
const tx = (d) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_m, x, y) => `${f(+x * k + off)},${f(+y * k + off)}`);
// the circle helpers use relative arcs (a r r 0 1,0 dx,0): scale those separately
const scaledCircle = (cx, cy, r) => circle(cx * k + off, cy * k + off, r * k);
const vec = (w, paths) => `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="${w}dp" android:height="${w}dp" android:viewportWidth="${w === 24 ? 24 : 108}" android:viewportHeight="${w === 24 ? 24 : 108}">\n${paths}</vector>\n`;
const apath = (fill, d, extra = '') => `    <path android:fillColor="${fill}" ${extra}android:pathData="${d}" />\n`;

export const launcherForeground = vec(108,
  apath(RED, scaledCircle(C, C, 236) + scaledCircle(C, C, 214), 'android:fillType="evenOdd" ') +
  apath('#101015', scaledCircle(C, C, 206)) +
  apath(RED, tx(blades)) + apath(RED, scaledCircle(C, C, 50)) + apath(INK, scaledCircle(C, C, 13)));

// the notification's small icon: white only, so Android can tint it; just the wheel in a ring, readable at 24 dp
const m = (d, s, o) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_x, x, y) => `${f(+x * s + o)},${f(+y * s + o)}`);
const small = wheel(12, 12, 2.4, 8.2, 6, 0.95, 0.5);
export const statIcon = vec(24,
  apath('#FFFFFFFF', circle(12, 12, 11) + circle(12, 12, 9.6), 'android:fillType="evenOdd" ') + apath('#FFFFFFFF', small) + apath('#FFFFFFFF', circle(12, 12, 2.2)));

const write = (p, s) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, s); console.log('wrote', p.replace(root + '/', '')); };
const droid = join(root, 'apps/android/app/src/main/res');
write(join(root, 'apps/web/public/icon.svg'), logoSvg());
write(join(droid, 'drawable/ic_launcher_foreground.xml'), launcherForeground);
write(join(droid, 'drawable/ic_stat_curator.xml'), statIcon);
write(join(droid, 'values/colors.xml'), `<resources>\n    <color name="ic_launcher_background">${CHAR}</color>\n</resources>\n`);

if (process.argv.includes('--png')) {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const shot = async (size, out) => {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    await p.setContent(`<body style="margin:0;background:transparent">${logoSvg(size)}</body>`);
    await p.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    await p.close(); console.log('wrote', out.replace(root + '/', ''));
  };
  await shot(512, join(root, 'apps/web/public/icon-512.png'));
  await shot(192, join(root, 'apps/web/public/icon-192.png'));
  await shot(32, join(root, 'apps/web/public/favicon-32.png'));
  await shot(256, join(root, 'apps/electron/build/icon-256.png'));
  await shot(512, join(root, 'apps/electron/build/icon.png'));
  await b.close();
}
