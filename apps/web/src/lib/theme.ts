/**
 * Colour themes. Each one is a complete set of colours, applied to <html> as CSS variables so any theme
 * can be combined with any UI style (see uiStyle.ts). Defined the way the original handoff did (shadcn
 * style names, HSL triplets) and translated to this app's tokens by `curatorVars`.
 *
 * The three "Curator" themes (Default, Classic, Light) are the app's own: their CSS lives in index.css
 * (it also carries Classic's tighter density and loud headings), so they apply no inline variables.
 */
export type ThemeId = string;
export type Hsl = [number, number, number];
export type Motif = "stars" | "waves" | "hills" | "grid" | "dots" | "rays" | "peaks";

export type ThemeDef = {
  id: ThemeId;
  label: string;
  dark: boolean;
  /** Page background, as [h, s, l] (used for the wallpaper and the browser theme colour). */
  bg: Hsl;
  /** Accent colour, as [h, s, l]. */
  primary: Hsl;
  /** shadcn-style variable values; empty for the app's own themes, whose colours live in index.css. */
  vars: Record<string, string>;
  motif: Motif;
  /** the app's own theme (colours come from index.css) */
  own?: boolean;
  note?: string;
};

/** The app's own themes. Colours here only feed previews and the wallpaper; the real ones are in index.css. */
const APP_THEMES: ThemeDef[] = [
  { id: "default", label: "Default", note: "Dark, medium density", dark: true, bg: [240, 12, 7], primary: [262, 83, 66], vars: {}, motif: "stars", own: true },
  { id: "classic", label: "Classic", note: "The original look, tighter", dark: true, bg: [240, 6, 4], primary: [217, 91, 60], vars: {}, motif: "grid", own: true },
  { id: "light", label: "Light", note: "Light, medium density", dark: false, bg: [40, 20, 97], primary: [262, 70, 52], vars: {}, motif: "hills", own: true },
];

const t = (h: number, s: number, l: number) => `${h} ${s}% ${l}%`;

