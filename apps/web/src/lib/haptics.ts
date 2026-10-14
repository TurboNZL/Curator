import { useStore } from './store.ts';

/**
 * Vibration feedback. In the Android app the phone's own haptic engine is used (`TurboMusicAndroid.haptic`: respects the system
 * "touch feedback" setting and needs no permission); elsewhere `navigator.vibrate` where the browser has it (phones, not
 * desktops or iOS). Presses on buttons, links, tabs, rows and switches tick lightly by themselves (`startHaptics`); the
 * important moments (a vote, a long press) ask for a stronger one.
 */
export type HapticKind = 'tap' | 'tick' | 'confirm' | 'reject' | 'heavy';
interface HapticBridge { haptic?(kind: string): void }
const bridge = () => (window as unknown as { TurboMusicAndroid?: HapticBridge }).TurboMusicAndroid;
const PATTERNS: Record<HapticKind, number | number[]> = { tap: 8, tick: 4, confirm: [12, 30, 18], reject: [24, 40, 24], heavy: 28 };

let last = 0;
export function haptic(kind: HapticKind = 'tap') {
  if (!useStore.getState().settings.haptics) return;
  const now = performance.now();
  if (now - last < 25) return; // one press can fire several listeners
  last = now;
  try {
    const b = bridge();
    if (b?.haptic) b.haptic(kind);
    else if (typeof navigator.vibrate === 'function') navigator.vibrate(PATTERNS[kind]);
  } catch { /* no vibrator, or blocked */ }
}

const PRESSABLE = 'button, a[href], summary, [role="button"], [role="menuitem"], [role="tab"], [role="option"], [role="switch"], input[type="checkbox"], input[type="radio"], label, .bt-nav, .bt-row, .bt-tile, [data-haptic]';

/**
 * Light feedback for touch presses anywhere in the page. Call once at start-up.
 * The tick is held back for a moment and dropped if the finger starts moving, the browser takes the gesture over to
 * scroll (`pointercancel`) or a scroll event arrives: touching a scrolling list to scroll it is not a press.
 */
export function startHaptics() {
  let timer = 0, sx = 0, sy = 0;
  const cancel = () => { if (timer) { clearTimeout(timer); timer = 0; } };
  document.addEventListener('pointerdown', (e) => {
    cancel();
    if (e.pointerType === 'mouse' || !(e.target instanceof Element)) return;
    const hit = e.target.closest(PRESSABLE);
    if (!hit || (hit as HTMLButtonElement).disabled) return;
    const kind: HapticKind = hit.closest('[data-haptic="none"]') ? 'tick' : 'tap';
    sx = e.clientX; sy = e.clientY;
    timer = window.setTimeout(() => { timer = 0; haptic(kind); }, 70);
  }, { capture: true, passive: true });
  document.addEventListener('pointermove', (e) => { if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 6) cancel(); }, { capture: true, passive: true });
  for (const t of ['pointercancel', 'pointerup', 'touchmove']) document.addEventListener(t, (e) => {
    // a quick tap is over before the delay: still tick, as long as it did not move
    if (t === 'pointerup' && timer) { cancel(); const pe = e as PointerEvent; if (Math.hypot(pe.clientX - sx, pe.clientY - sy) <= 6) haptic('tap'); return; }
    cancel();
  }, { capture: true, passive: true });
  document.addEventListener('scroll', cancel, { capture: true, passive: true });
  // sliders tick as the value steps
  document.addEventListener('input', (e) => { if (e.target instanceof HTMLInputElement && e.target.type === 'range') haptic('tick'); }, { capture: true, passive: true });
  // a long press that opens a menu
  document.addEventListener('contextmenu', (e) => { if ((e as PointerEvent).pointerType !== 'mouse') haptic('heavy'); }, { capture: true, passive: true });
}
