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
const C = 256;
const housing = circle(C, C, 236) + circle(C + 18, C - 20, 205); // an offset hole makes a scroll: thin at the top right, thick at the lower left
// a fox-tail plume flicking out of the thick end of the housing, its upper edge cut into the zigzag of a tail tip
const tail = 'M158,452C120,486 56,490 8,452L42,448L16,428L56,428L36,406L76,406C86,378 94,350 102,326L132,382C142,406 152,430 158,452Z';
const SCALE = 0.86; // room for the tail inside the rounded square
const blades = wheel(C, C, 38, 150, 9, 0.95, 0.34);

export const logoSvg = (size = 512) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}" role="img" aria-label="Music Curator">
  <defs>
    <radialGradient id="glow" cx="30%" cy="72%" r="75%"><stop offset="0" stop-color="${RED}" stop-opacity=".42"/><stop offset="1" stop-color="${RED}" stop-opacity="0"/></radialGradient>
    <linearGradient id="fin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff2a1a"/><stop offset="1" stop-color="${RED}"/></linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="${CHAR}"/>
  <rect width="512" height="512" rx="112" fill="url(#glow)"/>
  <g transform="translate(${f(256 * (1 - SCALE) + 6)} ${f(256 * (1 - SCALE) - 6)}) scale(${SCALE})">
  <path d="${housing}" fill-rule="evenodd" fill="${RED}"/>
  <path d="${tail}" fill="${RED}"/>
  <circle cx="${C}" cy="${C}" r="196" fill="${INK}"/>
  <g fill="none" stroke="${GROOVE}" stroke-width="3"><circle cx="${C}" cy="${C}" r="176"/><circle cx="${C}" cy="${C}" r="160"/></g>
  <path d="${blades}" fill="url(#fin)"/>
  <circle cx="${C}" cy="${C}" r="40" fill="${RED}"/><circle cx="${C}" cy="${C}" r="15" fill="${INK}"/>
  </g>
</svg>
`;

// ---- Android: the adaptive icon's foreground sits in the 66 dp safe zone of a 108 dp canvas ----
const k = (66 / 512) * SCALE, off = 21 + 33 * (1 - SCALE) + 0; // scale and offset into the 108 viewport
const tx = (d) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_m, x, y) => `${f(+x * k + off)},${f(+y * k + off)}`);
// the circle helpers use relative arcs (a r r 0 1,0 dx,0): scale those separately
const scaledCircle = (cx, cy, r) => circle(cx * k + off, cy * k + off, r * k);
const vec = (w, paths) => `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="${w}dp" android:height="${w}dp" android:viewportWidth="${w === 24 ? 24 : 108}" android:viewportHeight="${w === 24 ? 24 : 108}">\n${paths}</vector>\n`;
const apath = (fill, d, extra = '') => `    <path android:fillColor="${fill}" ${extra}android:pathData="${d}" />\n`;

export const launcherForeground = vec(108,
  apath(RED, scaledCircle(C, C, 236) + scaledCircle(C + 18, C - 20, 205), 'android:fillType="evenOdd" ') +
  apath(RED, tx(tail)) + apath(INK, scaledCircle(C, C, 196)) +
  apath(RED, tx(blades)) + apath(RED, scaledCircle(C, C, 40)) + apath(INK, scaledCircle(C, C, 15)));

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
  await shot(512, join(root, 'apps/electron/build/icon.png'));
  await b.close();
}
