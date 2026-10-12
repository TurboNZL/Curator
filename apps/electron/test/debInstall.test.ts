import { describe, expect, it } from 'vitest';
import { debInstallScript, describePkexec, hasNoNewPrivs, manualInstallCommand, shQuote } from '../src/debInstall.ts';

describe('installing a .deb update', () => {
  it('quotes the path for the shell, even with quotes and spaces in it', () => {
    expect(shQuote(`/home/a b/it's.deb`)).toBe(`'/home/a b/it'\\''s.deb'`);
    expect(debInstallScript('/tmp/x y.deb')).toBe(`dpkg -i '/tmp/x y.deb' || apt-get install -f -y`);
    expect(manualInstallCommand('/tmp/x.deb')).toBe(`sudo apt install '/tmp/x.deb'`);
  });
  it('tells the pkexec outcomes apart', () => {
    expect(describePkexec(0)).toEqual({ ok: true });
    expect(describePkexec(126)).toMatchObject({ ok: false, cancelled: true });
    const r = describePkexec(127, 'Error executing command as another user: Not authorized');
    expect(r).toMatchObject({ ok: false, cancelled: false });
    expect((r as { message: string }).message).toMatch(/polkit/);
    expect((describePkexec(100, 'E: Unable to locate\ndpkg: error') as { message: string }).message).toMatch(/exit code 100.*dpkg: error/);
  });
});

import { installedMatches, TERMINALS, terminalInstallScript } from '../src/debInstall.ts';
describe('terminal fallback', () => {
  it('runs the same install with sudo and keeps the window open', () => {
    const s = terminalInstallScript('/tmp/a b.deb');
    expect(s).toContain(`sudo sh -c`);
    expect(s).toContain(`dpkg -i`);
    expect(s).toContain('read _');
  });
  it('every terminal passes the script to sh -c', () => {
    for (const t of TERMINALS) expect(t.args('X')).toContain('X');
  });
  it('compares versions', () => { expect(installedMatches('2026.10.24\n', '2026.10.24')).toBe(true); expect(installedMatches('2026.10.23', '2026.10.24')).toBe(false); });
});

describe('hasNoNewPrivs', () => {
  it('reads the flag from /proc status', () => {
    expect(hasNoNewPrivs('Name:\tx\nNoNewPrivs:\t1\nSeccomp:\t0\n')).toBe(true);
    expect(hasNoNewPrivs('Name:\tx\nNoNewPrivs:\t0\n')).toBe(false);
    expect(hasNoNewPrivs('')).toBe(false);
  });
});
