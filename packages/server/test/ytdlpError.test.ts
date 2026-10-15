import { describe, expect, it } from 'vitest';
import { ytdlpFailure } from '../src/ytdlpError.ts';

describe('ytdlpFailure', () => {
  it('keeps the last line of an ordinary error', () => {
    expect(ytdlpFailure('WARNING: x\nERROR: [youtube] abc: Video unavailable\n')).toBe('ERROR: [youtube] abc: Video unavailable');
  });
  it('adds the traceback before a PyInstaller crash line', () => {
    const text = ['Traceback (most recent call last):', '  File "yt_dlp/cookies.py", line 1, in load', 'http.cookiejar.LoadError: bad line', '[PYI-1:ERROR] Failed to execute script \'__main__\' due to unhandled exception!'].join('\n');
    const out = ytdlpFailure(text);
    expect(out).toContain('LoadError: bad line');
    expect(out).toContain('PYI-1');
  });
});
