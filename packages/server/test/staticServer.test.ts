import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { startStaticServer } from '../src/staticServer.ts';

describe('the app edition serves only the web client', () => {
  it('answers the app and its routes, and has no API', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'web-'));
    writeFileSync(join(dir, 'index.html'), '<html>app</html>');
    const s = await startStaticServer(dir, 0);
    try {
      expect(await (await fetch(`http://127.0.0.1:${s.port}/albums`)).text()).toContain('app');
      expect((await fetch(`http://127.0.0.1:${s.port}/api/health`)).status).toBe(404);
    } finally { await s.close(); }
  });
});
