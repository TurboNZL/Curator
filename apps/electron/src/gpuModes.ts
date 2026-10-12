/**
 * Ways to start Chromium's graphics on Linux. Which one works depends on the driver and the session (Wayland or X11, NVIDIA's proprietary
 * driver, the GPU sandbox), and Chromium falls back to software rendering without saying so, so the app can try them one after the other
 * on its own ("Automatic") and remember the first that gives real hardware acceleration.
 */
export interface GpuMode {
  id: string;
  label: string;
  hint: string;
  /** command-line switches: [name] or [name, value] */
  switches: [string, string?][];
  /** extra Chromium features (joined with the app's own in `enable-features`) */
  features?: string[];
  /** turn the GPU off entirely */
  software?: boolean;
}

const BASE: [string, string?][] = [['ignore-gpu-blocklist'], ['enable-gpu-rasterization']];

export const GPU_MODES: GpuMode[] = [
  { id: 'default', label: 'Standard', hint: 'Ask Chromium for the GPU even where its block list says no.', switches: BASE },
  { id: 'x11', label: 'X11 (XWayland)', hint: 'Use X11 instead of Wayland: fixes GPU start-up failures on many Wayland sessions.', switches: [...BASE, ['ozone-platform', 'x11']] },
  { id: 'nosandbox', label: 'No GPU sandbox', hint: 'For NVIDIA\'s proprietary driver ("Can\'t initialize nvrm channel").', switches: [...BASE, ['disable-gpu-sandbox']] },
  { id: 'x11-nosandbox', label: 'X11 and no GPU sandbox', hint: 'Both of the above.', switches: [...BASE, ['ozone-platform', 'x11'], ['disable-gpu-sandbox']] },
  { id: 'angle-gl', label: 'OpenGL (ANGLE)', hint: 'Force ANGLE\'s OpenGL back end.', switches: [...BASE, ['use-angle', 'gl'], ['ozone-platform', 'x11']] },
  { id: 'software', label: 'Software (no GPU)', hint: 'Turn the GPU off. Slower, but never crashes.', switches: [], software: true },
];

/** The order Automatic tries modes in (software is never tried by itself: it is only chosen by hand). */
export const AUTO_ORDER = ['default', 'x11', 'nosandbox', 'x11-nosandbox', 'angle-gl'];

export interface GpuChoice { mode: string; auto: { step: number; done: boolean } }

/** The mode to start with: the chosen one, or in Automatic the current step of the search. Unknown ids fall back to the standard mode. */
export function activeMode(c: Partial<GpuChoice> | undefined): GpuMode {
  const mode = c?.mode ?? 'auto';
  const id = mode === 'auto' ? AUTO_ORDER[Math.min(Math.max(c?.auto?.step ?? 0, 0), AUTO_ORDER.length - 1)] : mode;
  return GPU_MODES.find((m) => m.id === id) ?? GPU_MODES[0];
}

/**
 * After a start that did not get hardware acceleration: the next step to try, or null when the search is over (done already, or every
 * mode was tried). Tested by `gpuModes.test.ts`.
 */
export function nextAutoStep(c: Partial<GpuChoice> | undefined, gotHardware: boolean): { step: number; done: boolean; relaunch: boolean } {
  const step = Math.min(Math.max(c?.auto?.step ?? 0, 0), AUTO_ORDER.length - 1);
  if (gotHardware) return { step, done: true, relaunch: false };
  if (step + 1 < AUTO_ORDER.length) return { step: step + 1, done: false, relaunch: true };
  return { step: 0, done: true, relaunch: false }; // nothing worked: stop trying and go back to the standard mode
}
