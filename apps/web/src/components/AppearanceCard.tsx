import { useState } from 'react';
import { Check, Eye, ImageIcon, ImageOff, Search, Upload, Wand2 } from 'lucide-react';
import { useStore } from '../lib/store.ts';
import { cn } from '../lib/cn.ts';
import { ACCENTS, OWN_THEME_IDS, PLATFORM_THEME_IDS, THEMES, resolveTheme, themeStyle, type ThemeId } from '../lib/theme.ts';
import { UI_STYLES, isUiStyle, type UiStyleId } from '../lib/uiStyle.ts';
import { clearCustomWallpaper, getCustomImage, saveCustomWallpaper, themeWallpaper } from '../lib/wallpaper.ts';

const BARS = ['#6d28d9', '#0e7490', '#b45309'];

/**
 * A small mock of the app drawn with the real classes, coloured by the given colour theme and shaped by the
 * given UI style (not the page's), so every combination can be seen before choosing it.
 */
export function PreviewApp({ theme, ui }: { theme: ThemeId; ui: UiStyleId }) {
  const def = resolveTheme(theme);
  return (
    <div data-theme={def.id} data-ui={ui} data-mode={def.dark ? 'dark' : 'light'} style={themeStyle(theme)}
      className="pointer-events-none select-none overflow-hidden rounded-theme border border-line bg-bg text-fg" role="img" aria-label="Preview of the selected colour theme and UI style">
      <div className="bt-top flex items-center gap-2 p-2.5">
        <span className="text-sm font-bold">Curator</span>
        <div className="relative flex-1"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" /><div className="input !py-1 pl-8 text-xs text-muted">Search tracks, albums…</div></div>
        <span className="btn btn-accent !px-2.5 !py-1 text-xs">Add</span>
      </div>
      <div className="flex">
        <div className="bt-side hidden w-24 shrink-0 flex-col gap-0.5 p-1.5 text-[11px] sm:flex">
          {['Albums', 'Tracks', 'Rank'].map((n, i) => <span key={n} className="bt-nav px-2 py-1 font-medium" aria-current={i === 1 ? 'page' : undefined}>{n}</span>)}
        </div>
        <div className="min-w-0 flex-1 space-y-2.5 p-3">
          <div className="grid grid-cols-3 gap-2">
            {BARS.map((c, i) => (
              <div key={c} className="min-w-0">
                <div className="aspect-square" style={{ background: `linear-gradient(135deg, ${c}, ${BARS[(i + 1) % 3]}88)`, borderRadius: 'var(--radius)' }} />
                <div className="mt-1 truncate text-[11px] font-medium">{['Night Drive', 'Blue Hour', 'Slow Burn'][i]}</div>
              </div>
            ))}
          </div>
          <div className="card overflow-hidden">
            {[['Midnight City', 'M83', '9.4'], ['Nightcall', 'Kavinsky', '8.7'], ['Resonance', 'HOME', '8.1']].map(([t, a, r], i) => (
              <div key={t} className={cn('bt-row flex items-center gap-2 px-2.5 py-1.5', i === 0 && 'bt-row-current')}>
                <div className="min-w-0 flex-1"><div className="truncate text-xs font-medium">{t}</div><div className="truncate text-[10px] text-muted">{a}</div></div>
                <span className="chip">Synth</span><span className="text-xs font-bold tabular-nums text-top">{r}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5"><div className="input flex-1 !py-1 text-xs">Title</div><span className="btn !px-2.5 !py-1 text-xs">Cancel</span><span className="btn btn-accent !px-2.5 !py-1 text-xs">Save</span><span className="btn btn-ghost !px-2.5 !py-1 text-xs">More</span></div>
          <input type="range" className="bt-range h-1 w-full" style={{ '--p': '62%' } as React.CSSProperties} readOnly value={62} min={0} max={100} tabIndex={-1} aria-hidden />
          <div className="bt-window pointer-events-none">
            <div className="bt-titlebar flex items-center justify-between px-3 py-1.5"><h2 className="text-xs font-semibold">Edit track</h2><span className="bt-close text-xs leading-none">×</span></div>
            <div className="bt-body flex items-center justify-between gap-2 p-2.5 text-[11px] text-muted"><span>Dialogs and menus follow the style too.</span><span className="bt-menu w-20 py-0.5 text-[11px]"><span className="block px-2 py-0.5">Play</span><span role="menuitem" className="block px-2 py-0.5" style={{ background: 'var(--menu-hi-bg)', color: 'var(--menu-hi-fg)' }}>Edit…</span></span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppearanceCard() {
  const { settings, updateSettings } = useStore();
  const theme = settings.theme;
  const ui: UiStyleId = isUiStyle(settings.ui) ? settings.ui : 'default';
  const def = resolveTheme(theme);
  // hovering or focusing an option previews it, combined with the other current choice
  const [hoverTheme, setHoverTheme] = useState<ThemeId | null>(null);
  const [hoverUi, setHoverUi] = useState<UiStyleId | null>(null);
  const shownTheme = hoverTheme ?? theme;
  const shownUi = hoverUi ?? ui;
  const label = (id: ThemeId) => THEMES.find((t) => t.id === id)?.label;

  // the platform's own palette for a UI style, in the light or dark variant matching the current theme
  const m = UI_STYLES.find((s) => s.id === ui)?.matching;
  const matching = m ? (def.dark ? m.dark ?? m.light : m.light) : null;

  const themeButton = (t: (typeof THEMES)[number]) => {
    const selected = theme === t.id;
    const d = resolveTheme(t.id);
    return (
      <button key={t.id} type="button" role="radio" aria-checked={selected} title={t.note}
        onClick={() => updateSettings({ theme: t.id })}
        onMouseEnter={() => setHoverTheme(t.id)} onFocus={() => setHoverTheme(t.id)} onBlur={() => setHoverTheme(null)}
        className={cn('rounded-theme border p-2 text-left transition-colors hover:border-accent', selected ? 'border-accent ring-1 ring-accent' : 'border-line')}>
        <span data-theme={d.id} style={themeStyle(t.id)} className="relative block h-10 overflow-hidden rounded-md border border-line/60 bg-bg" aria-hidden>
          <span className="absolute left-1.5 top-1.5 h-2 w-8 rounded-sm bg-accent" />
          <span className="absolute bottom-1.5 left-1.5 right-1.5 h-3 rounded-sm border border-line bg-surface" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-top" />
        </span>
        <span className="mt-1.5 flex items-center justify-between gap-1 text-xs font-medium"><span className="truncate">{t.label}</span>{selected && <Check size={13} className="shrink-0 text-accent" />}</span>
      </button>
    );
  };
  const grid = 'grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2';
  const own = THEMES.filter((t) => t.id === 'system' || OWN_THEME_IDS.includes(t.id));
  const colours = THEMES.filter((t) => t.id !== 'system' && !OWN_THEME_IDS.includes(t.id) && !PLATFORM_THEME_IDS.includes(t.id));
  const platform = THEMES.filter((t) => PLATFORM_THEME_IDS.includes(t.id));

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      {/* the preview sits in its own framed column so it cannot be mistaken for the real page */}
      <div className="lg:sticky lg:top-20 lg:order-2">
        <div className="rounded-theme border-2 border-dashed border-accent bg-accent/10 p-2.5">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 font-bold uppercase tracking-wider text-accent-fg"><Eye size={13} />Preview</span>
            <span className="truncate font-medium">{label(shownTheme)} + {UI_STYLES.find((s) => s.id === shownUi)?.label}</span>
          </div>
          <PreviewApp theme={shownTheme} ui={shownUi} />
          <p className="mt-2 text-center text-[11px] text-muted">Not your real page. Hover or focus an option to try it, click to apply.</p>
        </div>
      </div>

      <div className="min-w-0 space-y-5 lg:order-1">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Colour theme</h3>
          <div role="radiogroup" aria-label="Colour theme" className={grid} onMouseLeave={() => setHoverTheme(null)}>{own.map(themeButton)}</div>
          <div role="radiogroup" aria-label="More colour themes" className={grid} onMouseLeave={() => setHoverTheme(null)}>{colours.map(themeButton)}</div>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Platform colours</h3>
          <p className="text-xs text-muted">Palettes copied from a desktop or OS, made to pair with the matching UI style.</p>
          <div role="radiogroup" aria-label="Platform colour theme" className={grid} onMouseLeave={() => setHoverTheme(null)}>{platform.map(themeButton)}</div>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium">UI style</h3>
            {matching && matching !== theme && (
              <button type="button" className="btn text-xs" onClick={() => updateSettings({ theme: matching })} onMouseEnter={() => setHoverTheme(matching)} onMouseLeave={() => setHoverTheme(null)}>
                <Wand2 size={14} />Use matching colours ({label(matching)})</button>)}
          </div>
          <div role="radiogroup" aria-label="UI style" className="grid grid-cols-1 gap-2 sm:grid-cols-2" onMouseLeave={() => setHoverUi(null)}>
            {UI_STYLES.map((s) => {
              const selected = ui === s.id;
              return (
                <button key={s.id} type="button" role="radio" aria-checked={selected} onClick={() => updateSettings({ ui: s.id })}
                  onMouseEnter={() => setHoverUi(s.id)} onFocus={() => setHoverUi(s.id)} onBlur={() => setHoverUi(null)}
                  className={cn('rounded-theme border bg-raised p-3 text-left transition-colors hover:bg-hover', selected ? 'border-accent ring-1 ring-accent' : 'border-line')}>
                  <span className="flex items-center justify-between gap-2"><span className="font-medium">{s.label}</span>{selected && <Check size={15} className="text-accent" />}</span>
                  <span className="mt-1 block text-xs text-muted">{s.description}</span>
                  <span className="mt-1.5 block text-xs opacity-80">Aa Bb 0123 · {s.font}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2"><span className="mr-2 text-sm text-muted">Accent</span>
          <button className={cn('h-6 w-6 rounded-full border border-line bg-raised text-[10px]', !settings.accent && 'ring-2 ring-fg')} title="Theme default" onClick={() => updateSettings({ accent: null })}>·</button>
          {ACCENTS.map((c) => <button key={c} aria-label={c} onClick={() => updateSettings({ accent: c })} className={cn('h-6 w-6 rounded-full', settings.accent === c && 'ring-2 ring-fg ring-offset-2 ring-offset-bg')} style={{ background: c }} />)}
          <label className="ml-1 flex items-center gap-1.5 text-xs text-muted">Custom<input type="color" aria-label="Custom accent colour" className="h-6 w-8 cursor-pointer rounded border border-line bg-transparent p-0" value={settings.accent ?? '#8b5cf6'} onChange={(e) => updateSettings({ accent: e.target.value })} /></label></div>
      </div>
    </div>
  );
}

export function WallpaperCard() {
  const { settings, updateSettings } = useStore();
  const [hasCustom, setHasCustom] = useState(() => getCustomImage() !== null);
  const [error, setError] = useState<string | null>(null);
  const custom = settings.wallpaperCustom && hasCustom ? getCustomImage() : null;

  async function upload(f: File | undefined, input: HTMLInputElement) {
    if (!f) return;
    try { await saveCustomWallpaper(f); setHasCustom(true); setError(null); updateSettings({ wallpaperCustom: true, wallpaper: true }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load that image'); }
    finally { input.value = ''; }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Off by default. Each colour theme has its own wallpaper, or load your own picture. Panels turn slightly see-through so it shows around them. Saved on this device only.</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.wallpaper} onChange={(e) => updateSettings({ wallpaper: e.target.checked })} />Show wallpaper</label>
      <div className={cn('space-y-4', !settings.wallpaper && 'pointer-events-none opacity-50')} aria-disabled={!settings.wallpaper}>
        <div className="relative h-32 overflow-hidden rounded-theme border border-line" style={{ background: custom ? `center / cover no-repeat url("${custom}")` : themeWallpaper(settings.theme) }}>
          <div className="absolute inset-0 bg-black" style={{ opacity: settings.wallpaperDarkness }} />
          <span className="absolute bottom-2 left-2 rounded bg-black/40 px-1.5 py-0.5 text-xs text-white/90">{custom ? 'Your picture' : 'Theme wallpaper'}</span>
        </div>
        <label className="block text-sm"><span className="mb-1 flex justify-between"><span className="font-medium">Darkness</span><span className="tabular-nums text-muted">{Math.round(settings.wallpaperDarkness * 100)}%</span></span>
          <input type="range" min={0} max={90} step={1} className="bt-range h-1 w-full" style={{ '--p': `${(settings.wallpaperDarkness / 0.9) * 100}%` } as React.CSSProperties} value={Math.round(settings.wallpaperDarkness * 100)} onChange={(e) => updateSettings({ wallpaperDarkness: Number(e.target.value) / 100 })} aria-label="Wallpaper darkness" />
          <span className="text-xs text-muted">Raises the opacity of a black layer over the wallpaper.</span></label>
        <div className="flex flex-wrap gap-2">
          <label className="btn cursor-pointer"><Upload size={15} />{hasCustom ? 'Choose another picture' : 'Load a picture'}<input type="file" accept="image/*" hidden onChange={(e) => void upload(e.target.files?.[0], e.target)} /></label>
          {hasCustom && <>
            <button className="btn" disabled={settings.wallpaperCustom} onClick={() => updateSettings({ wallpaperCustom: true })}><ImageIcon size={15} />Use my picture</button>
            <button className="btn" disabled={!settings.wallpaperCustom} onClick={() => updateSettings({ wallpaperCustom: false })}><ImageIcon size={15} />Use the theme wallpaper</button>
            <button className="btn" onClick={() => { clearCustomWallpaper(); setHasCustom(false); updateSettings({ wallpaperCustom: false }); }}><ImageOff size={15} />Remove my picture</button></>}
        </div>
        {error && <div className="text-sm text-bad">{error}</div>}
      </div>
    </div>
  );
}
