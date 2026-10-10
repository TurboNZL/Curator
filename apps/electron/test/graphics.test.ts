import { describe, expect, it } from 'vitest';
import { describeGraphics, type GpuFacts } from '../src/graphics.ts';

const facts = (over: Partial<GpuFacts> = {}): GpuFacts => ({
  features: { gpu_compositing: 'enabled', rasterization: 'enabled_force' },
  renderer: '', glParts: '(gl=egl-angle,angle=opengl)', vendorIds: [0x1002], ...over,
});

describe('describeGraphics', () => {
  it('reports a GPU that paints everything', () => {
    const g = describeGraphics(facts());
    expect(g.hardware).toBe(true);
    expect(g.summary).toBe('Hardware accelerated');
    expect(g.detail).toBe('(gl=egl-angle,angle=opengl)');
  });
  it('says when only rasterization is off (the block-list case)', () => {
    const g = describeGraphics(facts({ features: { gpu_compositing: 'enabled', rasterization: 'disabled_software' } }));
    expect(g.hardware).toBe(true);
    expect(g.summary).toContain('rasterization is disabled software');
  });
  it('sees through "enabled" when there is no GPU at all (what a VM or container reports)', () => {
    // measured: Electron 44 under Xvfb
    const g = describeGraphics(facts({ glParts: '(gl=none,angle=none)', vendorIds: [0] }));
    expect(g.hardware).toBe(false);
    expect(g.summary).toBe('Software rendering: Chromium found no usable GPU or GL driver');
  });
  it('recognises software GL', () => {
    for (const over of [{ renderer: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))' }, { renderer: 'llvmpipe (LLVM 17)' }, { glParts: '(gl=egl-angle,angle=swiftshader)' }]) {
      const g = describeGraphics(facts(over));
      expect(g.hardware).toBe(false);
      expect(g.summary).toMatch(/^Software rendering/);
    }
  });
  it('says why when compositing is off and counts GPU crashes', () => {
    const g = describeGraphics(facts({ features: { gpu_compositing: 'disabled_software' } }), 3);
    expect(g.hardware).toBe(false);
    expect(g.summary).toBe('Software rendering: GPU compositing is disabled software; the GPU process has crashed 3 times');
  });
  it('treats missing information as software', () => expect(describeGraphics({ features: {}, renderer: '', glParts: '', vendorIds: [] }).hardware).toBe(false));
});
