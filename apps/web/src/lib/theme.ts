export const THEMES = [
  { id: 'default', name: 'Default', note: 'Dark, medium density' },
  { id: 'classic', name: 'Classic', note: 'The original look, tighter' },
  { id: 'light', name: 'Light', note: 'Light, medium density' },
] as const;

export const ACCENTS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

function hexToHsl(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = Math.round((h * 60 + 360) % 360);
  return `${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function applyTheme(theme: string, accent: string | null) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  if (accent) root.style.setProperty('--accent', hexToHsl(accent));
  else root.style.removeProperty('--accent');
}
