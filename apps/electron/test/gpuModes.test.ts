import { describe, expect, it } from 'vitest';
import { activeMode, AUTO_ORDER, GPU_MODES, nextAutoStep } from '../src/gpuModes.ts';

describe('GPU start-up modes', () => {
  it('starts Automatic with the standard mode and walks through the others', () => {
    expect(activeMode(undefined).id).toBe('default');
    expect(activeMode({ mode: 'auto', auto: { step: 1, done: false } }).id).toBe('x11');
    expect(activeMode({ mode: 'software', auto: { step: 0, done: false } }).software).toBe(true);
    expect(activeMode({ mode: 'nonsense' }).id).toBe('default');
  });
  it('moves on only while the GPU is not used, and gives up after the last mode', () => {
    expect(nextAutoStep({ mode: 'auto', auto: { step: 0, done: false } }, false)).toEqual({ step: 1, done: false, relaunch: true });
    expect(nextAutoStep({ mode: 'auto', auto: { step: 2, done: false } }, true)).toEqual({ step: 2, done: true, relaunch: false });
    expect(nextAutoStep({ mode: 'auto', auto: { step: AUTO_ORDER.length - 1, done: false } }, false)).toEqual({ step: 0, done: true, relaunch: false });
  });
  it('every automatic step is a real mode', () => { for (const id of AUTO_ORDER) expect(GPU_MODES.some((m) => m.id === id)).toBe(true); });
});
