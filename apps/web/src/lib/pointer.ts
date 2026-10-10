/**
 * Where the pointer last went down. Menus and dialogs open "from" that point (Apple's glass morphs out of the
 * control that opened it), so they need it after the click that created them has finished.
 */
export const lastPress = { x: 0, y: 0, at: 0 };

if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', (e) => { lastPress.x = e.clientX; lastPress.y = e.clientY; lastPress.at = Date.now(); }, { capture: true, passive: true });
  // a keyboard shortcut or Enter on a button has no pointer position: use the focused control instead
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const r = (document.activeElement as HTMLElement | null)?.getBoundingClientRect?.();
    if (r) { lastPress.x = r.left + r.width / 2; lastPress.y = r.top + r.height / 2; lastPress.at = Date.now(); }
  }, { capture: true, passive: true });
}

/** transform-origin (in the element's own box) that points back at the last press, or the centre when it was long ago. */
export function originFor(box: DOMRect, maxAgeMs = 4000): string {
  if (!lastPress.at || Date.now() - lastPress.at > maxAgeMs) return '50% 50%';
  const x = Math.max(0, Math.min(box.width, lastPress.x - box.left));
  const y = Math.max(0, Math.min(box.height, lastPress.y - box.top));
  return `${x}px ${y}px`;
}