/** "#rrggbb" -> [h, s, l]. Lets platform colours be written the way their designers publish them. */
export const hex = (value: string): Hsl => {
  const n = parseInt(value.replace("#", ""), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [Math.round(((h * 60) + 360) % 360), Math.round(s * 100), Math.round(l * 1000) / 10];
};
const hx = (value: string) => t(...hex(value));

type Spec = {
  id: ThemeDef["id"];
  label: string;
  /** Background hue / saturation / lightness */
  bg: Hsl;
  primary: Hsl;
  /** Text on the accent colour; defaults to white (dark text for light accents). */
  onPrimary?: string;
  fg?: string;
  mutedFg?: string;
  motif: Motif;
  /** How much lighter surfaces get as they stack up (dark themes) */
  step?: number;
  /** Exact values (hex) for individual variables, for themes that copy a real palette. */
  ov?: Partial<Record<"card" | "popover" | "secondary" | "muted" | "accent" | "border" | "input" | "mutedFg" | "fg", string>>;
};

/** Applies a spec's exact colour overrides on top of the derived ones. */
const applyOverrides = (vars: Record<string, string>, ov: Spec["ov"]) => {
  if (!ov) return vars;
  const map: Record<string, string> = {
    card: "card", popover: "popover", secondary: "secondary", muted: "muted", accent: "accent", border: "border", input: "input", mutedFg: "muted-foreground", fg: "foreground",
  };
  for (const [k, v] of Object.entries(ov)) {
    if (!v) continue;
    vars[map[k]] = hx(v);
    if (k === "fg") for (const x of ["card-foreground", "popover-foreground", "secondary-foreground", "accent-foreground"]) vars[x] = hx(v);
    if (k === "card" && !ov.popover) vars.popover = hx(v);
  }
  return vars;
};

const dark = (s: Spec): ThemeDef => {
  const [h, sat, l] = s.bg;
  const k = s.step ?? 1;
  const light = s.primary[2] > 62;
  return {
    id: s.id, label: s.label, dark: true, bg: s.bg, primary: s.primary, motif: s.motif,
    vars: applyOverrides({
      background: t(h, sat, l),
      foreground: s.fg ?? t(h, Math.min(sat, 30), 95),
      card: t(h, sat, l + 4.5 * k),
      "card-foreground": s.fg ?? t(h, Math.min(sat, 30), 95),
      popover: t(h, sat, l + 4.5 * k),
      "popover-foreground": s.fg ?? t(h, Math.min(sat, 30), 95),
      primary: t(...s.primary),
      "primary-foreground": s.onPrimary ?? (light ? t(h, 40, 10) : "0 0% 100%"),
      secondary: t(h, Math.min(sat, 30), l + 10 * k),
      "secondary-foreground": s.fg ?? t(h, Math.min(sat, 30), 95),
      muted: t(h, Math.min(sat, 30), l + 10 * k),
      "muted-foreground": s.mutedFg ?? t(h, Math.min(sat, 16), 68),
      accent: t(h, Math.min(sat, 30), l + 15 * k),
      "accent-foreground": s.fg ?? t(h, Math.min(sat, 30), 95),
      destructive: "0 62.8% 40%",
      "destructive-foreground": "0 0% 98%",
      border: t(h, Math.min(sat, 30), l + 11 * k),
      input: t(h, Math.min(sat, 30), l + 15 * k),
      ring: t(s.primary[0], s.primary[1], Math.min(s.primary[2] + 4, 80)),
      positive: "142 69% 58%",
      negative: "0 91% 71%",
    }, s.ov),
  };
};

const light = (s: Spec): ThemeDef => {
  const [h, sat, l] = s.bg;
  const fg = s.fg ?? t(222, 47, 11);
  return {
    id: s.id, label: s.label, dark: false, bg: s.bg, primary: s.primary, motif: s.motif,
    vars: applyOverrides({
      background: t(h, sat, l),
      foreground: fg,
      card: t(h, sat, Math.min(l + 3.5, 100)),
      "card-foreground": fg,
      popover: t(h, sat, Math.min(l + 3.5, 100)),
      "popover-foreground": fg,
      primary: t(...s.primary),
      "primary-foreground": s.onPrimary ?? "0 0% 100%",
      secondary: t(h, sat, l - 4.5),
      "secondary-foreground": fg,
      muted: t(h, sat, l - 4),
      "muted-foreground": s.mutedFg ?? t(h, 14, 38),
      accent: t(h, sat, l - 9),
      "accent-foreground": fg,
      destructive: "0 84.2% 60.2%",
      "destructive-foreground": "210 40% 98%",
      border: t(h, sat, l - 9),
      input: t(h, sat, l - 12),
      ring: t(...s.primary),
      positive: "142 71% 30%",
      negative: "0 72% 45%",
    }, s.ov),
  };
};


/** Tailwind's zinc / blue / emerald / red, which the first version of the app used everywhere (see docs/appearance/TOOLBAR.md). */
function zinc(): ThemeDef {
  const d = dark({ id: "zinc", label: "Zinc", bg: hex("#09090b"), primary: hex("#2563eb"), onPrimary: "0 0% 100%", fg: hx("#fafafa"), mutedFg: hx("#71717a"), motif: "grid",
    ov: { card: "#101012", secondary: "#18181b", muted: "#18181b", accent: "#27272a", border: "#27272a", input: "#27272a" } });
  d.vars.positive = hx("#10b981"); // emerald-500: the "Merge" links, the up-votes
  d.vars.negative = hx("#ef4444"); // red-500: deletes
  return d;
}

export const THEME_DEFS: ThemeDef[] = [
  ...APP_THEMES,
  light({ id: "daylight", label: "Daylight", bg: [210, 40, 96.5], primary: [221, 83, 48], fg: "222 84% 5%", mutedFg: "215 16% 42%", motif: "waves" }),
  light({ id: "sand", label: "Sand", bg: [40, 33, 95], primary: [28, 90, 40], fg: "28 30% 12%", mutedFg: "30 14% 36%", motif: "hills" }),
  dark({ id: "dark", label: "Slate", bg: [222, 47, 5], primary: [217, 91, 55], motif: "grid" }),
  dark({ id: "midnight", label: "Midnight", bg: [232, 50, 6], primary: [243, 85, 67], motif: "stars" }),
  dark({ id: "ocean", label: "Ocean", bg: [200, 60, 6], primary: [188, 85, 42], motif: "waves" }),
  dark({ id: "forest", label: "Forest", bg: [160, 35, 5], primary: [152, 69, 38], motif: "peaks" }),
  dark({ id: "plum", label: "Plum", bg: [285, 35, 6], primary: [322, 75, 52], motif: "dots" }),
  dark({ id: "crimson", label: "Crimson", bg: [350, 40, 6], primary: [351, 78, 52], motif: "rays" }),
  dark({ id: "ember", label: "Ember", bg: [22, 40, 6], primary: [24, 94, 52], motif: "peaks" }),
  dark({ id: "graphite", label: "Graphite", bg: [220, 8, 9], primary: [213, 60, 58], motif: "grid", step: 0.9 }),
  dark({ id: "amoled", label: "AMOLED black", bg: [0, 0, 0], primary: [190, 90, 50], motif: "stars", step: 1.4 }),
  dark({ id: "nord", label: "Nord", bg: [220, 16, 17], primary: [193, 43, 67], fg: "218 27% 94%", mutedFg: "219 15% 70%", motif: "peaks", step: 1.1 }),
  dark({ id: "dracula", label: "Dracula", bg: [231, 15, 15], primary: [265, 89, 72], fg: "60 30% 96%", mutedFg: "225 20% 72%", motif: "dots", step: 1.1 }),
  dark({ id: "mocha", label: "Mocha", bg: [240, 21, 11], primary: [267, 84, 78], fg: "226 64% 88%", mutedFg: "228 24% 72%", motif: "hills", step: 1.1 }),
  dark({ id: "tokyo", label: "Tokyo Night", bg: [235, 22, 9], primary: [222, 89, 70], fg: "229 35% 82%", mutedFg: "229 20% 62%", motif: "stars", step: 1.1 }),
  dark({ id: "gruvbox", label: "Gruvbox", bg: [0, 0, 12], primary: [42, 95, 55], fg: "43 59% 81%", mutedFg: "40 20% 62%", motif: "hills", step: 1.1 }),
  dark({ id: "solarized", label: "Solarized Dark", bg: [193, 100, 9], primary: [205, 69, 49], fg: "44 87% 94%", mutedFg: "186 13% 62%", motif: "waves", step: 1.2 }),

  // ---- Platform palettes (pair with the matching UI style) ----
  light({ id: "adwaita", label: "Adwaita", bg: hex("#fafafb"), primary: hex("#3584e4"), fg: hx("#2e3436"), mutedFg: hx("#5e5c64"), motif: "hills",
    ov: { card: "#ffffff", secondary: "#ebebed", muted: "#ebebed", accent: "#e1e1e4", border: "#d8d8dc", input: "#cfcfd4" } }),
  dark({ id: "adwaita-dark", label: "Adwaita Dark", bg: hex("#222226"), primary: hex("#3584e4"), onPrimary: "0 0% 100%", fg: "0 0% 100%", mutedFg: hx("#c0bfbc"), motif: "hills",
    ov: { card: "#303030", secondary: "#3a3a3a", muted: "#383838", accent: "#464646", border: "#3d3d3d", input: "#4a4a4a" } }),
  light({ id: "breeze", label: "Breeze", bg: hex("#eff0f1"), primary: hex("#3daee9"), onPrimary: hx("#ffffff"), fg: hx("#31363b"), mutedFg: hx("#6f7479"), motif: "waves",
    ov: { card: "#fcfcfc", secondary: "#e3e5e7", muted: "#e3e5e7", accent: "#d6e9f5", border: "#bcc0c4", input: "#bcc0c4" } }),
  dark({ id: "breeze-dark", label: "Breeze Dark", bg: hex("#31363b"), primary: hex("#3daee9"), onPrimary: hx("#1b1e20"), fg: hx("#eff0f1"), mutedFg: hx("#a1a9b1"), motif: "waves",
    ov: { card: "#232629", secondary: "#3b4045", muted: "#3b4045", accent: "#2f5e7a", border: "#4d5359", input: "#4d5359" } }),
  light({ id: "win11", label: "Windows 11", bg: hex("#f3f3f3"), primary: hex("#005fb8"), fg: hx("#1a1a1a"), mutedFg: hx("#5d5d5d"), motif: "waves",
    ov: { card: "#fbfbfb", secondary: "#ededed", muted: "#ededed", accent: "#e5e5e5", border: "#e0e0e0", input: "#c9c9c9" } }),
  dark({ id: "win11-dark", label: "Windows 11 Dark", bg: hex("#202020"), primary: hex("#4cc2ff"), onPrimary: "0 0% 0%", fg: "0 0% 100%", mutedFg: hx("#c5c5c5"), motif: "waves",
    ov: { card: "#2b2b2b", secondary: "#323232", muted: "#323232", accent: "#3a3a3a", border: "#3b3b3b", input: "#5a5a5a" } }),
  light({ id: "win10", label: "Windows 10", bg: hex("#ffffff"), primary: hex("#0078d7"), fg: hx("#000000"), mutedFg: hx("#666666"), motif: "grid",
    ov: { card: "#f2f2f2", secondary: "#e6e6e6", muted: "#e6e6e6", accent: "#cce4f7", border: "#cccccc", input: "#7a7a7a" } }),
  dark({ id: "win10-dark", label: "Windows 10 Dark", bg: hex("#1f1f1f"), primary: hex("#0078d7"), onPrimary: "0 0% 100%", fg: "0 0% 100%", mutedFg: hx("#b3b3b3"), motif: "grid",
    ov: { card: "#2b2b2b", secondary: "#333333", muted: "#333333", accent: "#404040", border: "#404040", input: "#7a7a7a" } }),
  // Aero: pale glass blue desktop, #f0f0f0 control surfaces, #3399ff selection, #707070 control borders
  light({ id: "win7", label: "Windows 7", bg: hex("#d4e3f5"), primary: hex("#2f6db5"), fg: hx("#1a2a3d"), mutedFg: hx("#566a82"), motif: "waves",
    ov: { card: "#f0f4fa", secondary: "#e3ebf5", muted: "#e3ebf5", accent: "#cfe2f7", border: "#8fa9c8", input: "#7b8da3" } }),
  // A darkened Aero: smoked-glass navy with the same blue highlights
  dark({ id: "win7-dark", label: "Windows 7 Dark", bg: hex("#0d1521"), primary: hex("#4a90d9"), onPrimary: "0 0% 100%", fg: hx("#e3edf9"), mutedFg: hx("#8fa6c2"), motif: "waves",
    ov: { card: "#17222f", secondary: "#1f2d3e", muted: "#1c2939", accent: "#27425f", border: "#33506f", input: "#3d5a7b" } }),
  // Luna (blue): #ece9d8 dialogs, white inputs, #0054e3 title bars
  light({ id: "winxp", label: "Windows XP", bg: hex("#ece9d8"), primary: hex("#245edb"), fg: hx("#000000"), mutedFg: hx("#595959"), motif: "hills",
    ov: { card: "#ffffff", secondary: "#e2dfcd", muted: "#e2dfcd", accent: "#c1d2ee", border: "#aca899", input: "#7f9db9" } }),
  // Classic: teal desktop, #c0c0c0 windows, navy title bars
  light({ id: "win98", label: "Windows 98", bg: hex("#008080"), primary: hex("#000080"), fg: hx("#000000"), mutedFg: hx("#404040"), motif: "grid",
    ov: { card: "#c0c0c0", secondary: "#d4d0c8", muted: "#d4d0c8", accent: "#a6a6a6", border: "#808080", input: "#808080" } }),
  light({ id: "macos", label: "macOS", bg: hex("#f5f5f7"), primary: hex("#007aff"), fg: hx("#1d1d1f"), mutedFg: hx("#6e6e73"), motif: "hills",
    ov: { card: "#ffffff", secondary: "#ececf0", muted: "#ececf0", accent: "#e1e1e6", border: "#d6d6db", input: "#c7c7cc" } }),
  dark({ id: "macos-dark", label: "macOS Dark", bg: hex("#1e1e1e"), primary: hex("#0a84ff"), onPrimary: "0 0% 100%", fg: hx("#f5f5f7"), mutedFg: hx("#98989d"), motif: "hills",
    ov: { card: "#2a2a2c", secondary: "#3a3a3c", muted: "#323234", accent: "#48484a", border: "#3d3d40", input: "#545458" } }),
  // Aqua: #ececec chrome, white content, #3875d7 selection (the classic Mac OS X list highlight)
  light({ id: "aqua", label: "Mac OS X Aqua", bg: hex("#ececec"), primary: hex("#3875d7"), onPrimary: "0 0% 100%", fg: hx("#000000"), mutedFg: hx("#5a5a5a"), motif: "waves",
    ov: { card: "#ffffff", secondary: "#dcdcdc", muted: "#e2e2e2", accent: "#c7d7ee", border: "#a5a5a5", input: "#7f7f7f" } }),
  // Holo: the Android 4 palette. Blue #33b5e5 / #0099cc, black "background_dark", greys #1a1a1a / #333
  dark({ id: "holo-dark", label: "Android Holo Dark", bg: hex("#000000"), primary: hex("#33b5e5"), onPrimary: "0 0% 0%", fg: hx("#ffffff"), mutedFg: hx("#a6a6a6"), motif: "grid",
    ov: { card: "#121212", secondary: "#2a2a2a", muted: "#222222", accent: "#1f3b47", border: "#2e2e2e", input: "#4d4d4d" } }),
  light({ id: "holo-light", label: "Android Holo Light", bg: hex("#ffffff"), primary: hex("#0099cc"), onPrimary: "0 0% 100%", fg: hx("#333333"), mutedFg: hx("#737373"), motif: "grid",
    ov: { card: "#f3f3f3", secondary: "#e5e5e5", muted: "#ececec", accent: "#cfeaf5", border: "#d0d0d0", input: "#a8a8a8" } }),
  // Winamp 2.x: bluish metal chrome, a black playlist with #00ff00 text and #000080 selection (the skin's pledit.txt defaults)
  dark({ id: "winamp", label: "Winamp Classic", bg: hex("#1c1c2a"), primary: hex("#00e800"), onPrimary: "0 0% 0%", fg: hx("#d8dbe6"), mutedFg: hx("#8e96a8"), motif: "grid",
    ov: { card: "#000000", secondary: "#34344a", muted: "#2a2a3c", accent: "#000080", border: "#46465e", input: "#5a5a72" } }),
  // Game and device inspired palettes (see the matching UI styles)
  dark({ id: "pipboy", label: "Pip-Boy Green", bg: hex("#04150a"), primary: hex("#35ff74"), onPrimary: "141 68% 5%", fg: hx("#35ff74"), mutedFg: hx("#1fb350"), motif: "grid",
    ov: { card: "#072214", secondary: "#0a2e1a", muted: "#0a2e1a", accent: "#0f3d22", border: "#12652f", input: "#0a2e1a" } }),
  dark({ id: "persona", label: "Persona Red", bg: hex("#0b0b0c"), primary: hex("#e60012"), onPrimary: "0 0% 100%", fg: hx("#ffffff"), mutedFg: hx("#b9b9be"), motif: "rays",
    ov: { card: "#131315", secondary: "#1d1d20", muted: "#1d1d20", accent: "#4a0a10", border: "#3a3a3e", input: "#1d1d20" } }),
  light({ id: "dmg", label: "DMG Green", bg: hex("#9bbc0f"), primary: hex("#306230"), onPrimary: "71 85% 40%", fg: hx("#0f380f"), mutedFg: hx("#306230"), motif: "dots",
    ov: { card: "#8bac0f", secondary: "#8bac0f", muted: "#8bac0f", accent: "#8bac0f", border: "#306230", input: "#8bac0f" } }),
  dark({ id: "zune", label: "Zune Orange", bg: hex("#000000"), primary: hex("#ee4d22"), onPrimary: "0 0% 100%", fg: hx("#ffffff"), mutedFg: hx("#9a9a9a"), motif: "waves",
    ov: { card: "#0f0f0f", secondary: "#1a1a1a", muted: "#1a1a1a", accent: "#2a2a2a", border: "#262626", input: "#1d1d1d" } }),
  dark({ id: "cyber", label: "Night City", bg: hex("#0a0a10"), primary: hex("#fcee0a"), onPrimary: "0 0% 0%", fg: hx("#f2f2f2"), mutedFg: hx("#8c8c99"), motif: "grid",
    ov: { card: "#12121a", secondary: "#1c1c26", muted: "#1c1c26", accent: "#2b2b10", border: "#4a4a1c", input: "#181822" } }),
  light({ id: "inventory", label: "Inventory", bg: hex("#c6c6c6"), primary: hex("#5d9b3a"), onPrimary: "0 0% 100%", fg: hx("#3f3f3f"), mutedFg: hx("#666666"), motif: "peaks",
    ov: { card: "#c6c6c6", secondary: "#b5b5b5", muted: "#b5b5b5", accent: "#d8d8d8", border: "#555555", input: "#8b8b8b" } }),
  // LG Optimus "Marshmallow" theme: pastel pink, cream and rose, read off a screenshot of its home screen (LG published no palette)
  light({ id: "lg-marshmallow", label: "Marshmallow", bg: hex("#f7dde2"), primary: hex("#dc5a76"), onPrimary: "0 0% 100%", fg: hx("#5a3a43"), mutedFg: hx("#9a6f7a"), motif: "dots",
    ov: { card: "#fdf3f4", secondary: "#f8d0d8", muted: "#f3d5db", accent: "#dc5a76", border: "#e8a6b3", input: "#e69aaa" } }),
  dark({ id: "lg-marshmallow-dark", label: "Marshmallow Night", bg: hex("#2b1224"), primary: hex("#ff6fb0"), onPrimary: "0 0% 100%", fg: hx("#ffe9f3"), mutedFg: hx("#d79ab8"), motif: "dots",
    ov: { card: "#3b1b31", secondary: "#4a2540", muted: "#40213a", accent: "#6b2d56", border: "#5a2a49", input: "#b45c8c" } }),
  // Fortnite: Epic does not publish its UI colours; these are read off screenshots of each era's settings and lobby screens.
  // Ch 1: muted slate blue with WHITE type, a dark navy top bar, pale lavender buttons with dark labels, cream "selected" and a soft yellow edge
  dark({ id: "fortnite-1", label: "Fortnite Ch 1", bg: hex("#41589a"), primary: hex("#f2e53c"), onPrimary: "230 40% 18%", fg: hx("#ffffff"), mutedFg: hx("#c7d3f2"), motif: "waves",
    ov: { card: "#4c66a8", secondary: "#5d77b8", muted: "#36508f", accent: "#fbf6c8", border: "#2d4078", input: "#5f7bab" } }),
  // Ch 2-3: saturated royal blue, cyan outlines and selection, lime-yellow Start button, pale blue type
  dark({ id: "fortnite-2", label: "Fortnite Ch 2-3", bg: hex("#0a5db6"), primary: hex("#e8f03b"), onPrimary: "60 100% 6%", fg: hx("#d9eeff"), mutedFg: hx("#9ccbf3"), motif: "grid",
    ov: { card: "#0a4a9a", secondary: "#0d6bcb", muted: "#0a55a8", accent: "#19b0f2", border: "#22b6ff", input: "#0b4a9a" } }),
  // Ch 4: blue again (not purple) with charcoal buttons, white outlines and a white selected row
  dark({ id: "fortnite-4", label: "Fortnite Ch 4", bg: hex("#0b3bb0"), primary: hex("#ffe500"), onPrimary: "0 0% 0%", fg: "0 0% 100%", mutedFg: hx("#b6c7f2"), motif: "stars",
    ov: { card: "#0a2f94", secondary: "#3a4254", muted: "#2a3350", accent: "#ffffff", border: "#5a78d8", input: "#161d3e" } }),
  // Ch 5-6: neutral dark glass, light grey "regular" buttons, a yellow "loud" button; no chapter colour any more
  dark({ id: "fortnite-5", label: "Fortnite Ch 5-6", bg: hex("#12151d"), primary: hex("#ffee00"), onPrimary: "0 0% 0%", fg: "0 0% 100%", mutedFg: hx("#a8aebb"), motif: "stars",
    ov: { card: "#1b1f2b", secondary: "#2a2f3d", muted: "#262b38", accent: "#e6e9ef", border: "#363c4b", input: "#222733" } }),
  // The first version of the app: Tailwind zinc on near-black (zinc-950 page, zinc-900 fields, zinc-800 borders, zinc-500 captions), blue-600 buttons
  zinc(),
  light({ id: "material", label: "Material You", bg: hex("#fef7ff"), primary: hex("#6750a4"), fg: hx("#1d1b20"), mutedFg: hx("#49454f"), motif: "dots",
    ov: { card: "#f7f2fa", secondary: "#e8def8", muted: "#ece6f0", accent: "#e8def8", border: "#cac4d0", input: "#79747e" } }),
  dark({ id: "material-dark", label: "Material You Dark", bg: hex("#141218"), primary: hex("#d0bcff"), onPrimary: hx("#381e72"), fg: hx("#e6e0e9"), mutedFg: hx("#cac4d0"), motif: "dots",
    ov: { card: "#211f26", secondary: "#4a4458", muted: "#2b2930", accent: "#4a4458", border: "#49454f", input: "#938f99" } }),
];

/** "System" follows the OS between the app's own Default (dark) and Light. */
export const THEMES: { id: ThemeId; label: string; dark: boolean | null; note?: string }[] = [
  { id: "system", label: "System", dark: null, note: "Follows your device" },
  ...THEME_DEFS.map((d) => ({ id: d.id, label: d.label, dark: d.dark, note: d.note })),
];

/** Themes that copy a platform's palette, shown in their own group in Settings. */
export const PLATFORM_THEME_IDS: ThemeId[] = [
  "adwaita", "adwaita-dark", "breeze", "breeze-dark", "win11", "win11-dark", "win10", "win10-dark",
  "win7", "win7-dark", "winxp", "win98", "macos", "macos-dark", "aqua", "holo-dark", "holo-light", "winamp", "lg-marshmallow", "lg-marshmallow-dark", "fortnite-1", "fortnite-2", "fortnite-4", "fortnite-5", "zinc", "material", "material-dark",
];
/** Palettes of the game and device inspired styles, shown in their own group in Settings. */
export const INSPIRED_THEME_IDS: ThemeId[] = ["pipboy", "persona", "dmg", "zune", "cyber", "inventory"];
export const OWN_THEME_IDS: ThemeId[] = APP_THEMES.map((d) => d.id);

export const DEFAULT_THEME: ThemeId = "default";
export const isTheme = (id: unknown): id is ThemeId => typeof id === "string" && (id === "system" || THEME_DEFS.some((d) => d.id === id));

const systemPrefersDark = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;

/** Resolves "system" (and unknown ids, e.g. from a newer version) to a real theme. */
export const resolveTheme = (id: ThemeId): ThemeDef => {
  const real = id === "system" ? (systemPrefersDark() ? "default" : "light") : id;
  return THEME_DEFS.find((d) => d.id === real) ?? THEME_DEFS[0];
};

/** The names this app's CSS uses, for each colour a theme sets. */
const OWN_VARS = ["bg", "surface", "raised", "line", "hover", "fg", "muted", "accent", "accent-fg", "good", "warn", "bad", "top"] as const;

/** Translates a theme's shadcn-style colours to this app's tokens. */
export const curatorVars = (def: ThemeDef): Record<string, string> => {
  const v = def.vars;
  if (!v.background) return {};
  const [h, s, l] = def.primary;
  return {
    bg: v.background, surface: v.card, raised: v.secondary, line: v.border, hover: v.accent,
    fg: v.foreground, muted: v["muted-foreground"],
    accent: v.primary, "accent-fg": v["primary-foreground"],
    good: v.positive, bad: v.negative,
    warn: def.dark ? "42 92% 58%" : "38 90% 40%",
    top: `${h} ${Math.max(s, 60)}% ${def.dark ? Math.max(l, 64) : Math.min(l, 42)}%`,
  };
};

/**
 * Inline style that applies a theme to one element, for previews. The app's own themes come from the
 * `data-theme` attribute instead, so they return only the base colours.
 */
export const themeStyle = (id: ThemeId): React.CSSProperties => {
  const def = resolveTheme(id);
  const style: Record<string, string> = { colorScheme: def.dark ? "dark" : "light" };
  for (const [k, v] of Object.entries(curatorVars(def))) style[`--${k}`] = v;
  return style as React.CSSProperties;
};

/** Black or white, whichever reads better on `hexColour`. */
export function readableOn(hexColour: string): string {
  const n = parseInt(hexColour.replace("#", ""), 16);
  const lin = (c: number) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  const lum = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return lum > 0.4 ? "240 10% 8%" : "0 0% 100%";
}

/** Applies the colour theme to the page. The accent colour is part of the theme (there is no separate accent setting). */
export function applyTheme(theme: ThemeId) {
  const root = document.documentElement;
  const def = resolveTheme(theme);
  root.dataset.theme = def.id;
  root.dataset.mode = def.dark ? "dark" : "light";
  root.style.colorScheme = def.dark ? "dark" : "light";
  const vars = curatorVars(def);
  for (const name of OWN_VARS) {
    if (vars[name]) root.style.setProperty(`--${name}`, vars[name]);
    else root.style.removeProperty(`--${name}`);
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", `hsl(${def.bg[0]} ${def.bg[1]}% ${def.bg[2]}%)`);
}
