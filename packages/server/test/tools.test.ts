import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkTools } from '../src/tools.ts';

describe('checkTools', () => {
  it('reports versions of runnable tools and null for missing ones', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'tools-'));
    const fake = join(dir, 'yt-dlp');
    writeFileSync(fake, '#!/bin/sh\necho 2026.01.01\n');
    chmodSync(fake, 0o755);
    const r = await checkTools({ ytdlp: fake, ffmpegDir: join(dir, 'nope') });
    expect(r.ytdlp).toBe('2026.01.01');
    expect(r.ffmpeg).toBeNull();
  });
  it('treats a failing program as unavailable', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'tools-'));
    const fake = join(dir, 'yt-dlp');
    writeFileSync(fake, '#!/bin/sh\nexit 3\n');
    chmodSync(fake, 0o755);
    expect((await checkTools({ ytdlp: fake })).ytdlp).toBeNull();
  });
});
