/**
 * Material "ink" ripple for the LG UX 5.0 style: a circle grows from the touch point over buttons, tabs and menu entries. Other styles
 * do nothing. Done in script because the point of touch cannot be known to CSS.
 */
const TARGET = '.btn, .bt-nav, .bt-tab, .bt-toplink';

export function startRipple() {
  document.addEventListener('pointerdown', (e) => {
    if (!(e.target instanceof Element)) return;
    const host = e.target.closest<HTMLElement>(TARGET);
    if (!host || host.closest('[data-ui]')?.getAttribute('data-ui') !== 'lgux' || (host as HTMLButtonElement).disabled) return;
    const r = host.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const dot = document.createElement('span');
    dot.className = 'bt-ripple';
    dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    host.appendChild(dot);
    dot.addEventListener('animationend', () => dot.remove(), { once: true });
  }, { capture: true, passive: true });
}
