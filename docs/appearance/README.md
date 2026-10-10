# The appearance system

Everything about how Curator looks lives in two independent choices, set per device in **Settings**, plus an optional wallpaper:

| Choice | What it controls | Where it lives |
|---|---|---|
| **Colour theme** | Every colour: backgrounds, text, the accent, good/warn/bad. Nothing else. | `src/lib/theme.ts` (+ `index.css` for the three own themes) |
| **UI style** | Shape, type, borders, depth and motion: how buttons, fields, cards, menus, dialogs, bars, sliders, checkboxes and page changes look and move. Never a fixed colour scheme. | `src/lib/uiStyle.ts` + `src/ui-styles.css` |
| Wallpaper | A picture or generated motif behind the page; panels turn translucent. | `src/lib/wallpaper.ts` |

Any colour theme works with any UI style. "Use matching colours" in Settings applies the palette a style was designed with.
The full lists are in [THEMES.md](THEMES.md); the rules for keeping new work consistent are in [DESIGN_LANGUAGE.md](DESIGN_LANGUAGE.md);
the glass material has its own write-up, [LIQUID_GLASS.md](LIQUID_GLASS.md), and the first version's look (the Toolbar style with the Zinc colours) is in [TOOLBAR.md](TOOLBAR.md).

## How a choice reaches the page

`applyAppearance(settings)` (`src/lib/appearance.ts`) runs before the first paint and on every settings change. It sets, on `<html>`:

- `data-theme` and, for every theme except the three own ones, inline CSS variables from `curatorVars()`.
- `data-ui` (the UI style) and `data-mode="dark|light"`.
- `data-glass` and `data-wallpaper` for the options that need them.

The Settings preview puts `data-theme`/`data-ui`/`data-mode` on its own wrapper element, which is why **every style must be written
against variables and `[data-ui="x"]`-scoped selectors**: a preview of one style has to render inside a page set to another.

## Colour themes

A theme is a set of tokens (HSL triplets so Tailwind can add alpha):
`--bg --surface --raised --line --hover --fg --muted --accent --accent-fg --good --warn --bad --top`.

Themes are written in the shadcn-style shape (background, card, primary…) in `theme.ts` and translated by `curatorVars()`. Two helpers:
`dark(spec)` / `light(spec)` derive a full set from a background and accent, and `ov: {…}` pins exact hex values for palettes copied from a real
platform. `PLATFORM_THEME_IDS` groups those in Settings. To add one: add a spec, add its id to a list if it is a platform palette,
and run `pnpm --filter @curator/web test` (it checks every theme has a valid value for every token and that accent text is readable).

## UI styles

A style is **a block of variables** in `ui-styles.css`, read by generic rules in the second `@layer components` block of `index.css`.
The first block of `ui-styles.css` holds defaults that reproduce the original look, so a style only sets what differs.

Variable families (see the header comment in `ui-styles.css` for the full list):

`btn-* ghost-*` buttons · `in-*` fields · `card-*` · `win-* tb-* close-* body-bg` dialogs · `menu-* pop-shadow` menus and drop-downs ·
`side-* top-* player-* nav-* row-*` chrome and lists · `panel-*` Settings sections · `chk-*` checkboxes and radios · `rng-*` sliders ·
`dur ease` motion · `radius ctl-r card-r win-r menu-r nav-r chip-r in-r` shape · `font title-font` type.

Motion has its own variables, all per style:

| Variable | Used for |
|---|---|
| `--dialog-anim`, `--menu-anim` | a dialog / menu opening |
| `--player-in`, `--player-out`, `--player-ms` | the player bar appearing when something is selected, and leaving when nothing is |
| `--pop-out`, `--pop-ms` | the exit of pop-ups (mini queue, cover card, drop-downs) |
| `--page-in` | the content area when you change page |
| `--vote-ms` | how long the chosen Rank card plays its "picked" animation (0 = no pause) |

The sliding navigation indicator is one `.bt-ind` element per bar, positioned by `useIndicator` in `Layout.tsx`
(`--ind-x --ind-y --ind-w --ind-h --ind-o`). It is hidden unless a style turns it on (Liquid Glass: the lit pill, Windows 11: the 3×16 accent bar).

### Gotchas that have cost time

- Tailwind 3 `@layer` is not a native cascade layer; it only orders output. **Utility classes on an element beat the variable-driven component rules**, and
  `ui-styles.css` (unlayered) beats utilities. Markup that a style must control carries only a hook class (`bt-titlebar`, `bt-menu`, `bt-nav`…) and no competing utilities.
- Do not use Tailwind `ring-*` for a selected state: rings are `box-shadow`, which styles use for bevels and glass. Use `.bt-sel[data-selected]` (an outline).
- A rule that sets `padding` on `.card` breaks every padded card and panel. Scope such rules to cards without padding classes (see Windows 98).
- Native `<select>` lists cannot be themed. Use `components/Select.tsx`; it renders a `bt-menu`.
- Pop-ups must be portalled to `document.body` and use `bt-menu` (or `bt-window`) so the style's shape, motion and glass apply.
- `--card` and `--secondary` are shadcn names, not tokens of this app. Use `--surface` and `--raised`.

## Checklist for a new style

1. Add the id to `UiStyleId` and an entry to `UI_STYLES` in `uiStyle.ts` (label, one-sentence description, font, `matching` palettes).
2. Add a `[data-ui="id"]` block to `ui-styles.css`. Start from the closest existing style and set every family in the list above.
3. Set the motion variables (`--player-in/out/ms`, `--pop-out/ms`, `--page-in`, `--vote-ms`) in the "per style" blocks near the end of the file.
4. Add the matching palette(s) to `theme.ts`.
5. Look at it: Tracks, an Album page, Settings, a dialog (Add > New album), the Rank page, and a 390 px phone. See [DESIGN_LANGUAGE.md](DESIGN_LANGUAGE.md).
6. Regenerate [THEMES.md](THEMES.md) (the snippet at its end).
