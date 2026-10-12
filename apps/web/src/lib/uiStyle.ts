/**
 * UI styles change shape, typography, motion, borders and depth. They never set colours, so any of them
 * can be combined with any colour theme (see theme.ts). The CSS is in ui-styles.css.
 */
import type { ThemeId } from "./theme.ts";

export type UiStyleId = "auto" | "oneui" | "genius" | "spotify" | "ytmusic" | "discord" | "ado" | "yaru" | "default" | "gtk4" | "breeze" | "win11" | "win10" | "win7" | "winxp" | "win98" | "macos" | "liquid" | "material" | "holo" | "aqua" | "toolbar" | "winamp" | "lgux" | "fortnite1" | "fortnite2" | "fortnite4" | "fortnite5" | "pipboy" | "persona" | "gameboy" | "zune" | "cyber" | "blocky";

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
  { id: "auto", label: "Match this device", description: "Picks the look of the device you are on: Windows 11, macOS, Material (Android, Chromebooks), One UI (Samsung), the iOS palette on iPhones and iPads, GNOME/Yaru, or KDE Breeze on Linux. Follows the device's light or dark setting.", font: "system-ui" },
  { id: "default", label: "Standard v2", description: "The app's own look. Follows the colour theme's rounding and density (Classic is tighter).", font: "Inter", matching: { light: "light", dark: "default" } },
  { id: "gtk4", label: "GTK 4 (Adwaita)", description: "libadwaita: a flush grey sidebar and flat header bar, 6 px grey buttons and entries, 12 px outlined cards and popovers, grey sidebar highlight, white round slider knobs, in Cantarell.", font: "Cantarell", matching: { light: "adwaita", dark: "adwaita-dark" } },
  { id: "breeze", label: "KDE Breeze", description: "Plasma 6 Breeze: 5 px corners, a window-grey page with lighter panels, outlined buttons that take an accent frame on hover, solid accent selections and a light title bar in Noto Sans.", font: "Noto Sans", matching: { light: "breeze", dark: "breeze-dark" } },
  { id: "win11", label: "Windows 11", description: "Fluent: rounded, light shadows, accent underline on fields and smooth slide-in motion in Segoe UI Variable.", font: "Segoe UI Variable", matching: { light: "win11", dark: "win11-dark" } },
  { id: "win10", label: "Windows 10", description: "Flat and square with crisp 2 px borders and quick transitions in Segoe UI.", font: "Segoe UI", matching: { light: "win10", dark: "win10-dark" } },
  { id: "win7", label: "Windows 7", description: "Aero: glass window frames, grey gel buttons with a blue glow and a red close button in Segoe UI.", font: "Segoe UI", matching: { light: "win7", dark: "win7-dark" } },
  { id: "winxp", label: "Windows XP", description: "Luna: bevelled buttons, blue title bars, orange hover rings, instant menus and Tahoma.", font: "Tahoma", matching: { light: "winxp" } },
  { id: "win98", label: "Windows 98", description: "Classic: grey bevelled 3D controls, navy title bars, no animation and MS Sans Serif style type.", font: "Tahoma", matching: { light: "win98" } },
  { id: "macos", label: "macOS (Big Sur to Sequoia)", description: "Apple's flat 2020s look: 10 px windows, flat blue default buttons, a see-through sidebar and toolbar, sheet-style dialogs, in SF.", font: "system-ui", matching: { light: "macos", dark: "macos-dark" } },
  { id: "aqua", label: "Mac OS X Aqua (2001-09)", description: "Cheetah to Snow Leopard: pinstriped windows, glossy gel capsule buttons with a pulsing default, jewel traffic lights and a blue source list in Lucida Grande.", font: "Lucida Grande", matching: { light: "aqua" } },
  { id: "toolbar", label: "Standard v1", description: "The first version's look: bordered cover tiles, uppercase black headings, a wordmark and a three-column player. Pairs with the Standard v1 colours; its toolbar arrangement is the Standard v1 layout, which any look can use.", font: "system-ui", matching: { light: "zinc", dark: "zinc" } },
  { id: "liquid", label: "macOS Liquid Glass", description: "Apple's Liquid Glass: translucent floating bars that bend the light behind them, rim highlights, springy press and morphing menus.", font: "SF Pro", matching: { light: "macos", dark: "macos-dark" } },
  { id: "holo", label: "Android Holo (4.x, 2011-13)", description: "Ice Cream Sandwich to KitKat: black and cyan, square flat controls, an action bar with a blue rule, underlined tabs and fields, blue-titled dialogs in Roboto.", font: "Roboto", matching: { light: "holo-light", dark: "holo-dark" } },
  { id: "winamp", label: "Winamp 2 (classic skin)", description: "The 1998 media player: dark bevelled metal, striped title bars, a black playlist with green LCD text and a navy selection, in tiny Arial.", font: "Arial", matching: { light: "winamp" } },
  { id: "lgux", label: "LG Optimus: Marshmallow theme", description: "The pink Marshmallow home-screen theme of LG Optimus UI 3.0 (2012-13), redone from its screenshot: flat pastel pink, thin rose frames, translucent white panels, a dark status bar and a rose page indicator.", font: "Nunito", matching: { light: "lg-marshmallow", dark: "lg-marshmallow-dark" } },
  { id: "fortnite1", label: "Fortnite Chapter 1 (2017-19)", description: "Slanted buttons and panels, hard drop shadows, a yellow Play button and condensed capitals on bright blue.", font: "Burbank Big Condensed", matching: { light: "fortnite-1", dark: "fortnite-1" } },
  { id: "fortnite2", label: "Fortnite Chapter 2-3 (2019-23)", description: "The same slant on deep navy with see-through blue panels and a glowing Play button.", font: "Burbank Big Condensed", matching: { light: "fortnite-2", dark: "fortnite-2" } },
  { id: "fortnite4", label: "Fortnite Chapter 4 Rift UI (2023)", description: "The lobby redesign: rounded shapes on purple, options down the left side, in Heading Now.", font: "Heading Now", matching: { light: "fortnite-4", dark: "fortnite-4" } },
  { id: "fortnite5", label: "Fortnite Chapter 5-6 (2024-)", description: "Rift UI refined: less rounding and blue instead of purple.", font: "Heading Now", matching: { light: "fortnite-5", dark: "fortnite-5" } },
  { id: "pipboy", label: "Pip-Boy 3000 (Fallout)", description: "Green phosphor on black: one hue, square frames, glowing type, scan lines and menus that pick by inverting.", font: "VT323", matching: { light: "pipboy", dark: "pipboy" } },
  { id: "persona", label: "Persona 5", description: "Black, red and white with hard offset shadows, italic capitals, solid red selection and white edges.", font: "Anton", matching: { light: "persona", dark: "persona" } },
  { id: "gameboy", label: "Game Boy (DMG-01)", description: "The four greens of the original LCD, 2 px square frames, hard shadows, inverted picks and Press Start 2P type. Covers are tinted green.", font: "Press Start 2P", matching: { light: "dmg", dark: "dmg" } },
  { id: "zune", label: "Zune HD (Metro)", description: "Black with huge light lowercase titles, boxless content, white outlined controls and one orange accent that marks where you are.", font: "Segoe UI Light", matching: { light: "zune", dark: "zune" } },
  { id: "cyber", label: "Cyberpunk 2077", description: "Near-black with caution-tape yellow and cyan glints, chamfered corners, condensed capitals and solid yellow selection bars.", font: "Barlow Condensed", matching: { light: "cyber", dark: "cyber" } },
  { id: "blocky", label: "Minecraft (Bedrock)", description: "The game\u2019s dark settings screens: slate panels with black outlines, a light header bar, light grey buttons, two-part green on/off switches, green sliders and pixel type.", font: "VT323", matching: { light: "inventory", dark: "inventory" } },
  { id: "oneui", label: "Samsung One UI", description: "Big rounded squircle panels, frosted translucent tiles, round pill controls and thick pill sliders with a white fill. It has no colours of its own beyond the Samsung blue: the lilac in screenshots is the wallpaper, so choose a picture under Wallpaper.", font: "Outfit", matching: { light: "oneui", dark: "oneui-dark" } },
  { id: "genius", label: "Genius", description: "White pages, black type and the yellow highlighter: flat square controls with black outlines, yellow hover and selection, bold headings.", font: "Helvetica Neue", matching: { light: "genius", dark: "genius-dark" } },
  { id: "spotify", label: "Spotify", description: "Black canvas with floating rounded dark panels, bold muted navigation, green pill buttons, tiles that lighten on hover and a white round play button.", font: "Figtree", matching: { light: "spotify", dark: "spotify" } },
  { id: "ytmusic", label: "YouTube Music", description: "Flat near-black pages, pill chips and search, rounded thumbnails, a rounded grey highlight on the current page and a red progress bar.", font: "Roboto", matching: { light: "ytmusic", dark: "ytmusic" } },
  { id: "discord", label: "Discord", description: "Layered slate panels, 4 px corners, blurple buttons, a recessed dark search field, rounded hover bars and a bold channel-list sidebar.", font: "Noto Sans", matching: { light: "discord-light", dark: "discord-onyx" } },
  { id: "ado", label: "Ado", description: "Stage-black and electric blue with a hot red edge: condensed italic capitals, thin glowing outlines, a slash before page titles and square controls that light up.", font: "Barlow Condensed", matching: { light: "ado", dark: "ado" } },
  { id: "yaru", label: "Yaru (Ubuntu)", description: "Ubuntu's GNOME theme: libadwaita shapes with the Ubuntu typeface and the orange accent.", font: "Ubuntu", matching: { light: "yaru", dark: "yaru-dark" } },
  { id: "material", label: "Material 3", description: "Pill buttons, tonal surfaces, filled fields with an underline and rounded dialogs in Roboto.", font: "Roboto", matching: { light: "material", dark: "material-dark" } },
];

export const isUiStyle = (id: unknown): id is UiStyleId => UI_STYLES.some((s) => s.id === id);
