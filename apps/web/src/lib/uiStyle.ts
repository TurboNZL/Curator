/**
 * UI styles change shape, typography, motion, borders and depth. They never set colours, so any of them
 * can be combined with any colour theme (see theme.ts). The CSS is in ui-styles.css.
 */
import type { ThemeId } from "./theme.ts";

export type UiStyleId = "default" | "gtk4" | "breeze" | "win11" | "win10" | "win7" | "winxp" | "win98" | "macos" | "liquid" | "material" | "holo" | "aqua" | "winamp";

export type UiStyleDef = {
  id: UiStyleId;
  label: string;
  description: string;
  /** CSS font stack's first choice (the full stack is in ui-styles.css). */
  font: string;
  /** Colour themes that copy this platform's palette: [light, dark]. Win 7 / XP / 98 have a light one only. */
  matching?: { light: ThemeId; dark?: ThemeId };
};

export const UI_STYLES: UiStyleDef[] = [
  { id: "default", label: "Default", description: "The app's own look. Follows the colour theme's rounding and density (Classic is tighter).", font: "Inter", matching: { light: "light", dark: "default" } },
  { id: "gtk4", label: "GTK 4 (Adwaita)", description: "Large rounded corners, soft flat surfaces, header-bar dialogs and springy motion in Cantarell.", font: "Cantarell", matching: { light: "adwaita", dark: "adwaita-dark" } },
  { id: "breeze", label: "KDE Breeze", description: "Compact and tidy with thin outlines, glow-on-hover and a dark title bar in Noto Sans.", font: "Noto Sans", matching: { light: "breeze", dark: "breeze-dark" } },
  { id: "win11", label: "Windows 11", description: "Fluent: rounded, light shadows, accent underline on fields and smooth slide-in motion in Segoe UI Variable.", font: "Segoe UI Variable", matching: { light: "win11", dark: "win11-dark" } },
  { id: "win10", label: "Windows 10", description: "Flat and square with crisp 2 px borders and quick transitions in Segoe UI.", font: "Segoe UI", matching: { light: "win10", dark: "win10-dark" } },
  { id: "win7", label: "Windows 7", description: "Aero: glass window frames, grey gel buttons with a blue glow and a red close button in Segoe UI.", font: "Segoe UI", matching: { light: "win7", dark: "win7-dark" } },
  { id: "winxp", label: "Windows XP", description: "Luna: bevelled buttons, blue title bars, orange hover rings, instant menus and Tahoma.", font: "Tahoma", matching: { light: "winxp" } },
  { id: "win98", label: "Windows 98", description: "Classic: grey bevelled 3D controls, navy title bars, no animation and MS Sans Serif style type.", font: "Tahoma", matching: { light: "win98" } },
  { id: "macos", label: "macOS (Big Sur to Sequoia)", description: "Apple's flat 2020s look: 10 px windows, flat blue default buttons, a see-through sidebar and toolbar, sheet-style dialogs, in SF.", font: "system-ui", matching: { light: "macos", dark: "macos-dark" } },
  { id: "aqua", label: "Mac OS X Aqua (2001-09)", description: "Cheetah to Snow Leopard: pinstriped windows, glossy gel capsule buttons with a pulsing default, jewel traffic lights and a blue source list in Lucida Grande.", font: "Lucida Grande", matching: { light: "aqua" } },
  { id: "liquid", label: "macOS Liquid Glass", description: "Apple's Liquid Glass: translucent floating bars that bend the light behind them, rim highlights, springy press and morphing menus.", font: "SF Pro", matching: { light: "macos", dark: "macos-dark" } },
  { id: "holo", label: "Android Holo (4.x, 2011-13)", description: "Ice Cream Sandwich to KitKat: black and cyan, square flat controls, an action bar with a blue rule, underlined tabs and fields, blue-titled dialogs in Roboto.", font: "Roboto", matching: { light: "holo-light", dark: "holo-dark" } },
  { id: "winamp", label: "Winamp 2 (classic skin)", description: "The 1998 media player: dark bevelled metal, striped title bars, a black playlist with green LCD text and a navy selection, in tiny Arial.", font: "Arial", matching: { light: "winamp" } },
  { id: "material", label: "Material 3", description: "Pill buttons, tonal surfaces, filled fields with an underline and rounded dialogs in Roboto.", font: "Roboto", matching: { light: "material", dark: "material-dark" } },
];

export const isUiStyle = (id: unknown): id is UiStyleId => UI_STYLES.some((s) => s.id === id);
