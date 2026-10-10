import { useState } from 'react';
import { Check, Eye, ImageIcon, ImageOff, Search, Upload, Wand2 } from 'lucide-react';
import { useStore } from '../lib/store.ts';
import { cn } from '../lib/cn.ts';
import { OWN_THEME_IDS, PLATFORM_THEME_IDS, THEMES, resolveTheme, themeStyle, type ThemeId } from '../lib/theme.ts';
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

type Tab = 'colours' | 'platform' | 'style';
type Tone = 'all' | 'dark' | 'light';

/**
 * Colour theme + UI style. The choices sit in one bounded, scrolling panel with tabs (they used to be one long
 * list that pushed the rest of Settings far down), next to a preview that stays in view.
 */
export function AppearanceCard() {
  const { settings, updateSettings } = useStore();
  const theme = settings.theme;
  const ui: UiStyleId = isUiStyle(settings.ui) ? settings.ui : 'default';
  const def = resolveTheme(theme);
  const [tab, setTab] = useState<Tab>('colours');
  const [tone, setTone] = useState<Tone>('all');
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
      <button key={t.id} type="button" role="radio" aria-checked={selected} title={t.note ? `${t.label}: ${t.note}` : t.label}
        onClick={() => updateSettings({ theme: t.id })}
        onMouseEnter={() => setHoverTheme(t.id)} onFocus={() => setHoverTheme(t.id)} onBlur={() => setHoverTheme(null)}
        className={cn('rounded-theme border p-1.5 text-left transition-colors hover:border-accent', selected ? 'border-accent ring-1 ring-accent' : 'border-line')}>
        <span data-theme={d.id} style={themeStyle(t.id)} className="relative flex h-7 overflow-hidden rounded-md border border-line/60 bg-bg" aria-hidden>
          <span className="h-full flex-1 bg-bg" /><span className="h-full flex-1 bg-surface" /><span className="h-full flex-1 bg-accent" /><span className="h-full flex-1 bg-top" />
        </span>
        <span className="mt-1 flex items-center justify-between gap-1 text-[11px] font-medium leading-tight"><span className="truncate">{t.label}</span>{selected && <Check size={12} className="shrink-0 text-accent" />}</span>
      </button>
    );
  };
  const grid = 'grid grid-cols-[repeat(auto-fill,minmax(6.25rem,1fr))] gap-1.5';
  const tonal = (t: (typeof THEMES)[number]) => tone === 'all' || t.dark === null || (tone === 'dark') === t.dark;
  const own = THEMES.filter((t) => (t.id === 'system' || OWN_THEME_IDS.includes(t.id)) && tonal(t));
  const colours = THEMES.filter((t) => t.id !== 'system' && !OWN_THEME_IDS.includes(t.id) && !PLATFORM_THEME_IDS.includes(t.id) && tonal(t));
  const platform = THEMES.filter((t) => PLATFORM_THEME_IDS.includes(t.id) && tonal(t));

  const tabs: { id: Tab; text: string }[] = [{ id: 'colours', text: 'Colour themes' }, { id: 'platform', text: 'Platform colours' }, { id: 'style', text: 'UI style' }];

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="min-w-0 space-y-3 lg:order-1">
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Appearance options" className="flex rounded-theme bg-raised p-0.5">
            {tabs.map((x) => (
              <button key={x.id} role="tab" aria-selected={tab === x.id} onClick={() => setTab(x.id)}
                className={cn('rounded-[calc(var(--radius)-3px)] px-3 py-1 text-sm font-medium transition-colors', tab === x.id ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg')}>{x.text}</button>))}
          </div>
          {tab !== 'style' && (
            <div role="group" aria-label="Show" className="ml-auto flex gap-1 text-xs">
              {(['all', 'dark', 'light'] as Tone[]).map((t) => <button key={t} aria-pressed={tone === t} onClick={() => setTone(t)} className={cn('rounded-full border px-2.5 py-0.5 capitalize', tone === t ? 'border-accent text-accent' : 'border-line text-muted hover:text-fg')}>{t}</button>)}
            </div>)}
        </div>

        <div className="max-h-[21rem] overflow-y-auto rounded-theme border border-line p-2" role="tabpanel">
          {tab === 'colours' && (
            <div className="space-y-3">
              <div role="radiogroup" aria-label="Curator themes" className={grid} onMouseLeave={() => setHoverTheme(null)}>{own.map(themeButton)}</div>
              <div role="radiogroup" aria-label="More colour themes" className={grid} onMouseLeave={() => setHoverTheme(null)}>{colours.map(themeButton)}</div>
            </div>)}
          {tab === 'platform' && (
            <div className="space-y-2">
              <p className="text-xs text-muted">Palettes copied from a desktop or OS, made to pair with the matching UI style.</p>
              <div role="radiogroup" aria-label="Platform colour theme" className={grid} onMouseLeave={() => setHoverTheme(null)}>{platform.map(themeButton)}</div>
            </div>)}
          {tab === 'style' && (
            <div className="space-y-2">
              {matching && matching !== theme && (
                <button type="button" className="btn text-xs" onClick={() => updateSettings({ theme: matching })} onMouseEnter={() => setHoverTheme(matching)} onMouseLeave={() => setHoverTheme(null)}>
                  <Wand2 size={14} />Use matching colours ({label(matching)})</button>)}
              <div role="radiogroup" aria-label="UI style" className="grid grid-cols-1 gap-1.5 sm:grid-cols-2" onMouseLeave={() => setHoverUi(null)}>
                {UI_STYLES.map((s) => {
                  const selected = ui === s.id;
                  return (
                    <button key={s.id} type="button" role="radio" aria-checked={selected} title={s.description} onClick={() => updateSettings({ ui: s.id })}
                      onMouseEnter={() => setHoverUi(s.id)} onFocus={() => setHoverUi(s.id)} onBlur={() => setHoverUi(null)}
                      className={cn('rounded-theme border bg-raised px-3 py-2 text-left transition-colors hover:bg-hover', selected ? 'border-accent ring-1 ring-accent' : 'border-line')}>
                      <span className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{s.label}</span>{selected && <Check size={14} className="text-accent" />}</span>
                      <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-muted">{s.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>)}
        </div>

        {ui === 'liquid' && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-medium">Glass</span>
            <div role="radiogroup" aria-label="Glass variant" className="flex rounded-theme bg-raised p-0.5">
              {(['regular', 'clear'] as const).map((g) => (
                <button key={g} role="radio" aria-checked={settings.glass === g} onClick={() => updateSettings({ glass: g })}
                  className={cn('rounded-[calc(var(--radius)-3px)] px-3 py-1 text-xs font-medium capitalize', settings.glass === g ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg')}>{g}</button>))}
            </div>
            <span className="text-xs text-muted">{settings.glass === 'clear' ? 'Clear: more see-through, with a dimming layer for legibility. Best over bold artwork.' : 'Regular: adapts to what is behind it. The default.'}</span>
          </div>)}
        <p className="text-xs text-muted">Now: <span className="font-medium text-fg">{label(theme)}</span> + <span className="font-medium text-fg">{UI_STYLES.find((x) => x.id === ui)?.label}</span>. The accent colour comes from the colour theme.</p>
      </div>

      {/* the preview sits in its own framed column so it cannot be mistaken for the real page */}
      <div className="lg:sticky lg:top-20 lg:order-2">
        <div className="rounded-theme border-2 border-dashed border-accent bg-accent/10 p-2">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-2.5 py-0.5 font-bold uppercase tracking-wider text-accent-fg"><Eye size={12} />Preview</span>
            <span className="truncate font-medium">{label(shownTheme)} + {UI_STYLES.find((s) => s.id === shownUi)?.label}</span>
          </div>
          <PreviewApp theme={shownTheme} ui={shownUi} />
          <p className="mt-1.5 text-center text-[11px] text-muted">Not your real page. Hover an option to try it, click to apply.</p>
        </div>
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
