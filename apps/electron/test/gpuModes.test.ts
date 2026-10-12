import { describe, expect, it } from 'vitest';
import { activeMode, autoOrder, GPU_MODES, nextAutoStep } from '../src/gpuModes.ts';

describe('GPU start-up modes', () => {
  it('starts Automatic with the standard mode and walks through the others', () => {
    expect(activeMode(undefined, 'x11').id).toBe('default');
    expect(activeMode({ mode: 'auto', auto: { step: 1, done: false } }).id).toBe('egl');
    expect(activeMode({ mode: 'auto', auto: { step: 4, done: false } }, 'wayland').id).toBe('x11');
    expect(activeMode(undefined, 'wayland').id).toBe('egl');
    expect(activeMode({ mode: 'software', auto: { step: 0, done: false } }).software).toBe(true);
    expect(activeMode({ mode: 'nonsense' }).id).toBe('default');
  });
  it('moves on only while the GPU is not used, and gives up after the last mode', () => {
    expect(nextAutoStep({ mode: 'auto', auto: { step: 0, done: false } }, false)).toEqual({ step: 1, done: false, relaunch: true });
    expect(nextAutoStep({ mode: 'auto', auto: { step: 2, done: false } }, true)).toEqual({ step: 2, done: true, relaunch: false });
    expect(nextAutoStep({ mode: 'auto', auto: { step: autoOrder().length - 1, done: false } }, false)).toEqual({ step: 0, done: true, relaunch: false });
  });
  it('every automatic step is a real mode, and Wayland keeps Wayland until the last resort', () => {
    for (const s of ['wayland', 'x11', undefined]) for (const id of autoOrder(s)) expect(GPU_MODES.some((m) => m.id === id)).toBe(true);
    expect(autoOrder('wayland').slice(0, 4)).not.toContain('x11');
    expect(autoOrder('wayland').every((id) => id !== 'vulkan')).toBe(true); // Vulkan cannot work on Wayland
    expect(autoOrder('x11')).not.toContain('x11');
  });
});
